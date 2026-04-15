import { assertEquals } from "@std/assert";
import { encodeWrite } from "@core/business/encode/mod.ts";
import * as s from "./mod.ts";

Deno.test("encodeWrite — mixed sentinels produce correct Write shape", () => {
  const docName = "projects/p/databases/(default)/documents/users/u1";
  const write = encodeWrite(docName, {
    name: "A",
    views: s.increment(1),
    updatedAt: s.serverTimestamp(),
    tags: s.arrayUnion("x", "y"),
    banned: s.arrayRemove("z"),
    highScore: s.maximum(42),
    lowScore: s.minimum(0),
    stale: s.deleteField(),
  });

  assertEquals(write.update.name, docName);
  assertEquals(write.update.fields, { name: { stringValue: "A" } });

  assertEquals(new Set(write.updateMask.fieldPaths), new Set([
    "name",
    "views",
    "updatedAt",
    "tags",
    "banned",
    "highScore",
    "lowScore",
    "stale",
  ]));

  const byPath = Object.fromEntries(
    (write.updateTransforms ?? []).map((t) => [t.fieldPath, t]),
  );
  assertEquals(byPath.views.increment, { integerValue: "1" });
  assertEquals(byPath.updatedAt.setToServerValue, "REQUEST_TIME");
  assertEquals(byPath.tags.appendMissingElements, {
    values: [{ stringValue: "x" }, { stringValue: "y" }],
  });
  assertEquals(byPath.banned.removeAllFromArray, {
    values: [{ stringValue: "z" }],
  });
  assertEquals(byPath.highScore.maximum, { integerValue: "42" });
  assertEquals(byPath.lowScore.minimum, { integerValue: "0" });
  // deleteField is NOT a transform
  assertEquals("stale" in byPath, false);
});
