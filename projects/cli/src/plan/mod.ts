import { Command } from "#cliffy/command";
import { openDoc } from "@plan/domain/coordinators/doc.coordinator.ts";
import { openReadme } from "@plan/domain/coordinators/readme.coordinator.ts";
import { openTimeline } from "@plan/domain/coordinators/timeline.coordinator.ts";
import { showQuarter } from "@plan/domain/coordinators/quarter.coordinator.ts";

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
      .description("Open project timeline planner (TUI calendar)")
      .example("Open timeline", "keystone plan timeline")
      .action(async () => {
        await openTimeline();
      })
  )
  .command(
    "quarter",
    new Command()
      .description("List projects and milestones for a quarter")
      .arguments("<quarter:number> [year:number]")
      .example("Show Q1 current year", "keystone plan quarter 1")
      .example("Show Q3 2025", "keystone plan quarter 3 2025")
      .action(async (_options: void, quarter: number, year?: number) => {
        await showQuarter(quarter, year);
      })
  );
