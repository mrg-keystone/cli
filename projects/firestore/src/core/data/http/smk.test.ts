import { assertEquals, assertRejects } from "@std/assert";
import { request, type HttpConfig } from "./mod.ts";
import { FirestoreError } from "@core/dto/errors.ts";
import type { ServiceAccount } from "@core/data/auth/mod.ts";

const sa: ServiceAccount = {
  project_id: "p",
  client_email: "x@x",
  private_key: "",
};

function makeCfg(
  responses: Array<{ status: number; body: string }>,
  extra: Partial<HttpConfig> = {},
): { cfg: HttpConfig; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    const r = responses.shift();
    if (!r) throw new Error("no response queued");
    return Promise.resolve(new Response(r.body, { status: r.status }));
  };
  return {
    cfg: {
      serviceAcct: sa,
      projectId: "p",
      emulatorPort: 8080,
      fetch: fakeFetch,
      sleep: () => Promise.resolve(),
      ...extra,
    },
    calls,
  };
}

Deno.test("request — retries on 503 then succeeds", async () => {
  const { cfg, calls } = makeCfg([
    { status: 503, body: JSON.stringify({ error: { status: "UNAVAILABLE", message: "nope", code: 503 } }) },
    { status: 503, body: JSON.stringify({ error: { status: "UNAVAILABLE", message: "nope", code: 503 } }) },
    { status: 200, body: JSON.stringify({ ok: true }) },
  ]);
  const out = await request<{ ok: boolean }>(cfg, "GET", "x");
  assertEquals(out.ok, true);
  assertEquals(calls.length, 3);
});

Deno.test("request — maps non-retryable error to FirestoreError", async () => {
  const { cfg } = makeCfg([
    { status: 404, body: JSON.stringify({ error: { status: "NOT_FOUND", message: "gone", code: 404 } }) },
  ]);
  await assertRejects(
    () => request(cfg, "GET", "x"),
    FirestoreError,
    "gone",
  );
});

Deno.test("request — gives up after maxRetries", async () => {
  const { cfg, calls } = makeCfg(
    Array.from({ length: 4 }, () => ({
      status: 503,
      body: JSON.stringify({ error: { status: "UNAVAILABLE", message: "x", code: 503 } }),
    })),
    { maxRetries: 3 },
  );
  await assertRejects(() => request(cfg, "GET", "x"), FirestoreError);
  assertEquals(calls.length, 4);
});
