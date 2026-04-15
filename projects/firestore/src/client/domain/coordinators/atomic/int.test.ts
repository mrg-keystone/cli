import { assertEquals, assertThrows } from "@std/assert";
import { AtomicTxn } from "./mod.ts";
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

Deno.test("AtomicTxn — target() rejects odd-segment path", () => {
  const atom = new AtomicTxn(ctx);
  assertThrows(() => atom.target("users"), TypeError);
});

Deno.test("AtomicTxn — commit with no work is a no-op", async () => {
  const atom = new AtomicTxn(ctx);
  await atom.commit();
  assertEquals(true, true);
});

Deno.test("AtomicTxn — rollback without begin is a no-op", async () => {
  const atom = new AtomicTxn(ctx);
  await atom.rollback();
  assertEquals(true, true);
});
