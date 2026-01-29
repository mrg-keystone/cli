export async function getHeadHash(repoPath: string): Promise<string> {
  const command = new Deno.Command("git", {
    args: ["rev-parse", "HEAD"],
    cwd: repoPath,
    stdout: "piped",
  });

  const output = await command.output();
  const txt = new TextDecoder().decode(output.stdout).trim();
  return txt.substring(0, 7);
}

export async function cloneRepo(url: string, dest: string): Promise<void> {
  const command = new Deno.Command("git", {
    args: ["clone", url, dest],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`Failed to clone from ${url}`);
  }
}

export async function createCommit(
  message: string,
  repoPath: string,
): Promise<void> {
  const addCmd = new Deno.Command("git", {
    args: ["add", "-A"],
    cwd: repoPath,
  });
  await addCmd.output();

  const statusCmd = new Deno.Command("git", {
    args: ["status", "--porcelain"],
    cwd: repoPath,
    stdout: "piped",
  });
  const statusOutput = await statusCmd.output();
  const hasChanges =
    new TextDecoder().decode(statusOutput.stdout).trim() !== "";

  const commitArgs = hasChanges
    ? ["commit", "-m", message]
    : ["commit", "--allow-empty", "-m", message];

  const commitCmd = new Deno.Command("git", {
    args: commitArgs,
    cwd: repoPath,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await commitCmd.output();
  if (code !== 0) {
    throw new Error(`Failed to create commit`);
  }
}
