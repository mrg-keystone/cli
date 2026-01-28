import { Command } from "#cliffy/command";
import { openDoc } from "@plan/domain/coordinators/doc.coordinator.ts";
import { openReadme } from "@plan/domain/coordinators/readme.coordinator.ts";
import { openTimeline } from "@plan/domain/coordinators/timeline.coordinator.ts";

export const plan = new Command()
  .description("Planning tools for keystone")
  .action(function () {
    this.showHelp();
  })
  .command(
    "doc",
    new Command()
      .description("View or create technical documents")
      .action(async () => {
        await openDoc();
      })
  )
  .command(
    "readme",
    new Command()
      .description("Open docs readme in your editor")
      .action(async () => {
        await openReadme();
      })
  )
  .command(
    "timeline",
    new Command()
      .description("Open planning timeline with calcurse")
      .action(async () => {
        await openTimeline();
      })
  );
