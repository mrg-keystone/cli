export type SentinelKind =
  | "serverTimestamp"
  | "increment"
  | "maximum"
  | "minimum"
  | "arrayUnion"
  | "arrayRemove"
  | "deleteField";

export type Sentinel = {
  __sentinel: true;
  kind: SentinelKind;
  args: unknown[];
};

function make(kind: SentinelKind, args: unknown[] = []): Sentinel {
  return { __sentinel: true, kind, args };
}

export function isSentinel(v: unknown): v is Sentinel {
  return typeof v === "object" && v !== null &&
    (v as { __sentinel?: boolean }).__sentinel === true;
}

export const serverTimestamp = (): Sentinel => make("serverTimestamp");
export const increment = (n: number): Sentinel => make("increment", [n]);
export const maximum = (n: number): Sentinel => make("maximum", [n]);
export const minimum = (n: number): Sentinel => make("minimum", [n]);
export const arrayUnion = (...xs: unknown[]): Sentinel =>
  make("arrayUnion", xs);
export const arrayRemove = (...xs: unknown[]): Sentinel =>
  make("arrayRemove", xs);
export const deleteField = (): Sentinel => make("deleteField");
