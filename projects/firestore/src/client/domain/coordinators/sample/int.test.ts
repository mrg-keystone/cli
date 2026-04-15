import { assertEquals } from "@std/assert";
import { sample } from "./mod.ts";
import type { RefContext } from "@core/business/ref/mod.ts";

Deno.test("sample — empty path produces TypeError via DocRef", async () => {
  const ctx: RefContext = {
    http: {
      serviceAcct: { project_id: "p", client_email: "x@x", private_key: "" },
      projectId: "p",
      emulatorPort: 8080,
    },
    firestore: { refFromPath: (path) => ({ __docRef: true, path }) },
    databasePrefix: "projects/p/databases/(default)/documents",
  };
  let threw = false;
  try {
    await sample(ctx, []);
  } catch (_) {
    threw = true;
  }
  assertEquals(threw, true);
});
