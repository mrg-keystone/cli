import { cloneRepo } from "@repo/domain/data/git-client.mod.ts";
import { createDirectory } from "@repo/domain/data/file-system.mod.ts";
import { REPOS, buildTargetDir, buildCloneRequests } from "@repo/domain/business/clone-builder.mod.ts";
import { getConfig, updateConfig } from "@shared/config/config.mod.ts";

export async function initKeystoneSuite(basePath: string, force: boolean): Promise<void> {
  const config = await getConfig();

  if (config.repoPath && !force) {
    console.error(`Repo already initialized at ${config.repoPath}`);
    console.error("\nOptions:");
    console.error("  - Use 'keystone repo move <path>' to relocate it");
    console.error("  - Use 'keystone repo init -f' to force a new initialization");
    Deno.exit(1);
  }

  const targetDir = buildTargetDir(basePath);

  console.log("Initializing keystone-suite...");
  console.log(`Target directory: ${targetDir}\n`);

  await createDirectory(targetDir);
  await updateConfig({ repoPath: targetDir });

  const requests = buildCloneRequests(REPOS, targetDir);
  let succeeded = 0;
  let failed = 0;
  const failedRepos: string[] = [];

  for (const request of requests) {
    console.log(`Cloning ${request.repoName}...`);
    const result = await cloneRepo(request);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
      failedRepos.push(request.repoName);
      console.error(`  Failed to clone ${result.repoName}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Successfully cloned: ${succeeded}/${requests.length} repos`);

  if (failed > 0) {
    console.error(`Failed to clone: ${failedRepos.join(", ")}`);
    console.error("\nSome repos failed to clone. You may need to clone them manually.");
  } else {
    console.log("\nAll repos cloned successfully!");
  }

  console.log(`\nRepo path saved to config: ${targetDir}`);
  console.log("\nNext steps:");
  console.log("  - Run 'keystone config doctor' to verify your setup");
  console.log("  - Run 'keystone dev --open' to open a repo in your editor");
}
