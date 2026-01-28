const configDir = `${Deno.env.get("HOME")}/.keystone`;
const configPath = `${configDir}/config.json`;

export interface KeystoneConfig {
  repoPath?: string;
}

export async function getConfig(): Promise<KeystoneConfig> {
  try {
    const text = await Deno.readTextFile(configPath);
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function setConfig(config: KeystoneConfig): Promise<void> {
  await Deno.mkdir(configDir, { recursive: true });
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

export async function updateConfig(partial: Partial<KeystoneConfig>): Promise<void> {
  const current = await getConfig();
  await setConfig({ ...current, ...partial });
}
