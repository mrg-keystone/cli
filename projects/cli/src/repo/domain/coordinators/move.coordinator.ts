import { Confirm } from "#cliffy/prompt";
import { getConfig, updateConfig } from "@shared/config/config.mod.ts";

export async function moveRepo(newPath: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo initialize a repo, run:");
    console.error("  keystone repo init");
    Deno.exit(1);
  }

  const targetDir = `${newPath}/keystone-suite`;

  // Check if source exists
  try {
    await Deno.stat(config.repoPath);
  } catch {
    console.error(`Source directory not found: ${config.repoPath}`);
    console.error("\nThe configured repo path no longer exists.");
    console.error("Run 'keystone repo init' or 'keystone repo bind' to set up again.");
    Deno.exit(1);
  }

  // Check if destination already exists
  try {
    await Deno.stat(targetDir);
    console.error(`Destination already exists: ${targetDir}`);
    console.error("\nPlease choose a different location or remove the existing directory.");
    Deno.exit(1);
  } catch {
    // Good - destination doesn't exist
  }

  console.log("Move keystone-suite repository\n");
  console.log(`  From: ${config.repoPath}`);
  console.log(`  To:   ${targetDir}\n`);

  const confirm = await Confirm.prompt({
    message: "Proceed with move?",
    default: true,
  });

  if (!confirm) {
    console.log("Move cancelled.");
    return;
  }

  console.log("\nMoving repository...");
  await Deno.rename(config.repoPath, targetDir);
  await updateConfig({ repoPath: targetDir });

  console.log(`\nRepository moved successfully!`);
  console.log(`New location: ${targetDir}`);
}
