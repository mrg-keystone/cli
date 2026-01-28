interface Variable {
  key: string;
  latest_version: { id: bigint; value: string };
}

interface SetupResponse {
  authToken: string;
  app: { variables: Variable[] };
}

interface PullResponse {
  variables: Variable[];
}

export async function setup(host: string, envId: number, key: string): Promise<SetupResponse> {
  const url = `https://${host}/api/v1/apps/${envId}/setup/${key}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    console.error("Failed to setup environment.");
    console.error("Please check that your environment ID and setup key are correct.");
    Deno.exit(1);
  }
  return res.json();
}

export async function pull(host: string, envId: number, authToken: string): Promise<PullResponse> {
  const url = `https://${host}/api/v1/apps/${envId}/update`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    console.error("Failed to pull environment variables.");
    console.error("Your auth token may have expired. Try running 'keystone env setup' again.");
    Deno.exit(1);
  }
  return res.json();
}
