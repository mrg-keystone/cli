import { getConfig } from "@shared/config/config.mod.ts";

async function checkCommand(cmd: string): Promise<boolean> {
  const whichCmd = Deno.build.os === "windows" ? "where" : "which";
  const command = new Deno.Command(whichCmd, {
    args: [cmd],
    stdout: "null",
    stderr: "null",
  });
  const { code } = await command.output();
  return code === 0;
}

async function checkDir(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

export async function runDoctor(): Promise<void> {
  console.log("Running health checks...\n");

  let hasIssues = false;

  // Check config
  const config = await getConfig();
  if (!config.repoPath) {
    console.log("[ ] Repo not bound - run 'keystone repo init' or 'keystone repo bind'");
    hasIssues = true;
  } else if (!await checkDir(config.repoPath)) {
    console.log(`[ ] Repo path does not exist: ${config.repoPath}`);
    hasIssues = true;
  } else {
    console.log(`[x] Repo bound: ${config.repoPath}`);
  }

  // Check dependencies
  const deps = ["git", "deno", "npm"];
  for (const dep of deps) {
    if (await checkCommand(dep)) {
      console.log(`[x] ${dep} installed`);
    } else {
      console.log(`[ ] ${dep} not found`);
      hasIssues = true;
    }
  }

  // Check optional deps
  const optionalDeps = ["calcurse"];
  for (const dep of optionalDeps) {
    if (await checkCommand(dep)) {
      console.log(`[x] ${dep} installed (optional)`);
    } else {
      console.log(`[-] ${dep} not installed (optional)`);
    }
  }

  console.log("");
  if (hasIssues) {
    console.log("Some issues found. Address them to ensure full functionality.");
  } else {
    console.log("All checks passed!");
  }
}
