import { Command } from "#cliffy/command";
import { runDev } from "@dev/domain/coordinators/dev.coordinator.ts";

export const dev = new Command()
  .description("Run local development server for a keystone project")
  .arguments("[repo:string] [project:string]")
  .example("Interactive dev server", "keystone dev")
  .example("Dev specific project", "keystone dev clients api")
  .action(async (_, repo, project) => {
    await runDev(repo, project);
  });
