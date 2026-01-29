export interface CloneRequest {
  repoUrl: string;
  repoName: string;
  targetDir: string;
}

export interface CloneResult {
  repoName: string;
  success: boolean;
}

export async function cloneRepo(request: CloneRequest): Promise<CloneResult> {
  const command = new Deno.Command("git", {
    args: ["clone", request.repoUrl],
    cwd: request.targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();
  return { repoName: request.repoName, success: code === 0 };
}
