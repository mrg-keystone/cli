import { assertEquals, assertThrows } from "@std/assert";
import { QueryRef } from "./mod.ts";
import { CollectionRef, type RefContext } from "@core/business/ref/mod.ts";

const ctx: RefContext = {
  http: {
    serviceAcct: { project_id: "p", client_email: "x@x", private_key: "" },
    projectId: "p",
    emulatorPort: 8080,
  },
  firestore: { refFromPath: (path) => ({ __docRef: true, path }) },
  databasePrefix: "projects/p/databases/(default)/documents",
};

function makeQuery(): QueryRef {
  return new QueryRef(new CollectionRef(ctx, ["users"]));
}

Deno.test("QueryRef — set() throws TypeError at runtime", () => {
  assertThrows(() => makeQuery().set(), TypeError);
});

Deno.test("QueryRef — chainable builders return same instance", () => {
  const q = makeQuery();
  assertEquals(q.where("age", ">=", 18), q);
  assertEquals(q.orderBy("createdAt", "desc"), q);
  assertEquals(q.limit(10), q);
});
