const configDir = `${Deno.env.get("HOME")}/.env-vault`;

export async function listEnvironments(): Promise<void> {
  try {
    const entries = Deno.readDir(configDir);
    let count = 0;
    for await (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        console.log(entry.name.replace(".json", ""));
        count++;
      }
    }
    if (count === 0) {
      console.log("No environments configured.");
    }
  } catch {
    console.log("No environments configured.");
  }
}
