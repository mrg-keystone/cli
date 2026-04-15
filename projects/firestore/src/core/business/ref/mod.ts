import { encodeFields, encodeWrite } from "@core/business/encode/mod.ts";
import { decodeFields, type FirestoreHandle } from "@core/business/decode/mod.ts";
import { isSentinel } from "@core/business/sentinels/mod.ts";
import { request, type HttpConfig } from "@core/data/http/mod.ts";
import { FirestoreError } from "@core/dto/errors.ts";

export type RefContext = {
  http: HttpConfig;
  firestore: FirestoreHandle;
  databasePrefix: string; // "projects/P/databases/(default)/documents"
};

function ensureEven(segments: string[]): void {
  if (segments.length % 2 !== 0) {
    throw new TypeError(
      `Expected doc path (even segments), got ${segments.length}: ${segments.join("/")}`,
    );
  }
}

function ensureOdd(segments: string[]): void {
  if (segments.length % 2 !== 1) {
    throw new TypeError(
      `Expected collection path (odd segments), got ${segments.length}`,
    );
  }
}

export function target(ctx: RefContext, segments: string[]): DocRef | CollectionRef {
  if (segments.length === 0) {
    throw new TypeError("target() requires at least one path segment");
  }
  return segments.length % 2 === 0
    ? new DocRef(ctx, segments)
    : new CollectionRef(ctx, segments);
}

export class DocRef {
  readonly __docRef = true as const;
  readonly segments: string[];
  constructor(readonly ctx: RefContext, segments: string[]) {
    ensureEven(segments);
    this.segments = segments;
  }

  get path(): string {
    return this.segments.join("/");
  }

  get fullName(): string {
    return `${this.ctx.databasePrefix}/${this.path}`;
  }

  get id(): string {
    return this.segments[this.segments.length - 1];
  }

  async get(): Promise<Record<string, unknown> | null> {
    try {
      const res = await request<{ fields?: Record<string, unknown> }>(
        this.ctx.http,
        "GET",
        this.fullName,
      );
      return decodeFields(
        (res.fields ?? {}) as Record<string, never>,
        this.ctx.firestore,
      );
    } catch (e) {
      if (e instanceof FirestoreError && e.code === 404) return null;
      throw e;
    }
  }

  async set(data: Record<string, unknown>): Promise<void> {
    const hasTransform = Object.values(data).some(isSentinel);
    if (!hasTransform) {
      const fieldPaths = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k);
      const qs = fieldPaths
        .map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`)
        .join("&");
      const body = encodeFields(data);
      await request(this.ctx.http, "PATCH", `${this.fullName}?${qs}`, body);
      return;
    }
    const write = encodeWrite(this.fullName, data);
    await request(
      this.ctx.http,
      "POST",
      `${this.ctx.databasePrefix}:commit`,
      { writes: [write] },
    );
  }
}

export type CollectionPage = {
  docs: Array<{ id: string; data: Record<string, unknown> }>;
  nextPageToken?: string;
};

export class CollectionRef {
  readonly __collectionRef = true as const;
  readonly segments: string[];
  constructor(readonly ctx: RefContext, segments: string[]) {
    ensureOdd(segments);
    this.segments = segments;
  }

  get path(): string {
    return this.segments.join("/");
  }

  get parentPath(): string {
    // parent document path (possibly empty for root collection)
    return this.segments.slice(0, -1).join("/");
  }

  get collectionId(): string {
    return this.segments[this.segments.length - 1];
  }

  get parentFullName(): string {
    return this.parentPath
      ? `${this.ctx.databasePrefix}/${this.parentPath}`
      : this.ctx.databasePrefix;
  }

  async set(data: Record<string, unknown>): Promise<DocRef> {
    const body = encodeFields(data);
    const res = await request<{ name: string }>(
      this.ctx.http,
      "POST",
      `${this.parentFullName}/${this.collectionId}`,
      body,
    );
    // name = "projects/P/databases/(default)/documents/<logical>"
    const logical = res.name.slice(this.ctx.databasePrefix.length + 1);
    return new DocRef(this.ctx, logical.split("/"));
  }

  async get(
    opts: { pageSize?: number; pageToken?: string } = {},
  ): Promise<CollectionPage> {
    const params = new URLSearchParams();
    if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
    if (opts.pageToken) params.set("pageToken", opts.pageToken);
    const qs = params.toString();
    const path = `${this.parentFullName}/${this.collectionId}${qs ? `?${qs}` : ""}`;
    const res = await request<{
      documents?: Array<{ name: string; fields?: Record<string, never> }>;
      nextPageToken?: string;
    }>(this.ctx.http, "GET", path);
    const docs = (res.documents ?? []).map((d) => {
      const logical = d.name.slice(this.ctx.databasePrefix.length + 1);
      const segs = logical.split("/");
      return {
        id: segs[segs.length - 1],
        data: decodeFields(d.fields ?? {}, this.ctx.firestore),
      };
    });
    return { docs, nextPageToken: res.nextPageToken };
  }
}
