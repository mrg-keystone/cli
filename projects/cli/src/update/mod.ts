import { Command } from "#cliffy/command";
import { updateCli } from "@update/domain/coordinators/update.coordinator.ts";

export const update = new Command()
  .description("Update the Keystone CLI to the latest version")
  .example("Update CLI", "keystone update")
  .action(async () => {
    await updateCli();
  });
