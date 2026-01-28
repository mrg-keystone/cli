import { Command } from "#cliffy/command";
import { runDoctor } from "@config/domain/coordinators/doctor.coordinator.ts";
import { editConfig } from "@config/domain/coordinators/edit.coordinator.ts";

export const config = new Command()
  .description("Manage keystone CLI configuration")
  .action(function () {
    this.showHelp();
  })
  .command(
    "doctor",
    new Command()
      .description("Check setup health and dependencies")
      .example("Run health check", "keystone config doctor")
      .action(async () => {
        await runDoctor();
      })
  )
  .command(
    "edit",
    new Command()
      .description("Open config file in your editor")
      .example("Edit config", "keystone config edit")
      .action(async () => {
        await editConfig();
      })
  );
