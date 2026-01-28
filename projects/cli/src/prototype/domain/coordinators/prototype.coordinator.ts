import {
  getRepoUrl,
  buildSnapshotPath,
  buildWorkspacePaths,
  buildCommitMessage,
} from "@prototype/domain/business/repos.mod.ts";
import {
  getHeadHash,
  cloneRepo,
  createCommit,
} from "@prototype/domain/data/git-client.mod.ts";
import {
  findPrototypeRoot,
  readDenoJson,
  writeDenoJson,
  removeDirectory,
} from "@prototype/domain/data/file-system.mod.ts";

export async function snapshotRepo(
  alias: string,
  label: string,
): Promise<void> {
  const prototypeRoot = await findPrototypeRoot();
  if (!prototypeRoot) {
    throw new Error(
      "To use this command, you must be in the keystone-prototypes directory",
    );
  }

  const url = getRepoUrl(alias);
  const snapshotPath = buildSnapshotPath(prototypeRoot);

  // Clone the repo
  console.log(`Cloning ${alias}...`);
  await removeDirectory(snapshotPath);
  await cloneRepo(url, snapshotPath);

  // Get the head hash before removing .git
  const hash = await getHeadHash(snapshotPath);

  // Remove .git directory
  await removeDirectory(`${snapshotPath}/.git`);

  // Get workspaces from cloned repo and update prototype's deno.json
  const snapshotDenoJson = await readDenoJson(snapshotPath);
  const snapshotWorkspaces = (snapshotDenoJson.workspace as string[]) ?? [];
  const workspaces = buildWorkspacePaths(snapshotWorkspaces);

  const prototypeDenoJson = await readDenoJson(prototypeRoot);
  prototypeDenoJson.workspace = workspaces;
  prototypeDenoJson.imports = snapshotDenoJson.imports;
  await writeDenoJson(prototypeRoot, prototypeDenoJson);

  // Create commit
  const message = buildCommitMessage(alias, hash, label);
  // Clean up src directory after commit
  const srcPath = `${prototypeRoot}/src`;
  await removeDirectory(srcPath, "replace");
  console.log("Cleaned src directory");
  await Deno.remove(`${snapshotPath}/deno.json`);

  await createCommit(message, prototypeRoot);
  console.log(`Snapshot complete: ${alias} @ ${hash}`);
}
