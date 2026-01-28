import { Command } from "#cliffy/command";
import { Confirm } from "#cliffy/prompt";
import { setupEnvironment } from "@env/domain/business/coordinators/setup.coordinator.ts";
import { pullEnvironment } from "@env/domain/business/coordinators/pull.coordinator.ts";
import { listEnvironments } from "@env/domain/business/coordinators/list.coordinator.ts";

export const env = new Command()
  .description("Manage environment variables from envault")
  .action(function () {
    this.showHelp();
  })
  .command("setup", new Command()
    .arguments("<envId:number> <key:string> <envName:string>")
    .description("Setup environment and save config")
    .example("Setup production", "keystone env setup 123 abc123key production")
    .example("Setup staging", "keystone env setup 456 def456key staging")
    .action(async (_, envId, key, envName) => {
      await setupEnvironment(envId, key, envName);
    }))
  .command("pull", new Command()
    .arguments("<envName:string>")
    .description("Pull variables and save to .env file")
    .example("Pull production", "keystone env pull production")
    .action(async (_, envName) => {
      console.log(`Pulling environment variables for "${envName}"...`);
      let result = await pullEnvironment(envName);

      if (result.fileExists && !result.written) {
        const confirm = await Confirm.prompt({
          message: ".env already exists. Overwrite?",
          hint: "Your existing .env file will be replaced with the pulled variables.",
        });
        if (confirm) {
          result = await pullEnvironment(envName, true);
        } else {
          console.log("Aborted. Your existing .env file was not modified.");
          return;
        }
      }

      console.log(`Saved ${result.variableCount} variables to ${result.path}`);
    }))
  .command("list", new Command()
    .description("List configured environments")
    .example("List all", "keystone env list")
    .action(async () => {
      await listEnvironments();
    }));
