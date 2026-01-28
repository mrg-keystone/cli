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
  console.log("Installing calcurse...");

  const os = Deno.build.os;

  if (os === "darwin") {
    return await tryInstall("brew", ["install", "calcurse"]);
  }

  if (os === "linux") {
    // Try apt first (Debian/Ubuntu)
    if (await tryInstall("apt", ["install", "-y", "calcurse"])) return true;
    // Try dnf (Fedora/RHEL)
    if (await tryInstall("dnf", ["install", "-y", "calcurse"])) return true;
    // Try pacman (Arch)
    if (await tryInstall("pacman", ["-S", "--noconfirm", "calcurse"])) return true;
  }

  if (os === "windows") {
    // Try scoop
    if (await tryInstall("scoop", ["install", "calcurse"])) return true;
    // Try chocolatey
    if (await tryInstall("choco", ["install", "calcurse", "-y"])) return true;
  }

  console.error("Could not auto-install calcurse. Please install it manually.");
  return false;
}

export async function openTimeline(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  if (!await isCalcurseInstalled()) {
    const success = await installCalcurse();
    if (!success) {
      console.error("Failed to install calcurse.");
      Deno.exit(1);
    }
  }

  const planningDir = `${config.repoPath}/docs/planning`;

  const command = new Deno.Command("calcurse", {
    args: ["-D", planningDir],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Failed to open calcurse.");
    Deno.exit(1);
  }
}
