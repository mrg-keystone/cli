import { Command } from "#cliffy/command";
import { openInEditor, runDev } from "@dev/domain/coordinators/dev.coordinator.ts";

export const dev = new Command()
  .description("Run local development server for a project")
  .option("-o, --open", "Open repo in editor instead of running serve")
  .arguments("[repo:string] [project:string]")
  .action(async ({ open }, repo, project) => {
    if (open) {
      await openInEditor(repo);
    } else {
      await runDev(repo, project);
    }
  });
