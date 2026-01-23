import { pull } from "@env/domain/data/http-client/http-client.mod.ts";
import { getConfig } from "@env/domain/data/db/db.mod.ts";

const ENV_FILE = ".env";

export interface PullResult {
  content: string;
  fileExists: boolean;
  written: boolean;
  path: string;
}

export async function pullEnvironment(envName: string, confirmOverwrite = false): Promise<PullResult> {
  const config = await getConfig(envName);
  const result = await pull(config.host, config.environmentId, config.authToken);

  const content = result.variables
    .map(v => `${v.key}=${v.latest_version.value}`)
    .join("\n");

  let fileExists = false;
  try {
    await Deno.stat(ENV_FILE);
    fileExists = true;
  } catch {
    // File doesn't exist
  }

  const path = `${Deno.cwd()}/${ENV_FILE}`;

  if (fileExists && !confirmOverwrite) {
    return { content, fileExists: true, written: false, path };
  }

  await Deno.writeTextFile(ENV_FILE, content + "\n");
  return { content, fileExists, written: true, path };
}
