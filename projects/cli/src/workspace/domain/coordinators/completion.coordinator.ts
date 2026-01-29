import {
  getConfig,
  updateConfig,
} from "@shared/config/config.mod.ts";

type Shell = "zsh" | "bash" | "fish";

function detectShell(): Shell | null {
  // Check for shell-specific version variables (set by the running shell)
  if (Deno.env.get("ZSH_VERSION")) return "zsh";
  if (Deno.env.get("BASH_VERSION")) return "bash";
  if (Deno.env.get("FISH_VERSION")) return "fish";

  // Fallback to $SHELL (default login shell)
  const shellPath = Deno.env.get("SHELL");
  if (!shellPath) return null;

  const shellName = shellPath.split("/").pop();
  if (shellName === "zsh" || shellName === "bash" || shellName === "fish") {
    return shellName;
  }
  return null;
}

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

async function generateCompletions(shell: Shell): Promise<string> {
  const command = new Deno.Command("keystone", {
    args: ["completions", shell],
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), NO_COLOR: "1" },
  });

  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to generate completions: ${errorText}`);
  }

  let script = new TextDecoder().decode(stdout);

  // Patch the script to disable colors and suppress errors when calling completions complete
  // This prevents ANSI codes from breaking zsh completion parsing
  // The 2>/dev/null must be at the END of the command, after all arguments
  script = script.replace(
    /keystone completions complete "\$\{action\}" "\$\{@\}"/g,
    'NO_COLOR=1 keystone completions complete "${action}" "${@}" 2>/dev/null',
  );

  return script;
}

function getPostInstallInstructions(shell: Shell): string {
  switch (shell) {
    case "zsh":
      return `Add the following to your ~/.zshrc if not already present:

  fpath=(~/.zsh/completions $fpath)
  autoload -Uz compinit && compinit

Then restart your shell or run: source ~/.zshrc`;
    case "bash":
      return `Restart your shell or run: source ~/.bashrc`;
    case "fish":
      return `Restart your shell for completions to take effect.`;
  }
}

interface InstallOptions {
  force?: boolean;
  silent?: boolean;
}

export async function installCompletion(options: InstallOptions = {}): Promise<void> {
  if (!options.silent) {
    console.log("Shell Completions\n");
  }

  const shell = detectShell();
  if (!shell) {
    if (!options.silent) {
      console.error("Could not detect shell. Supported shells: zsh, bash, fish");
      console.error("Make sure you're running this from zsh, bash, or fish.");
    }
    return;
  }

  if (!options.silent) {
    console.log(`Detected shell: ${shell}`);
  }

  const config = await getConfig();
  if (config.completions?.[shell] && !options.force) {
    if (!options.silent) {
      console.log(`\nCompletions already installed for ${shell}.`);
      console.log("Use --force to reinstall.");
    }
    return;
  }

  if (!options.silent) {
    console.log("Generating completions...");
  }
  let completionScript: string;
  try {
    completionScript = await generateCompletions(shell);
  } catch (error) {
    if (!options.silent) {
      console.error(`\nFailed to generate completions: ${error}`);
    }
    return;
  }

  const completionPath = getCompletionPath(shell);
  const completionDir = completionPath.substring(0, completionPath.lastIndexOf("/"));

  if (!options.silent) {
    console.log(`Installing to ${completionPath}...`);
  }
  try {
    await Deno.mkdir(completionDir, { recursive: true });
    await Deno.writeTextFile(completionPath, completionScript);
  } catch (error) {
    if (!options.silent) {
      console.error(`\nFailed to write completion file: ${error}`);
    }
    return;
  }

  await updateConfig({
    completions: {
      ...config.completions,
      [shell]: true,
    },
  });

  console.log(`Completions installed for ${shell}.`);
  if (!options.silent) {
    console.log(`\n${getPostInstallInstructions(shell)}`);
  }
}
