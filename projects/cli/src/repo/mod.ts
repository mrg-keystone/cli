import { Command } from "#cliffy/command";
import { bindRepo } from "@repo/domain/coordinators/bind.coordinator.ts";
import { initKeystoneSuite } from "@repo/domain/coordinators/init.coordinator.ts";
import { moveRepo } from "@repo/domain/coordinators/move.coordinator.ts";

export const repo = new Command()
  .description("Manage keystone-suite repository")
  .action(function () {
    this.showHelp();
  })
  .command(
    "bind",
    new Command()
      .description("Bind existing keystone-suite in current directory to config")
      .action(async () => {
        await bindRepo();
      })
  )
  .command(
    "init",
    new Command()
      .description("Initialize keystone-suite by cloning all repositories")
      .option("-f, --force", "Force init even if already initialized")
      .arguments("[path:string]")
      .action(async ({ force }, path) => {
        const targetPath = path ?? Deno.cwd();
        await initKeystoneSuite(targetPath, force ?? false);
      })
  )
  .command(
    "move",
    new Command()
      .description("Move keystone-suite to a different location")
      .arguments("<path:string>")
      .action(async (_, path) => {
        await moveRepo(path);
      })
  );
