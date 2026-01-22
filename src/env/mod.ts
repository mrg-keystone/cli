import { Command } from "#cliffy/command";
import { Confirm } from "#cliffy/prompt";
import { setupEnvironment } from "@env/domain/business/coordinators/setup.coordinator.ts";
import { pullEnvironment } from "@env/domain/business/coordinators/pull.coordinator.ts";
import { listEnvironments } from "@env/domain/business/coordinators/list.coordinator.ts";

export const env = new Command()
  .description("Manage environments")
  .command("setup", new Command()
    .arguments("<envId:number> <key:string> <envName:string>")
    .description("Setup environment and save config")
    .action(async (_, envId, key, envName) => {
      await setupEnvironment(envId, key, envName);
    }))
  .command("pull", new Command()
    .arguments("<envName:string>")
    .description("Pull variables and save to .env file")
    .action(async (_, envName) => {
      let result = await pullEnvironment(envName);

      if (result.fileExists && !result.written) {
        const confirm = await Confirm.prompt(".env already exists. Overwrite?");
        if (confirm) {
          result = await pullEnvironment(envName, true);
        } else {
          console.log("Aborted.");
          return;
        }
      }

      console.log("Saved .env file");
    }))
  .command("list", new Command()
    .description("List configured environments")
    .action(async () => {
      await listEnvironments();
    }));
