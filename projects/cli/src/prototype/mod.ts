import { Command } from "#cliffy/command";
import { snapshotRepo } from "@prototype/domain/coordinators/prototype.coordinator.ts";
import { getRepoAliases } from "@prototype/domain/business/repos.mod.ts";

const aliases = getRepoAliases();

export const prototype = new Command()
  .description("Snapshot a keystone repo into the prototype workspace")
  .arguments("<repo:string> <label:string>")
  .example("Snapshot CLI", "keystone prototype cli 'initial snapshot'")
  .example("Snapshot backend", "keystone prototype backend 'add auth feature'")
  .action(async (_, repo, label) => {
    if (!aliases.includes(repo)) {
      console.error(`Unknown repo: ${repo}`);
      console.error(`\nAvailable repos: ${aliases.join(", ")}`);
      console.error("\nUsage: keystone prototype <repo> <label>");
      Deno.exit(1);
    }
    await snapshotRepo(repo, label);
  });
