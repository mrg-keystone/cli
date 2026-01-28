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

export async function deploy(repo?: string, project?: string): Promise<void> {
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
    if (!denoJson.tasks?.deploy) {
      console.error(`No deploy task found in ${selectedRepo}/projects/${selectedProject}/deno.json`);
      Deno.exit(1);
    }
  } catch {
    console.error(`No deno.json found in ${selectedRepo}/projects/${selectedProject}`);
    Deno.exit(1);
  }

  console.log(`Deploying ${selectedRepo}/${selectedProject}...`);

  const command = new Deno.Command("deno", {
    args: ["task", "deploy"],
    cwd: projectPath,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Deploy failed.");
    Deno.exit(1);
  }
}
