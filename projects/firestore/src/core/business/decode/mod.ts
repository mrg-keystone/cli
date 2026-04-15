import type { Value } from "@core/dto/types.ts";

export type FirestoreHandle = {
  refFromPath(path: string): unknown;
};

export function decodeValue(v: Value, firestore: FirestoreHandle): unknown {
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue as string;
  if ("booleanValue" in v) return v.booleanValue as boolean;
  if ("integerValue" in v) {
    const n = Number(v.integerValue);
    if (n > Number.MAX_SAFE_INTEGER) {
      console.warn(`integerValue ${v.integerValue} exceeds MAX_SAFE_INTEGER`);
    }
    return n;
  }
  if ("doubleValue" in v) return v.doubleValue as number;
  if ("timestampValue" in v) return new Date(v.timestampValue as string);
  if ("referenceValue" in v) {
    return firestore.refFromPath(v.referenceValue as string);
  }
  if ("arrayValue" in v) {
    const av = v.arrayValue as { values?: Value[] };
    return (av.values ?? []).map((x) => decodeValue(x, firestore));
  }
  if ("mapValue" in v) {
    const mv = v.mapValue as { fields?: Record<string, Value> };
    return decodeFields(mv.fields ?? {}, firestore);
  }
  throw new TypeError(`Unknown Firestore Value shape: ${JSON.stringify(v)}`);
}

export function decodeFields(
  fields: Record<string, Value>,
  firestore: FirestoreHandle,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(fields)) {
    out[k] = decodeValue(val, firestore);
  }
  return out;
}
