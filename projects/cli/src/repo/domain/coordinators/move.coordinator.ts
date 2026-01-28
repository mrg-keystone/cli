import { getConfig, updateConfig } from "@shared/config/config.mod.ts";

export async function moveRepo(newPath: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  const targetDir = `${newPath}/keystone-suite`;

  console.log(`Moving repo from ${config.repoPath} to ${targetDir}...`);

  await Deno.rename(config.repoPath, targetDir);
  await updateConfig({ repoPath: targetDir });

  console.log(`Repo moved to ${targetDir}`);
}
