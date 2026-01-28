import { updateConfig } from "@shared/config/config.mod.ts";

export async function bindRepo(): Promise<void> {
  const targetDir = `${Deno.cwd()}/keystone-suite`;

  try {
    const stat = await Deno.stat(targetDir);
    if (!stat.isDirectory) {
      console.error("keystone-suite exists but is not a directory.");
      Deno.exit(1);
    }
  } catch {
    console.error("No keystone-suite folder found in current directory.");
    Deno.exit(1);
  }

  await updateConfig({ repoPath: targetDir });
  console.log(`Bound repo path: ${targetDir}`);
}
