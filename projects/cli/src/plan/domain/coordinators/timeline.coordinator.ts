import { getConfig } from "@shared/config/config.mod.ts";
import { createApp } from "@planner/tui/app.ts";

export async function openTimeline(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone workspace init");
    Deno.exit(1);
  }

  const docsPath = `${config.repoPath}/docs`;
  const roadmapPath = `${docsPath}/roadmap`;

  // Ensure required directories exist
  try {
    await Deno.mkdir(roadmapPath, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      console.error(`Failed to create directory: ${roadmapPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }
  }

  await createApp(docsPath);
}
