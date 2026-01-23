import { plainToInstance, instanceToPlain } from "#class-transformer";
import { Config } from "@env/dto/config.ts";

const configDir = `${Deno.env.get("HOME")}/.env-vault`;

export async function setConfig(cfg: Config): Promise<void> {
  await Deno.mkdir(configDir, { recursive: true });
  await Deno.writeTextFile(`${configDir}/${cfg.envName}.json`, JSON.stringify(instanceToPlain(cfg), null, 2));
}

export async function getConfig(envName: string): Promise<Config> {
  const text = await Deno.readTextFile(`${configDir}/${envName}.json`);
  return plainToInstance(Config, JSON.parse(text));
}

export async function deleteConfig(envName: string): Promise<void> {
  await Deno.remove(`${configDir}/${envName}.json`);
}
