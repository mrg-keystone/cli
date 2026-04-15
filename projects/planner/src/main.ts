import { createApp } from "./tui/app.ts";
import { ProjectStore } from "./data/projects.ts";
import { generateCalendarHTML } from "./export/html.ts";

const args = Deno.args;
const exportFlag = args.includes("--export");
const docsPath = args.find(arg => !arg.startsWith("--"));

if (!docsPath) {
  console.error("Usage: planner <docs-path> [--export]");
  console.error("");
  console.error("  docs-path    Path to keystone-suite/docs repo");
  console.error("  --export     Export HTML calendar and exit (for CI)");
  Deno.exit(1);
}

if (exportFlag) {
  // CI mode: just export HTML and exit
  const store = new ProjectStore(docsPath);
  await store.load();
  await store.ensureNotesDir();

  const startDate = new Date();
  startDate.setDate(1); // Start from first of current month
  const html = await generateCalendarHTML(store, startDate, 12);

  const outputPath = `${docsPath}/roadmap/calendar.html`;
  await Deno.writeTextFile(outputPath, html);
  console.log(`Exported calendar to: ${outputPath}`);
} else {
  // Interactive TUI mode
  await createApp(docsPath);
}
