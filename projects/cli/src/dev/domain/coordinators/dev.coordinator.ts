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

export async function runDev(repo?: string, project?: string): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone workspace init");
    Deno.exit(1);
  }

  console.log("Start Development Server\n");

  // Select repo
  let selectedRepo = repo;
  if (!selectedRepo) {
    const repos = await listDirs(config.repoPath);
    if (repos.length === 0) {
      console.error("No repos found in keystone-suite.");
      console.error(`Looked in: ${config.repoPath}`);
      Deno.exit(1);
    }
    selectedRepo = await Select.prompt({
      message: "Which repo contains the project?",
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
      console.error("\nMake sure the repo has a 'projects' directory.");
      Deno.exit(1);
    }
    selectedProject = await Select.prompt({
      message: "Which project do you want to run?",
      options: projects,
    });
  }

  const projectPath = `${projectsPath}/${selectedProject}`;
  const denoJsonPath = `${projectPath}/deno.json`;

  try {
    const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));
    if (!denoJson.tasks?.serve) {
      console.error(`No 'serve' task found in deno.json`);
      console.error(`\nFile: ${denoJsonPath}`);
      console.error("\nAdd a serve task to the project's deno.json:");
      console.error('  "tasks": { "serve": "your-dev-server-command" }');
      Deno.exit(1);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      console.error(`No deno.json found in ${selectedRepo}/projects/${selectedProject}`);
      console.error("\nMake sure this is a valid Deno project.");
    } else {
      console.error(`Error reading deno.json: ${e}`);
    }
    Deno.exit(1);
  }

  console.log(`Starting ${selectedRepo}/${selectedProject}...`);
  console.log(`Running: deno task serve\n`);

  const command = new Deno.Command("deno", {
    args: ["task", "serve"],
    cwd: projectPath,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error(`\nDev server exited with code ${code}`);
    console.error("Check the output above for error details.");
    Deno.exit(1);
  }

  console.log("\nDev server stopped.");
}
