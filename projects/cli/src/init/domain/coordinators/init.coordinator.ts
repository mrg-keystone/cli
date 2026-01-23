import { cloneRepo } from "@init/domain/data/git-client.mod.ts";
import { createDirectory } from "@init/domain/data/file-system.mod.ts";
import { REPOS, buildTargetDir, buildCloneRequests } from "@init/domain/business/clone-builder.mod.ts";

export async function initKeystoneSuite(basePath: string): Promise<void> {
  const targetDir = buildTargetDir(basePath);
  await createDirectory(targetDir);

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
