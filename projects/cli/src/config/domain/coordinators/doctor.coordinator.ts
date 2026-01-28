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
  console.log("Keystone CLI Health Check\n");
  console.log("Checking configuration and dependencies...\n");

  let hasIssues = false;
  const issues: string[] = [];

  // Check config
  const config = await getConfig();
  if (!config.repoPath) {
    console.log("[ ] Repository not configured");
    issues.push("Run 'keystone repo init' to clone the keystone-suite repositories");
    issues.push("Or run 'keystone repo bind' if you already have keystone-suite cloned");
    hasIssues = true;
  } else if (!await checkDir(config.repoPath)) {
    console.log(`[ ] Repository path not found: ${config.repoPath}`);
    issues.push("The configured repo path no longer exists");
    issues.push("Run 'keystone repo init' or 'keystone repo bind' to reconfigure");
    hasIssues = true;
  } else {
    console.log(`[x] Repository configured: ${config.repoPath}`);
  }

  // Check required dependencies
  console.log("\nRequired dependencies:");
  const deps = [
    { name: "git", purpose: "cloning repositories" },
    { name: "deno", purpose: "running projects" },
    { name: "npm", purpose: "publishing and updating CLI" },
  ];

  for (const dep of deps) {
    if (await checkCommand(dep.name)) {
      console.log(`[x] ${dep.name} - installed`);
    } else {
      console.log(`[ ] ${dep.name} - not found (needed for ${dep.purpose})`);
      issues.push(`Install ${dep.name} to enable ${dep.purpose}`);
      hasIssues = true;
    }
  }

  // Check optional dependencies
  console.log("\nOptional dependencies:");
  const optionalDeps = [
    { name: "calcurse", purpose: "planning timeline (keystone plan timeline)" },
  ];

  for (const dep of optionalDeps) {
    if (await checkCommand(dep.name)) {
      console.log(`[x] ${dep.name} - installed`);
    } else {
      console.log(`[-] ${dep.name} - not installed`);
      console.log(`    Used for: ${dep.purpose}`);
    }
  }

  console.log("\n" + "─".repeat(50));

  if (hasIssues) {
    console.log("\nIssues found:\n");
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    console.log("\nFix the issues above to ensure full functionality.");
  } else {
    console.log("\nAll checks passed! Keystone CLI is ready to use.");
  }
}
