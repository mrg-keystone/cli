import type { Value } from "@core/dto/types.ts";
import { isSentinel, type Sentinel } from "@core/business/sentinels/mod.ts";

export type DocRefLike = { __docRef: true; path: string };

function isDocRef(v: unknown): v is DocRefLike {
  return typeof v === "object" && v !== null &&
    (v as { __docRef?: boolean }).__docRef === true;
}

export function encodeValue(v: unknown): Value {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (isDocRef(v)) return { referenceValue: v.path };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(encodeValue) } };
  }
  if (typeof v === "object") {
    return { mapValue: encodeFields(v as object) };
  }
  throw new TypeError(`Unsupported value type: ${typeof v}`);
}

export function encodeFields(o: object): { fields: Record<string, Value> } {
  const fields: Record<string, Value> = {};
  for (const [k, val] of Object.entries(o)) {
    if (val === undefined) continue;
    if (isSentinel(val)) continue;
    fields[k] = encodeValue(val);
  }
  return { fields };
}

export type FieldTransform = Record<string, unknown> & { fieldPath: string };

export function sentinelToTransform(path: string, s: Sentinel): FieldTransform {
  switch (s.kind) {
    case "serverTimestamp":
      return { fieldPath: path, setToServerValue: "REQUEST_TIME" };
    case "increment":
      return { fieldPath: path, increment: encodeValue(s.args[0]) };
    case "maximum":
      return { fieldPath: path, maximum: encodeValue(s.args[0]) };
    case "minimum":
      return { fieldPath: path, minimum: encodeValue(s.args[0]) };
    case "arrayUnion":
      return {
        fieldPath: path,
        appendMissingElements: { values: s.args.map(encodeValue) },
      };
    case "arrayRemove":
      return {
        fieldPath: path,
        removeAllFromArray: { values: s.args.map(encodeValue) },
      };
    case "deleteField":
      throw new Error("deleteField is not a transform; handled via updateMask");
  }
}

export type EncodedWrite = {
  update: { name: string; fields: Record<string, Value> };
  updateMask: { fieldPaths: string[] };
  updateTransforms?: FieldTransform[];
};

export function encodeWrite(
  docName: string,
  data: Record<string, unknown>,
): EncodedWrite {
  const fields: Record<string, Value> = {};
  const fieldPaths: string[] = [];
  const transforms: FieldTransform[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    fieldPaths.push(k);
    if (isSentinel(v)) {
      if (v.kind === "deleteField") continue;
      transforms.push(sentinelToTransform(k, v));
      continue;
    }
    fields[k] = encodeValue(v);
  }
  const write: EncodedWrite = {
    update: { name: docName, fields },
    updateMask: { fieldPaths },
  };
  if (transforms.length > 0) write.updateTransforms = transforms;
  return write;
}
