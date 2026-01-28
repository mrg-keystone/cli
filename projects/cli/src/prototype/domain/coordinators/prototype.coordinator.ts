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
    console.error("This command must be run from within the keystone-prototypes directory.");
    console.error("\nMake sure you're in the prototypes repo or one of its subdirectories.");
    Deno.exit(1);
  }

  console.log(`Creating snapshot of ${alias}...\n`);

  const url = getRepoUrl(alias);
  const snapshotPath = buildSnapshotPath(prototypeRoot);

  // Step 1: Clone the repo
  console.log("Step 1/4: Cloning repository...");
  await removeDirectory(snapshotPath);
  await cloneRepo(url, snapshotPath);

  // Step 2: Get commit hash
  console.log("Step 2/4: Recording commit hash...");
  const hash = await getHeadHash(snapshotPath);

  // Step 3: Clean up and prepare workspace
  console.log("Step 3/4: Preparing workspace...");
  await removeDirectory(`${snapshotPath}/.git`);

  const snapshotDenoJson = await readDenoJson(snapshotPath);
  const snapshotWorkspaces = (snapshotDenoJson.workspace as string[]) ?? [];
  const workspaces = buildWorkspacePaths(snapshotWorkspaces);

  const prototypeDenoJson = await readDenoJson(prototypeRoot);
  prototypeDenoJson.workspace = workspaces;
  prototypeDenoJson.imports = snapshotDenoJson.imports;
  await writeDenoJson(prototypeRoot, prototypeDenoJson);

  // Step 4: Create commit
  console.log("Step 4/4: Creating commit...");
  const message = buildCommitMessage(alias, hash, label);
  const srcPath = `${prototypeRoot}/src`;
  await removeDirectory(srcPath, "replace");
  await Deno.remove(`${snapshotPath}/deno.json`);
  await createCommit(message, prototypeRoot);

  console.log("\n" + "─".repeat(50));
  console.log(`\nSnapshot complete!`);
  console.log(`  Repo:   ${alias}`);
  console.log(`  Commit: ${hash}`);
  console.log(`  Label:  ${label}`);
}
