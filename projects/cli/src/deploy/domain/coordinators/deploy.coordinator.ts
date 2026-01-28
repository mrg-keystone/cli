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
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone repo init");
    Deno.exit(1);
  }

  console.log("Deploy Project\n");

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
      console.error("\nMake sure the repo has a 'projects' directory with deployable projects.");
      Deno.exit(1);
    }
    selectedProject = await Select.prompt({
      message: "Which project do you want to deploy?",
      options: projects,
    });
  }

  const projectPath = `${projectsPath}/${selectedProject}`;
  const denoJsonPath = `${projectPath}/deno.json`;

  try {
    const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));
    if (!denoJson.tasks?.deploy) {
      console.error(`No 'deploy' task found in deno.json`);
      console.error(`\nFile: ${denoJsonPath}`);
      console.error("\nAdd a deploy task to the project's deno.json:");
      console.error('  "tasks": { "deploy": "your-deploy-command" }');
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

  console.log(`\nDeploying ${selectedRepo}/${selectedProject}...`);
  console.log(`Running: deno task deploy\n`);

  const command = new Deno.Command("deno", {
    args: ["task", "deploy"],
    cwd: projectPath,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error(`\nDeploy failed with exit code ${code}`);
    console.error("Check the output above for error details.");
    Deno.exit(1);
  }

  console.log(`\nDeployment of ${selectedRepo}/${selectedProject} completed successfully!`);
}
