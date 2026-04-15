import { Command } from "#cliffy/command";
import { initKeystoneSuite } from "@workspace/domain/coordinators/init.coordinator.ts";
import { bindRepo } from "@workspace/domain/coordinators/bind.coordinator.ts";
import { moveRepo } from "@workspace/domain/coordinators/move.coordinator.ts";
import { snapshotRepo } from "@workspace/domain/coordinators/prototype.coordinator.ts";
import { runDoctor } from "@workspace/domain/coordinators/doctor.coordinator.ts";
import { editConfig } from "@workspace/domain/coordinators/config.coordinator.ts";
import { syncRepos } from "@workspace/domain/coordinators/sync.coordinator.ts";
import { getRepoAliases } from "@workspace/domain/business/repos.mod.ts";

const aliases = getRepoAliases();

export const workspace = new Command()
  .description("Manage keystone workspace setup and configuration")
  .action(function () {
    this.showHelp();
  })
  .command(
    "init",
    new Command()
      .description("Initialize keystone-suite by cloning all repositories")
      .option("-f, --force", "Force init even if already initialized")
      .arguments("[path:string]")
      .example("Init in current directory", "keystone workspace init")
      .example("Init in specific path", "keystone workspace init ~/projects")
      .example("Force re-init", "keystone workspace init -f")
      .action(async ({ force }, path) => {
        const targetPath = path ?? Deno.cwd();
        await initKeystoneSuite(targetPath, force ?? false);
      })
  )
  .command(
    "bind",
    new Command()
      .description("Bind existing keystone-suite in current directory to config")
      .example("Bind current directory", "keystone workspace bind")
      .action(async () => {
        await bindRepo();
      })
  )
  .command(
    "move",
    new Command()
      .description("Move keystone-suite to a different location")
      .arguments("<path:string>")
      .example("Move to new location", "keystone workspace move ~/new-location")
      .action(async (_, path) => {
        await moveRepo(path);
      })
  )
  .command(
    "prototype",
    new Command()
      .description("Snapshot a keystone repo into the prototype workspace")
      .arguments("<repo:string> <label:string>")
      .example("Snapshot CLI", "keystone workspace prototype cli 'initial snapshot'")
      .example("Snapshot backend", "keystone workspace prototype backend 'add auth feature'")
      .action(async (_, repo, label) => {
        if (!aliases.includes(repo)) {
          console.error(`Unknown repo: ${repo}`);
          console.error(`\nAvailable repos: ${aliases.join(", ")}`);
          console.error("\nUsage: keystone workspace prototype <repo> <label>");
          Deno.exit(1);
        }
        await snapshotRepo(repo, label);
      })
  )
  .command(
    "doctor",
    new Command()
      .description("Check setup health and dependencies")
      .example("Run health check", "keystone workspace doctor")
      .action(async () => {
        await runDoctor();
      })
  )
  .command(
    "config",
    new Command()
      .description("Open config file in your editor")
      .example("Edit config", "keystone workspace config")
      .action(async () => {
        await editConfig();
      })
  )
  .command(
    "sync",
    new Command()
      .description("Clone any missing repos from the keystone suite")
      .example("Sync repos", "keystone workspace sync")
      .action(async () => {
        await syncRepos();
      })
  );
