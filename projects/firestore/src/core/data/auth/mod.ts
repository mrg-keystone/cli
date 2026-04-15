import { encodeBase64Url } from "@std/encoding/base64url";

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export type AuthMode = { emulator: boolean };

const SCOPE = "https://www.googleapis.com/auth/datastore";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

type CachedToken = { token: string; expiresAt: number };
const cache = new WeakMap<ServiceAccount, CachedToken>();

function b64urlJson(obj: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function signJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri ?? DEFAULT_TOKEN_URI,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(claims)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  return `${signingInput}.${encodeBase64Url(sig)}`;
}

export async function getAccessToken(
  sa: ServiceAccount,
  mode: AuthMode = { emulator: false },
): Promise<string> {
  if (mode.emulator) return "owner";
  const now = Math.floor(Date.now() / 1000);
  const cached = cache.get(sa);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const jwt = await signJwt(sa);
  const res = await fetch(sa.token_uri ?? DEFAULT_TOKEN_URI, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json() as { access_token: string; expires_in: number };
  const token: CachedToken = {
    token: body.access_token,
    expiresAt: now + body.expires_in,
  };
  cache.set(sa, token);
  return token.token;
}
