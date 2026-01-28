import { Command } from "#cliffy/command";
import { openDoc } from "@plan/domain/coordinators/doc.coordinator.ts";
import { openReadme } from "@plan/domain/coordinators/readme.coordinator.ts";
import { openTimeline } from "@plan/domain/coordinators/timeline.coordinator.ts";

export const plan = new Command()
  .description("Planning and documentation tools")
  .action(function () {
    this.showHelp();
  })
  .command(
    "doc",
    new Command()
      .description("View or create technical documents")
      .example("Browse docs", "keystone plan doc")
      .action(async () => {
        await openDoc();
      })
  )
  .command(
    "readme",
    new Command()
      .description("Open the main docs README in your editor")
      .example("Open readme", "keystone plan readme")
      .action(async () => {
        await openReadme();
      })
  )
  .command(
    "timeline",
    new Command()
      .description("Open planning timeline with calcurse (terminal calendar)")
      .example("Open timeline", "keystone plan timeline")
      .action(async () => {
        await openTimeline();
      })
  );
