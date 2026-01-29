import { Select } from "#cliffy/prompt";
import { getConfig } from "@shared/config/config.mod.ts";
import { openInEditor as openFileInEditor } from "@shared/editor.mod.ts";

async function listDirs(path: string): Promise<string[]> {
  const dirs: string[] = [];
  try {
    for await (const entry of Deno.readDir(path)) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        dirs.push(entry.name);
      }
    }
  } catch {
    // Directory may not exist
  }
  return dirs.sort();
}

export async function openInEditor(repo?: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone workspace init");
    Deno.exit(1);
  }

  console.log("Open Repository in Editor\n");

  let selectedRepo = repo;
  if (!selectedRepo) {
    const repos = await listDirs(config.repoPath);
    if (repos.length === 0) {
      console.error("No repos found in keystone-suite.");
      console.error(`Looked in: ${config.repoPath}`);
      Deno.exit(1);
    }
    selectedRepo = await Select.prompt({
      message: "Which repo do you want to open?",
      options: repos,
    });
  }

  const repoPath = `${config.repoPath}/${selectedRepo}`;

  try {
    await Deno.stat(repoPath);
  } catch {
    console.error(`Repo not found: ${selectedRepo}`);
    console.error(`Looked in: ${repoPath}`);
    Deno.exit(1);
  }

  await openFileInEditor(repoPath, `${selectedRepo} repository`);
}
