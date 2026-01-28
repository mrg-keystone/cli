import { plainToInstance } from "#class-transformer";
import { setup } from "@env/domain/data/http-client/http-client.mod.ts";
import { setConfig } from "@env/domain/data/db/db.mod.ts";
import { Config } from "@env/dto/config.ts";

const SERVER = "envault-deploy.ngrok.app";

export async function setupEnvironment(envId: number, key: string, envName: string): Promise<void> {
  console.log(`Setting up environment "${envName}"...`);
  console.log("Validating credentials with server...");

  const result = await setup(SERVER, envId, key);
  const config = plainToInstance(Config, {
    host: SERVER,
    envName,
    environmentId: envId,
    authToken: result.authToken,
  });
  await setConfig(config);

  console.log(`\nEnvironment "${envName}" configured successfully!`);
  console.log(`  - Environment ID: ${envId}`);
  console.log(`  - Variables available: ${result.app.variables.length}`);
  console.log(`\nTo pull variables, run:`);
  console.log(`  keystone env pull ${envName}`);
}
