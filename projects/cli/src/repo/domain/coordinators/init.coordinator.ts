import { cloneRepo } from "@repo/domain/data/git-client.mod.ts";
import { createDirectory } from "@repo/domain/data/file-system.mod.ts";
import { REPOS, buildTargetDir, buildCloneRequests } from "@repo/domain/business/clone-builder.mod.ts";
import { getConfig, updateConfig } from "@shared/config/config.mod.ts";

export async function initKeystoneSuite(basePath: string, force: boolean): Promise<void> {
  const config = await getConfig();

  if (config.repoPath && !force) {
    console.error(`Repo already initialized at ${config.repoPath}`);
    console.error("Use 'keystone repo move <path>' to relocate it.");
    console.error("Or use 'keystone repo init -f' to force a new initialization.");
    Deno.exit(1);
  }

  const targetDir = buildTargetDir(basePath);
  await createDirectory(targetDir);

  await updateConfig({ repoPath: targetDir });
  console.log(`Saved repo path: ${targetDir}`);

  const requests = buildCloneRequests(REPOS, targetDir);

  for (const request of requests) {
    console.log(`Cloning ${request.repoName}...`);
    const result = await cloneRepo(request);
    if (!result.success) {
      console.error(`Failed to clone ${result.repoName}`);
    }
  }

  console.log("Done cloning all repos.");
}
