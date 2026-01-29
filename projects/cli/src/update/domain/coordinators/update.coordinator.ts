import { getConfig } from "@shared/config/config.mod.ts";

type Shell = "zsh" | "bash" | "fish";

function getCompletionPath(shell: Shell): string {
  const home = Deno.env.get("HOME")!;
  switch (shell) {
    case "zsh":
      return `${home}/.zsh/completions/_keystone`;
    case "bash":
      return `${home}/.local/share/bash-completion/completions/keystone`;
    case "fish":
      return `${home}/.config/fish/completions/keystone.fish`;
  }
}

async function updateCompletions(): Promise<void> {
  const config = await getConfig();
  if (!config.completions) return;

  const shells = Object.entries(config.completions)
    .filter(([_, installed]) => installed)
    .map(([shell]) => shell as Shell);

  if (shells.length === 0) return;

  console.log("\nUpdating shell completions...");

  for (const shell of shells) {
    const command = new Deno.Command("keystone", {
      args: ["completions", shell],
      stdout: "piped",
      stderr: "piped",
      env: { ...Deno.env.toObject(), NO_COLOR: "1" },
    });

    const { code, stdout } = await command.output();
    if (code !== 0) {
      console.log(`  ${shell}: failed to generate`);
      continue;
    }

    let script = new TextDecoder().decode(stdout);
    // Patch to disable colors and suppress errors - 2>/dev/null must be at END
    script = script.replace(
      /keystone completions complete "\$\{action\}" "\$\{@\}"/g,
      'NO_COLOR=1 keystone completions complete "${action}" "${@}" 2>/dev/null',
    );

    const completionPath = getCompletionPath(shell);
    try {
      await Deno.writeTextFile(completionPath, script);
      console.log(`  ${shell}: updated`);
    } catch {
      console.log(`  ${shell}: failed to write`);
    }
  }
}

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

  await updateCompletions();
}
