import { assertEquals } from "@std/assert";
import { encodeValue } from "@core/business/encode/mod.ts";
import { decodeValue, type FirestoreHandle } from "./mod.ts";

const handle: FirestoreHandle = {
  refFromPath: (path) => ({ __docRef: true, path }),
};

Deno.test("decode round-trips fixtures", () => {
  const cases: unknown[] = [
    "hi",
    3,
    3.5,
    true,
    false,
    null,
    [1, "a", true],
    { a: 1, b: "x", c: [2, 3] },
  ];
  for (const c of cases) {
    assertEquals(decodeValue(encodeValue(c), handle), c);
  }
});

Deno.test("decode — Date round-trip", () => {
  const d = new Date("2026-04-14T00:00:00.000Z");
  const back = decodeValue(encodeValue(d), handle) as Date;
  assertEquals(back.toISOString(), d.toISOString());
});

Deno.test("decode — referenceValue becomes DocRef via firestore handle", () => {
  const path = "projects/p/databases/(default)/documents/users/u1";
  const out = decodeValue({ referenceValue: path }, handle) as {
    __docRef: true;
    path: string;
  };
  assertEquals(out.path, path);
  assertEquals(out.__docRef, true);
});
