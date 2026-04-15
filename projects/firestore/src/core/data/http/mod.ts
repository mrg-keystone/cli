import { getAccessToken, type ServiceAccount } from "@core/data/auth/mod.ts";
import { FirestoreError, isRetryable } from "@core/dto/errors.ts";

export type HttpConfig = {
  serviceAcct: ServiceAccount;
  projectId: string;
  emulatorPort?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export function baseUrl(cfg: HttpConfig): string {
  if (cfg.emulatorPort) return `http://localhost:${cfg.emulatorPort}/v1/`;
  return "https://firestore.googleapis.com/v1/";
}

async function sleepDefault(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function request<T = unknown>(
  cfg: HttpConfig,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const doFetch = cfg.fetch ?? fetch;
  const doSleep = cfg.sleep ?? sleepDefault;
  const token = await getAccessToken(cfg.serviceAcct, {
    emulator: Boolean(cfg.emulatorPort),
  });
  const url = baseUrl(cfg) + path.replace(/^\//, "");
  const maxRetries = cfg.maxRetries ?? 3;

  let attempt = 0;
  while (true) {
    const res = await doFetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) {
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    }
    const errBody = await res.text();
    let parsed: { error?: { status?: string; message?: string; code?: number } } = {};
    try {
      parsed = JSON.parse(errBody);
    } catch { /* ignore */ }
    const err = new FirestoreError(
      parsed.error?.message ?? errBody ?? res.statusText,
      parsed.error?.status ?? "UNKNOWN",
      res.status,
      parsed.error,
    );
    if (attempt < maxRetries && isRetryable(err)) {
      await doSleep(2 ** attempt * 100);
      attempt++;
      continue;
    }
    throw err;
  }
}
