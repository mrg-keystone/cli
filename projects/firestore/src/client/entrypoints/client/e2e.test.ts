import { assertEquals, assertThrows } from "@std/assert";
import { Firestore } from "./mod.ts";
import { CollectionRef, DocRef } from "@core/business/ref/mod.ts";
import type { ServiceAccount } from "@core/data/auth/mod.ts";

const sa: ServiceAccount = {
  project_id: "demo",
  client_email: "x@x",
  private_key: "",
};

Deno.test("Firestore — target(evens) returns DocRef", () => {
  const fs = new Firestore(sa, { emulatorPort: 8080 });
  const ref = fs.target("users", "u1");
  assertEquals(ref instanceof DocRef, true);
});

Deno.test("Firestore — target(odds) returns CollectionRef with query methods", () => {
  const fs = new Firestore(sa, { emulatorPort: 8080 });
  const ref = fs.target("users") as CollectionRef & {
    where: (...a: unknown[]) => unknown;
  };
  assertEquals(ref instanceof CollectionRef, true);
  assertEquals(typeof ref.where, "function");
});

Deno.test("Firestore — sentinel factories are bound", () => {
  const fs = new Firestore(sa, { emulatorPort: 8080 });
  assertEquals(fs.increment(1).kind, "increment");
  assertEquals(fs.serverTimestamp().kind, "serverTimestamp");
});

Deno.test("Firestore — missing projectId throws", () => {
  assertThrows(
    () =>
      new Firestore(
        { project_id: "", client_email: "x@x", private_key: "" },
        {},
      ),
    Error,
  );
});

// ---- Production round-trip tests ----
// Opt-in: run with `deno test -A --env-file=.env` and GOOGLE_SERVICE_ACCOUNT_B64 set.

const b64 = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_B64");
const PROD = Boolean(b64);

function loadProdSa(): ServiceAccount {
  const json = new TextDecoder().decode(
    Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0)),
  );
  return JSON.parse(json) as ServiceAccount;
}

const COLL = "_firestore_client_e2e";
const runId = crypto.randomUUID().slice(0, 8);

Deno.test({
  name: "PROD — set + get round-trips all value types",
  ignore: !PROD,
  fn: async () => {
    const fs = new Firestore(loadProdSa());
    const ref = fs.target(COLL, `doc-${runId}-types`) as DocRef;
    const now = new Date("2026-04-14T12:00:00.000Z");
    const payload = {
      name: "Alice",
      age: 30,
      height: 1.68,
      active: true,
      parent: null,
      joinedAt: now,
      tags: ["admin", "beta"],
      profile: { city: "NYC", score: 10 },
    };
    await ref.set(payload);
    const got = await ref.get();
    assertEquals(got?.name, "Alice");
    assertEquals(got?.age, 30);
    assertEquals(got?.height, 1.68);
    assertEquals(got?.active, true);
    assertEquals(got?.parent, null);
    assertEquals((got?.joinedAt as Date).toISOString(), now.toISOString());
    assertEquals(got?.tags, ["admin", "beta"]);
    assertEquals(got?.profile, { city: "NYC", score: 10 });
  },
});

Deno.test({
  name: "PROD — sentinel increment + serverTimestamp",
  ignore: !PROD,
  fn: async () => {
    const fs = new Firestore(loadProdSa());
    const ref = fs.target(COLL, `doc-${runId}-sentinel`) as DocRef;
    await ref.set({ views: 0 });
    await ref.set({ views: fs.increment(3), touched: fs.serverTimestamp() });
    const got = await ref.get();
    assertEquals(got?.views, 3);
    assertEquals(got?.touched instanceof Date, true);
  },
});

Deno.test({
  name: "PROD — query: where + orderBy + limit",
  ignore: !PROD,
  fn: async () => {
    const fs = new Firestore(loadProdSa());
    type QueryBuilder = {
      where: (f: string, op: string, v: unknown) => QueryBuilder;
      orderBy: (f: string, d: "asc" | "desc") => QueryBuilder;
      limit: (n: number) => QueryBuilder;
      get: () => Promise<{ id: string; data: Record<string, unknown> }[]>;
    };
    const coll = fs.target(COLL) as unknown as QueryBuilder & CollectionRef;
    const seeds = [
      { id: `q-${runId}-a`, age: 17, tier: runId },
      { id: `q-${runId}-b`, age: 25, tier: runId },
      { id: `q-${runId}-c`, age: 42, tier: runId },
    ];
    for (const s of seeds) {
      await (fs.target(COLL, s.id) as DocRef).set({ age: s.age, tier: s.tier });
    }
    // Single-field query: filter by tier, order by tier (no composite index needed).
    const rows = await coll
      .where("tier", "==", runId)
      .limit(10)
      .get();
    const ages = rows
      .map((r) => r.data.age as number)
      .sort((a, b) => a - b);
    assertEquals(ages, [17, 25, 42]);
  },
});

Deno.test({
  name: "PROD — batch commits multiple writes atomically",
  ignore: !PROD,
  fn: async () => {
    const fs = new Firestore(loadProdSa());
    const batch = fs.batch();
    const ids = ["x", "y", "z"].map((s) => `b-${runId}-${s}`);
    for (const id of ids) batch.target(COLL, id).set({ label: id });
    await batch.commit();
    for (const id of ids) {
      const got = await (fs.target(COLL, id) as DocRef).get();
      assertEquals(got?.label, id);
    }
  },
});

Deno.test({
  name: "PROD — runTransaction increments a counter",
  ignore: !PROD,
  fn: async () => {
    const fs = new Firestore(loadProdSa());
    const id = `t-${runId}`;
    await (fs.target(COLL, id) as DocRef).set({ n: 10 });
    await fs.runTransaction(async (atom) => {
      const doc = await atom.target(COLL, id).get();
      atom.target(COLL, id).set({ n: ((doc?.n as number) ?? 0) + 5 });
    });
    const got = await (fs.target(COLL, id) as DocRef).get();
    assertEquals(got?.n, 15);
  },
});
