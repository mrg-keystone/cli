async function getLatestVersion(): Promise<string | null> {
  const command = new Deno.Command("npm", {
    args: ["view", "@mrg-keystone/cli", "version"],
    stdout: "piped",
    stderr: "null",
  });

  const { code, stdout } = await command.output();
  if (code !== 0) return null;

  return new TextDecoder().decode(stdout).trim();
}

async function getCurrentVersion(): Promise<string | null> {
  const command = new Deno.Command("npm", {
    args: ["list", "-g", "@mrg-keystone/cli", "--json"],
    stdout: "piped",
    stderr: "null",
  });

  const { code, stdout } = await command.output();
  if (code !== 0) return null;

  try {
    const json = JSON.parse(new TextDecoder().decode(stdout));
    return json.dependencies?.["@mrg-keystone/cli"]?.version ?? null;
  } catch {
    return null;
  }
}

export async function updateCli(): Promise<void> {
  console.log("Keystone CLI Update\n");

  console.log("Checking versions...");
  const [currentVersion, latestVersion] = await Promise.all([
    getCurrentVersion(),
    getLatestVersion(),
  ]);

  if (currentVersion) {
    console.log(`  Current version: v${currentVersion}`);
  } else {
    console.log("  Current version: unknown");
  }

  if (latestVersion) {
    console.log(`  Latest version:  v${latestVersion}`);
  } else {
    console.log("  Latest version:  unable to fetch");
  }

  if (currentVersion && latestVersion && currentVersion === latestVersion) {
    console.log("\nYou already have the latest version!");
    return;
  }

  console.log("\nUpdating...");

  const command = new Deno.Command("npm", {
    args: ["install", "-g", "@mrg-keystone/cli@latest"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("\nFailed to update CLI.");
    console.error("Try running manually: npm install -g @mrg-keystone/cli@latest");
    Deno.exit(1);
  }

  console.log("\nKeystone CLI updated successfully!");
  if (latestVersion) {
    console.log(`Now running v${latestVersion}`);
  }
}
