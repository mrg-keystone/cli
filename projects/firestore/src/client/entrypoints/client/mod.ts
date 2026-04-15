import type { ServiceAccount } from "@core/data/auth/mod.ts";
import type { HttpConfig } from "@core/data/http/mod.ts";
import {
  CollectionRef,
  DocRef,
  type RefContext,
  target as targetRef,
} from "@core/business/ref/mod.ts";
import { QueryRef } from "@client/domain/coordinators/query/mod.ts";
import { WriteBatch } from "@client/domain/coordinators/batch/mod.ts";
import { AtomicTxn } from "@client/domain/coordinators/atomic/mod.ts";
import { FirestoreError } from "@core/dto/errors.ts";
import * as sentinels from "@core/business/sentinels/mod.ts";
import {
  sample,
  type SampleOptions,
  type SampleResult,
} from "@client/domain/coordinators/sample/mod.ts";

export type FirestoreOptions = {
  emulatorPort?: number;
  projectId?: string;
};

export class Firestore {
  readonly projectId: string;
  readonly databasePrefix: string;
  private readonly ctx: RefContext;

  constructor(serviceAcct: ServiceAccount, options: FirestoreOptions = {}) {
    this.projectId = options.projectId ?? serviceAcct.project_id;
    if (!this.projectId) {
      throw new Error("projectId is required (via service account or options)");
    }
    this.databasePrefix =
      `projects/${this.projectId}/databases/(default)/documents`;
    const http: HttpConfig = {
      serviceAcct,
      projectId: this.projectId,
      emulatorPort: options.emulatorPort,
    };
    this.ctx = {
      http,
      firestore: { refFromPath: (p) => this.refFromPath(p) },
      databasePrefix: this.databasePrefix,
    };
  }

  target(...path: string[]): DocRef | CollectionRef {
    // CollectionRef returns a sub-type exposing .where()
    const ref = targetRef(this.ctx, path);
    if (ref instanceof CollectionRef) return collectionWithQuery(ref);
    return ref;
  }

  batch(): WriteBatch {
    return new WriteBatch(this.ctx);
  }

  atomic(): AtomicTxn {
    return new AtomicTxn(this.ctx);
  }

  async runTransaction<T>(
    cb: (atom: AtomicTxn) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      const atom = new AtomicTxn(this.ctx);
      try {
        const out = await cb(atom);
        await atom.commit();
        return out;
      } catch (e) {
        if (
          attempt < maxRetries &&
          e instanceof FirestoreError && e.status === "ABORTED"
        ) {
          attempt++;
          continue;
        }
        try {
          await atom.rollback();
        } catch { /* ignore */ }
        throw e;
      }
    }
  }

  sample(
    ...args: Array<string | SampleOptions>
  ): Promise<SampleResult> {
    let opts: SampleOptions = {};
    const path: string[] = [];
    for (const a of args) {
      if (typeof a === "string") path.push(a);
      else if (a && typeof a === "object") opts = a;
    }
    return sample(this.ctx, path, opts);
  }

  refFromPath(fullOrLogical: string): DocRef {
    const logical = fullOrLogical.startsWith(this.databasePrefix + "/")
      ? fullOrLogical.slice(this.databasePrefix.length + 1)
      : fullOrLogical;
    return new DocRef(this.ctx, logical.split("/"));
  }

  // sentinel factories
  serverTimestamp = sentinels.serverTimestamp;
  increment = sentinels.increment;
  maximum = sentinels.maximum;
  minimum = sentinels.minimum;
  arrayUnion = sentinels.arrayUnion;
  arrayRemove = sentinels.arrayRemove;
  deleteField = sentinels.deleteField;
}

function collectionWithQuery(ref: CollectionRef): CollectionRef {
  const proto = ref as CollectionRef & {
    where?: QueryRef["where"];
    orderBy?: QueryRef["orderBy"];
    limit?: QueryRef["limit"];
  };
  proto.where = function (field, op, value) {
    return new QueryRef(ref).where(field, op, value);
  };
  proto.orderBy = function (field, dir) {
    return new QueryRef(ref).orderBy(field, dir);
  };
  proto.limit = function (n) {
    return new QueryRef(ref).limit(n);
  };
  return ref;
}
