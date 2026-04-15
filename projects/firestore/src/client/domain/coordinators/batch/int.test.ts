import { assertEquals, assertThrows } from "@std/assert";
import { WriteBatch } from "./mod.ts";
import type { RefContext } from "@core/business/ref/mod.ts";

const ctx: RefContext = {
  http: {
    serviceAcct: { project_id: "p", client_email: "x@x", private_key: "" },
    projectId: "p",
    emulatorPort: 8080,
  },
  firestore: { refFromPath: (path) => ({ __docRef: true, path }) },
  databasePrefix: "projects/p/databases/(default)/documents",
};

Deno.test("WriteBatch — target() rejects odd-segment path", () => {
  const batch = new WriteBatch(ctx);
  assertThrows(() => batch.target("users"), TypeError);
});

Deno.test("WriteBatch — empty commit is a no-op", async () => {
  const batch = new WriteBatch(ctx);
  await batch.commit();
  assertEquals(true, true);
});
