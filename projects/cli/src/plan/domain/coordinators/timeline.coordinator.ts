import { Confirm } from "#cliffy/prompt";
import { getConfig } from "@shared/config/config.mod.ts";

async function isCalcurseInstalled(): Promise<boolean> {
  const whichCmd = Deno.build.os === "windows" ? "where" : "which";
  const command = new Deno.Command(whichCmd, {
    args: ["calcurse"],
    stdout: "null",
    stderr: "null",
  });
  const { code } = await command.output();
  return code === 0;
}

async function tryInstall(cmd: string, args: string[]): Promise<boolean> {
  const command = new Deno.Command(cmd, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await command.output();
  return code === 0;
}

async function installCalcurse(): Promise<boolean> {
  const os = Deno.build.os;

  if (os === "darwin") {
    return await tryInstall("brew", ["install", "calcurse"]);
  }

  if (os === "linux") {
    if (await tryInstall("apt", ["install", "-y", "calcurse"])) return true;
    if (await tryInstall("dnf", ["install", "-y", "calcurse"])) return true;
    if (await tryInstall("pacman", ["-S", "--noconfirm", "calcurse"])) return true;
  }

  if (os === "windows") {
    if (await tryInstall("scoop", ["install", "calcurse"])) return true;
    if (await tryInstall("choco", ["install", "calcurse", "-y"])) return true;
  }

  return false;
}

export async function openTimeline(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone repo init");
    Deno.exit(1);
  }

  if (!await isCalcurseInstalled()) {
    console.log("Calcurse is a terminal-based calendar application used for planning.");
    console.log("It is not currently installed on your system.\n");

    const confirm = await Confirm.prompt({
      message: "Would you like to install calcurse?",
      default: true,
    });

    if (!confirm) {
      console.log("\nYou can install calcurse manually:");
      console.log("  macOS:  brew install calcurse");
      console.log("  Ubuntu: apt install calcurse");
      console.log("  Arch:   pacman -S calcurse");
      Deno.exit(0);
    }

    console.log("\nInstalling calcurse...");
    const success = await installCalcurse();
    if (!success) {
      console.error("\nFailed to install calcurse automatically.");
      console.error("Please install it manually:");
      console.error("  macOS:  brew install calcurse");
      console.error("  Ubuntu: apt install calcurse");
      console.error("  Arch:   pacman -S calcurse");
      Deno.exit(1);
    }
    console.log("Calcurse installed successfully!\n");
  }

  const planningDir = `${config.repoPath}/docs/planning`;

  console.log("Opening planning timeline...");
  console.log(`Data directory: ${planningDir}\n`);

  const command = new Deno.Command("calcurse", {
    args: ["-D", planningDir],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("\nCalcurse exited with an error.");
    console.error("Make sure the planning directory exists and is accessible.");
    Deno.exit(1);
  }
}
