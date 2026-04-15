import { decodeFields } from "@core/business/decode/mod.ts";
import { DocRef, type RefContext } from "@core/business/ref/mod.ts";
import { request } from "@core/data/http/mod.ts";
import type { Value } from "@core/dto/types.ts";

export type SampleOptions = {
  maxDepth?: number;
  include?: (path: string) => boolean;
  batchSize?: number;
};

export type SampleResult = {
  root: string;
  docs: Record<string, Record<string, unknown> | null>;
};

function collectRefs(fields: Record<string, Value>): string[] {
  const out: string[] = [];
  const walk = (v: Value): void => {
    if (!v || typeof v !== "object") return;
    if ("referenceValue" in v && typeof v.referenceValue === "string") {
      out.push(v.referenceValue);
      return;
    }
    if ("arrayValue" in v) {
      const av = v.arrayValue as { values?: Value[] };
      for (const x of av.values ?? []) walk(x);
    }
    if ("mapValue" in v) {
      const mv = v.mapValue as { fields?: Record<string, Value> };
      for (const x of Object.values(mv.fields ?? {})) walk(x);
    }
  };
  for (const v of Object.values(fields)) walk(v);
  return out;
}

export async function sample(
  ctx: RefContext,
  path: string[],
  opts: SampleOptions = {},
): Promise<SampleResult> {
  const batchSize = opts.batchSize ?? 100;
  const maxDepth = opts.maxDepth ?? Infinity;
  const include = opts.include ?? (() => true);

  const rootDoc = new DocRef(ctx, path);
  const root = rootDoc.path;

  const docs: Record<string, Record<string, unknown> | null> = {};
  const visited = new Set<string>();
  // queue holds full API names with depth
  type Entry = { name: string; depth: number };
  let queue: Entry[] = [{ name: rootDoc.fullName, depth: 0 }];

  while (queue.length > 0) {
    const chunk = queue.splice(0, batchSize);
    const uniq = chunk.filter((e) => {
      if (visited.has(e.name)) return false;
      visited.add(e.name);
      return true;
    });
    if (uniq.length === 0) continue;

    const res = await request<Array<{
      found?: { name: string; fields?: Record<string, Value> };
      missing?: string;
    }>>(
      ctx.http,
      "POST",
      `${ctx.databasePrefix}:batchGet`,
      { documents: uniq.map((e) => e.name) },
    );

    const depthByName = new Map(uniq.map((e) => [e.name, e.depth]));

    for (const row of res) {
      if (row.missing) {
        const logical = row.missing.slice(ctx.databasePrefix.length + 1);
        docs[logical] = null;
        continue;
      }
      if (!row.found) continue;
      const name = row.found.name;
      const logical = name.slice(ctx.databasePrefix.length + 1);
      const fields = row.found.fields ?? {};
      docs[logical] = decodeFields(fields, ctx.firestore);

      const depth = depthByName.get(name) ?? 0;
      if (depth >= maxDepth) continue;
      const refs = collectRefs(fields);
      for (const refName of refs) {
        if (visited.has(refName)) continue;
        const refLogical = refName.startsWith(ctx.databasePrefix + "/")
          ? refName.slice(ctx.databasePrefix.length + 1)
          : refName;
        if (!include(refLogical)) continue;
        queue.push({ name: refName, depth: depth + 1 });
      }
    }
  }

  return { root, docs };
}
