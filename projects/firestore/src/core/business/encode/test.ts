import { assertEquals, assertThrows } from "@std/assert";
import { encodeFields, encodeValue } from "./mod.ts";

const fixtures = JSON.parse(
  await Deno.readTextFile(
    new URL("../../../../fixtures/encoding/values.json", import.meta.url),
  ),
) as Record<string, { in: unknown; out: unknown }>;

Deno.test("encodeValue — primitive and composite fixtures", () => {
  for (const [name, { in: input, out }] of Object.entries(fixtures)) {
    assertEquals(encodeValue(input), out, `fixture "${name}"`);
  }
});

Deno.test("encodeValue — Date becomes timestampValue RFC3339", () => {
  const d = new Date("2026-04-14T00:00:00.000Z");
  assertEquals(encodeValue(d), { timestampValue: "2026-04-14T00:00:00.000Z" });
});

Deno.test("encodeValue — DocRef becomes referenceValue", () => {
  const ref = {
    __docRef: true as const,
    path: "projects/p/databases/(default)/documents/users/u1",
  };
  assertEquals(encodeValue(ref), { referenceValue: ref.path });
});

Deno.test("encodeFields — skips undefined", () => {
  assertEquals(encodeFields({ a: 1, b: undefined, c: "x" }), {
    fields: { a: { integerValue: "1" }, c: { stringValue: "x" } },
  });
});

Deno.test("encodeValue — rejects unsupported", () => {
  assertThrows(() => encodeValue(Symbol("x") as unknown), TypeError);
});
