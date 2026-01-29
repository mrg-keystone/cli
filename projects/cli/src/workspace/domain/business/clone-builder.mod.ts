import type { CloneRequest } from "@workspace/domain/data/repo-git-client.mod.ts";

export const REPOS = [
  "https://github.com/mrg-keystone/backend",
  "https://github.com/mrg-keystone/ui",
  "https://github.com/mrg-keystone/prototypes",
  "https://github.com/mrg-keystone/clients",
  "https://github.com/mrg-keystone/docs",
  "https://github.com/mrg-keystone/.github.git",
];

export function extractRepoName(url: string): string {
  return url.split("/").pop()!;
}

export function buildTargetDir(basePath: string): string {
  return `${basePath}/keystone-suite`;
}

export function buildCloneRequests(
  repos: string[],
  targetDir: string,
): CloneRequest[] {
  return repos.map((repoUrl) => ({
    repoUrl,
    repoName: extractRepoName(repoUrl),
    targetDir,
  }));
}
