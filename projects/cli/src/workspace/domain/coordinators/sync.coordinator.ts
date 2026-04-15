import { cloneRepo } from "@workspace/domain/data/repo-git-client.mod.ts";
import { REPOS, buildCloneRequests, extractRepoName } from "@workspace/domain/business/clone-builder.mod.ts";
import { getConfig } from "@shared/config/config.mod.ts";

async function repoExists(repoPath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(repoPath);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

export async function syncRepos(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("Keystone suite not initialized.");
    console.error("\nRun 'keystone workspace init' to get started.");
    Deno.exit(1);
  }

  console.log("Checking for missing repos...\n");

  const missingRepos: string[] = [];

  for (const repoUrl of REPOS) {
    const repoName = extractRepoName(repoUrl);
    const repoPath = `${config.repoPath}/${repoName}`;
    const exists = await repoExists(repoPath);

    if (!exists) {
      missingRepos.push(repoUrl);
      console.log(`  Missing: ${repoName}`);
    }
  }

  if (missingRepos.length === 0) {
    console.log("All repos are present. Nothing to sync.");
    return;
  }

  console.log(`\nFound ${missingRepos.length} missing repo(s). Cloning...\n`);

  const requests = buildCloneRequests(missingRepos, config.repoPath);
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
  } else {
    console.log("\nSync complete!");
  }
}
