# firestore

## Service account credentials

The Firebase/GCP service account JSON is stored as a single base64-encoded env var: `GOOGLE_SERVICE_ACCOUNT_B64` (see `.env`).

### Encode (once, from a service-account JSON file)

```bash
base64 -i service-account.json | tr -d '\n' > sa.b64
# then: GOOGLE_SERVICE_ACCOUNT_B64=<contents of sa.b64>  in your .env
```

### Decode in code (Deno / TS)

```ts
const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_B64");
if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 not set");
const creds = JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
));
// creds.private_key, creds.client_email, creds.project_id, ...
```

Node equivalent:

```ts
const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_B64!, "base64").toString("utf8"),
);
```

### Decode on the shell (sanity check)

```bash
# prints the original JSON
grep ^GOOGLE_SERVICE_ACCOUNT_B64= .env | cut -d= -f2- | base64 -d

# or, if already exported:
echo "$GOOGLE_SERVICE_ACCOUNT_B64" | base64 -d | jq .
```

The round-trip is byte-exact — `base64 -d` of the env value produces the original JSON (including the `\n` escapes inside `private_key`), so it can be passed straight to Firebase Admin / `google-auth` as a credentials object.
