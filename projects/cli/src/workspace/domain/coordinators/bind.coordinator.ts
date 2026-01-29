import { updateConfig } from "@shared/config/config.mod.ts";

export async function bindRepo(): Promise<void> {
  const targetDir = `${Deno.cwd()}/keystone-suite`;

  console.log("Looking for keystone-suite in current directory...");

  try {
    const stat = await Deno.stat(targetDir);
    if (!stat.isDirectory) {
      console.error("'keystone-suite' exists but is not a directory.");
      Deno.exit(1);
    }
  } catch {
    console.error("No 'keystone-suite' folder found in current directory.");
    console.error(`\nLooked in: ${Deno.cwd()}`);
    console.error("\nOptions:");
    console.error("  - Navigate to the parent folder of keystone-suite and try again");
    console.error("  - Run 'keystone workspace init' to clone a fresh copy");
    Deno.exit(1);
  }

  await updateConfig({ repoPath: targetDir });

  console.log(`\nRepository bound successfully!`);
  console.log(`Path: ${targetDir}`);
  console.log("\nRun 'keystone workspace doctor' to verify your setup.");
}
