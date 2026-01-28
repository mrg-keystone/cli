import { Select } from "#cliffy/prompt";
import { getConfig } from "@shared/config/config.mod.ts";

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

function getEditorCommand(): { cmd: string; args: string[] } {
  const editor = Deno.env.get("EDITOR");
  if (editor) {
    return { cmd: editor, args: [] };
  }

  const os = Deno.build.os;
  if (os === "darwin") return { cmd: "open", args: [] };
  if (os === "linux") return { cmd: "xdg-open", args: [] };
  if (os === "windows") return { cmd: "cmd", args: ["/c", "start"] };

  return { cmd: "code", args: [] };
}

export async function openInEditor(repo?: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  let selectedRepo = repo;
  if (!selectedRepo) {
    const repos = await listDirs(config.repoPath);
    if (repos.length === 0) {
      console.error("No repos found in keystone-suite.");
      Deno.exit(1);
    }
    selectedRepo = await Select.prompt({
      message: "Select a repo",
      options: repos,
    });
  }

  const repoPath = `${config.repoPath}/${selectedRepo}`;

  try {
    await Deno.stat(repoPath);
  } catch {
    console.error(`Repo not found: ${selectedRepo}`);
    Deno.exit(1);
  }

  const { cmd, args } = getEditorCommand();

  console.log(`Opening ${selectedRepo} in editor...`);

  const command = new Deno.Command(cmd, {
    args: [...args, repoPath],
    stdout: "inherit",
    stderr: "inherit",
  });

  await command.output();
}

export async function runDev(repo?: string, project?: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  // Select repo
  let selectedRepo = repo;
  if (!selectedRepo) {
    const repos = await listDirs(config.repoPath);
    if (repos.length === 0) {
      console.error("No repos found in keystone-suite.");
      Deno.exit(1);
    }
    selectedRepo = await Select.prompt({
      message: "Select a repo",
      options: repos,
    });
  }

  const repoPath = `${config.repoPath}/${selectedRepo}`;
  const projectsPath = `${repoPath}/projects`;

  // Select project
  let selectedProject = project;
  if (!selectedProject) {
    const projects = await listDirs(projectsPath);
    if (projects.length === 0) {
      console.error(`No projects found in ${selectedRepo}/projects.`);
      Deno.exit(1);
    }
    selectedProject = await Select.prompt({
      message: "Select a project",
      options: projects,
    });
  }

  const projectPath = `${projectsPath}/${selectedProject}`;
  const denoJsonPath = `${projectPath}/deno.json`;

  try {
    const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));
    if (!denoJson.tasks?.serve) {
      console.error(`No serve task found in ${selectedRepo}/projects/${selectedProject}/deno.json`);
      Deno.exit(1);
    }
  } catch {
    console.error(`No deno.json found in ${selectedRepo}/projects/${selectedProject}`);
    Deno.exit(1);
  }

  console.log(`Starting ${selectedRepo}/${selectedProject}...`);

  const command = new Deno.Command("deno", {
    args: ["task", "serve"],
    cwd: projectPath,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Dev server exited with error.");
    Deno.exit(1);
  }
}
