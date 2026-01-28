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

export async function updateCli(): Promise<void> {
  const version = await getLatestVersion();
  if (version) {
    console.log(`Updating Keystone CLI to v${version}...`);
  } else {
    console.log("Updating Keystone CLI...");
  }

  const command = new Deno.Command("npm", {
    args: ["install", "-g", "@mrg-keystone/cli@latest"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Failed to update CLI");
    Deno.exit(1);
  }

  console.log("Keystone CLI updated successfully!");
}
