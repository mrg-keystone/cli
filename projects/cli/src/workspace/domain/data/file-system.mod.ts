export async function findPrototypeRoot(
  startDir: string = Deno.cwd(),
): Promise<string | null> {
  let dir = startDir;

  while (true) {
    const denoJsonPath = `${dir}/deno.json`;
    try {
      const content = await Deno.readTextFile(denoJsonPath);
      const json = JSON.parse(content);
      if (json.name === "@keystone/prototype") {
        return dir;
      }
    } catch {
      // deno.json doesn't exist or isn't valid JSON
    }

    const parent = dir.substring(0, dir.lastIndexOf("/"));
    if (parent === dir || parent === "") {
      return null;
    }
    dir = parent;
  }
}

export async function readDenoJson(
  path: string,
): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(`${path}/deno.json`);
  return JSON.parse(content);
}

export async function writeDenoJson(
  path: string,
  json: Record<string, unknown>,
): Promise<void> {
  await Deno.writeTextFile(
    `${path}/deno.json`,
    JSON.stringify(json, null, 2) + "\n",
  );
}

export async function removeDirectory(
  path: string,
  mode: "replace" | "remove" = "remove",
): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
    if (mode !== "replace") return;
    await Deno.mkdir(path, { recursive: true });
  } catch {
    // Directory doesn't exist, ignore
  }
}

export async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}
