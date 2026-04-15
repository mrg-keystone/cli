import { getConfig } from "@shared/config/config.mod.ts";
import { Select } from "#cliffy/prompt";

async function getExternalPath(): Promise<string> {
  const config = await getConfig();
  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone workspace init");
    Deno.exit(1);
  }
  return `${config.repoPath}/external`;
}

async function getServices(externalPath: string): Promise<string[]> {
  const services: string[] = [];
  try {
    for await (const entry of Deno.readDir(externalPath)) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        const dockerfilePath = `${externalPath}/${entry.name}/Dockerfile`;
        try {
          await Deno.stat(dockerfilePath);
          services.push(entry.name);
        } catch {
          // No Dockerfile, skip
        }
      }
    }
  } catch {
    // Directory may not exist
  }
  return services.sort();
}

async function selectService(externalPath: string, service?: string): Promise<string> {
  const services = await getServices(externalPath);

  if (services.length === 0) {
    console.error("No services found in external repo.");
    console.error("\nTo add a service:");
    console.error("  1. Create a folder in external/");
    console.error("  2. Add a Dockerfile to that folder");
    Deno.exit(1);
  }

  if (service) {
    if (!services.includes(service)) {
      console.error(`Service "${service}" not found.`);
      console.error(`\nAvailable services: ${services.join(", ")}`);
      Deno.exit(1);
    }
    return service;
  }

  return await Select.prompt({
    message: "Which service?",
    options: services.map((s) => ({ name: s, value: s })),
  });
}

async function runDocker(args: string[], cwd: string): Promise<boolean> {
  const command = new Deno.Command("docker", {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  const { code } = await command.output();
  return code === 0;
}

async function getContainerStatus(name: string): Promise<string | null> {
  const command = new Deno.Command("docker", {
    args: ["ps", "-a", "--filter", `name=^${name}$`, "--format", "{{.Status}}"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout } = await command.output();
  const status = new TextDecoder().decode(stdout).trim();
  return status || null;
}

export async function listServices(): Promise<void> {
  console.log("External Services\n");

  const externalPath = await getExternalPath();
  const services = await getServices(externalPath);

  if (services.length === 0) {
    console.log("No services found.\n");
    console.log("To add a service:");
    console.log("  1. Create a folder in external/");
    console.log("  2. Add a Dockerfile to that folder");
    return;
  }

  console.log("Available services:\n");
  for (const service of services) {
    console.log(`  - ${service}`);
  }

  console.log("\n" + "─".repeat(40));
  console.log(`\n${services.length} service(s) found`);
}

export async function buildService(service?: string): Promise<void> {
  console.log("Build Service\n");

  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);
  const servicePath = `${externalPath}/${selected}`;

  console.log(`Building ${selected}...\n`);

  const success = await runDocker(["build", "-t", selected, "."], servicePath);

  console.log("\n" + "─".repeat(40));

  if (success) {
    console.log(`\n[x] Successfully built ${selected}`);
  } else {
    console.log(`\n[ ] Failed to build ${selected}`);
    console.error("\nCheck the output above for error details.");
    Deno.exit(1);
  }
}

export async function startService(service?: string, detached = true): Promise<void> {
  console.log("Start Service\n");

  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);

  // Check if already running
  const status = await getContainerStatus(selected);
  if (status?.startsWith("Up")) {
    console.log(`[x] ${selected} is already running`);
    console.log(`    Status: ${status}`);
    return;
  }

  // Remove existing stopped container if any
  if (status) {
    await runDocker(["rm", selected], externalPath);
  }

  console.log(`Starting ${selected}...\n`);

  const args = detached
    ? ["run", "-d", "--name", selected, selected]
    : ["run", "--rm", "--name", selected, selected];

  const success = await runDocker(args, externalPath);

  if (detached) {
    console.log("\n" + "─".repeat(40));
  }

  if (success) {
    if (detached) {
      console.log(`\n[x] ${selected} started in background`);
      console.log("\nUseful commands:");
      console.log(`  keystone external logs ${selected}   - view logs`);
      console.log(`  keystone external shell ${selected}  - open shell`);
      console.log(`  keystone external stop ${selected}   - stop service`);
    }
  } else {
    console.log(`\n[ ] Failed to start ${selected}`);
    console.error("\nCheck the output above for error details.");
    console.error("\nTip: Make sure you've built the service first:");
    console.error(`  keystone external build ${selected}`);
    Deno.exit(1);
  }
}

export async function stopService(service?: string): Promise<void> {
  console.log("Stop Service\n");

  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);

  const status = await getContainerStatus(selected);
  if (!status) {
    console.log(`[-] ${selected} is not running`);
    return;
  }

  console.log(`Stopping ${selected}...`);

  await runDocker(["stop", selected], externalPath);
  await runDocker(["rm", selected], externalPath);

  console.log("\n" + "─".repeat(40));
  console.log(`\n[x] ${selected} stopped`);
}

export async function restartService(service?: string): Promise<void> {
  console.log("Restart Service\n");

  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);

  console.log(`Restarting ${selected}...`);

  // Stop and remove if running
  const status = await getContainerStatus(selected);
  if (status) {
    await runDocker(["stop", selected], externalPath);
    await runDocker(["rm", selected], externalPath);
  }

  console.log("");

  const success = await runDocker(["run", "-d", "--name", selected, selected], externalPath);

  console.log("\n" + "─".repeat(40));

  if (success) {
    console.log(`\n[x] ${selected} restarted`);
  } else {
    console.log(`\n[ ] Failed to restart ${selected}`);
    console.error("\nCheck the output above for error details.");
    Deno.exit(1);
  }
}

export async function showLogs(service?: string, follow = true): Promise<void> {
  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);

  const status = await getContainerStatus(selected);
  if (!status) {
    console.error(`[ ] ${selected} is not running`);
    console.error("\nStart the service first:");
    console.error(`  keystone external start ${selected}`);
    Deno.exit(1);
  }

  if (follow) {
    console.log(`Logs for ${selected} (Ctrl+C to exit)\n`);
    console.log("─".repeat(40) + "\n");
  }

  const args = follow ? ["logs", "-f", selected] : ["logs", selected];
  await runDocker(args, externalPath);
}

export async function execShell(service?: string): Promise<void> {
  const externalPath = await getExternalPath();
  const selected = await selectService(externalPath, service);

  const status = await getContainerStatus(selected);
  if (!status?.startsWith("Up")) {
    console.error(`[ ] ${selected} is not running`);
    console.error("\nStart the service first:");
    console.error(`  keystone external start ${selected}`);
    Deno.exit(1);
  }

  console.log(`Opening shell in ${selected}...\n`);
  console.log("─".repeat(40) + "\n");

  await runDocker(["exec", "-it", selected, "/bin/sh"], externalPath);
}

export async function showStatus(): Promise<void> {
  console.log("External Services Status\n");

  const externalPath = await getExternalPath();
  const services = await getServices(externalPath);

  if (services.length === 0) {
    console.log("No services found.\n");
    console.log("To add a service:");
    console.log("  1. Create a folder in external/");
    console.log("  2. Add a Dockerfile to that folder");
    return;
  }

  let running = 0;
  let stopped = 0;

  for (const service of services) {
    const status = await getContainerStatus(service);

    if (status?.startsWith("Up")) {
      console.log(`[x] ${service}`);
      console.log(`    ${status}`);
      running++;
    } else if (status) {
      console.log(`[-] ${service}`);
      console.log(`    ${status}`);
      stopped++;
    } else {
      console.log(`[ ] ${service}`);
      console.log(`    Not started`);
      stopped++;
    }
    console.log("");
  }

  console.log("─".repeat(40));
  console.log(`\n${running} running, ${stopped} stopped`);
}
