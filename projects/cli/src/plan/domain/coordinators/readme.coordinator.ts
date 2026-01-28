import { getConfig } from "@shared/config/config.mod.ts";
import { openInEditor } from "@shared/editor.mod.ts";

export async function openReadme(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone repo init");
    Deno.exit(1);
  }

  const readmePath = `${config.repoPath}/docs/README.md`;

  try {
    await Deno.stat(readmePath);
  } catch {
    console.error(`README not found at: ${readmePath}`);
    console.error("\nMake sure the docs repository has been cloned.");
    Deno.exit(1);
  }

  await openInEditor(readmePath, "docs README");
}
