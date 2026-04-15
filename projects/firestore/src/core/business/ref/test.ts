import { assertEquals, assertThrows } from "@std/assert";
import {
  CollectionRef,
  DocRef,
  type RefContext,
  target,
} from "./mod.ts";

const ctx: RefContext = {
  http: {
    serviceAcct: { project_id: "p", client_email: "x@x", private_key: "" },
    projectId: "p",
    emulatorPort: 8080,
  },
  firestore: { refFromPath: (path) => ({ __docRef: true, path }) },
  databasePrefix: "projects/p/databases/(default)/documents",
};

Deno.test("target — even segments produce DocRef", () => {
  const ref = target(ctx, ["users", "u1"]);
  assertEquals(ref instanceof DocRef, true);
});

Deno.test("target — odd segments produce CollectionRef", () => {
  const ref = target(ctx, ["users"]);
  assertEquals(ref instanceof CollectionRef, true);
});

Deno.test("target — zero segments throws", () => {
  assertThrows(() => target(ctx, []), TypeError);
});

Deno.test("DocRef — fullName prefixes database path", () => {
  const doc = new DocRef(ctx, ["users", "u1"]);
  assertEquals(
    doc.fullName,
    "projects/p/databases/(default)/documents/users/u1",
  );
  assertEquals(doc.id, "u1");
});

Deno.test("CollectionRef — parentFullName for root is database prefix", () => {
  const coll = new CollectionRef(ctx, ["users"]);
  assertEquals(coll.parentFullName, ctx.databasePrefix);
  assertEquals(coll.collectionId, "users");
});

Deno.test("CollectionRef — parentFullName for nested includes parent doc", () => {
  const coll = new CollectionRef(ctx, ["users", "u1", "posts"]);
  assertEquals(
    coll.parentFullName,
    "projects/p/databases/(default)/documents/users/u1",
  );
});
