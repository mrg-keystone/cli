import { cloneRepo } from "@workspace/domain/data/repo-git-client.mod.ts";
import { REPOS, buildTargetDir, buildCloneRequests } from "@workspace/domain/business/clone-builder.mod.ts";
import { getConfig, updateConfig } from "@shared/config/config.mod.ts";
import { installCompletion } from "@workspace/domain/coordinators/completion.coordinator.ts";

async function createDirectory(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}

export async function initKeystoneSuite(basePath: string, force: boolean): Promise<void> {
  const config = await getConfig();

  if (config.repoPath && !force) {
    console.error(`Repo already initialized at ${config.repoPath}`);
    console.error("\nOptions:");
    console.error("  - Use 'keystone workspace move <path>' to relocate it");
    console.error("  - Use 'keystone workspace init -f' to force a new initialization");
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

  // Install shell completions
  console.log("\n--- Shell Completions ---");
  await installCompletion({ silent: true });

  console.log("\nNext steps:");
  console.log("  - Run 'keystone workspace doctor' to verify your setup");
  console.log("  - Run 'keystone open' to open a repo in your editor");
}
