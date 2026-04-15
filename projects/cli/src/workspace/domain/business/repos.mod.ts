export const repos = new Map<string, string>([
  ["cli", "https://github.com/mrg-keystone/cli"],
  ["backend", "https://github.com/mrg-keystone/backend"],
  ["ui", "https://github.com/mrg-keystone/ui"],
  ["playground", "https://github.com/mrg-keystone/playground"],
  ["external", "https://github.com/mrg-keystone/external"],
]);

export function getRepoUrl(alias: string): string {
  const url = repos.get(alias);
  if (!url) {
    throw new Error(`Unknown repo alias: ${alias}`);
  }
  return url;
}

export function getRepoAliases(): string[] {
  return Array.from(repos.keys());
}

export function buildSnapshotPath(rootPath: string): string {
  return `${rootPath}/snapshot`;
}

export function buildWorkspacePaths(workspaces: string[]): string[] {
  return workspaces.map((path) => `snapshot/${path}`);
}

export function buildCommitMessage(repoName: string, hash: string, label: string): string {
  return `[${repoName} ${hash}] ${label}`;
}
