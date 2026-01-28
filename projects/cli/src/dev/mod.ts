import { Command } from "#cliffy/command";
import { openInEditor, runDev } from "@dev/domain/coordinators/dev.coordinator.ts";

export const dev = new Command()
  .description("Run local development server or open repo in editor")
  .option("-o, --open", "Open repo in editor instead of running serve")
  .arguments("[repo:string] [project:string]")
  .example("Interactive dev server", "keystone dev")
  .example("Dev specific project", "keystone dev clients api")
  .example("Open repo in editor", "keystone dev --open")
  .example("Open specific repo", "keystone dev backend --open")
  .action(async ({ open }, repo, project) => {
    if (open) {
      await openInEditor(repo);
    } else {
      await runDev(repo, project);
    }
  });
