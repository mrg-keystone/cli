import { Command } from "#cliffy/command";
import { initKeystoneSuite } from "@init/domain/coordinators/init.coordinator.ts";

export const init = new Command()
  .description("Initialize keystone-suite by cloning all repositories")
  .arguments("[path:string]")
  .action(async (_, path) => {
    const targetPath = path ?? Deno.cwd();
    await initKeystoneSuite(targetPath);
  });
