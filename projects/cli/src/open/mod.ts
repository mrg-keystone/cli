import { Command } from "#cliffy/command";
import { openInEditor } from "@open/domain/coordinators/open.coordinator.ts";

export const open = new Command()
  .description("Open a keystone repo in your editor")
  .arguments("[repo:string]")
  .example("Interactive selection", "keystone open")
  .example("Open specific repo", "keystone open backend")
  .action(async (_, repo) => {
    await openInEditor(repo);
  });
