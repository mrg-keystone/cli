const configDir = `${Deno.env.get("HOME")}/.env-vault`;

export async function listEnvironments(): Promise<void> {
  try {
    const entries = Deno.readDir(configDir);
    let count = 0;
    console.log("Configured environments:\n");
    for await (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        console.log(`  - ${entry.name.replace(".json", "")}`);
        count++;
      }
    }
    if (count === 0) {
      console.log("No environments configured yet.");
      console.log("\nTo add an environment, run:");
      console.log("  keystone env setup <envId> <key> <envName>");
    } else {
      console.log(`\n${count} environment(s) configured.`);
    }
  } catch {
    console.log("No environments configured yet.");
    console.log("\nTo add an environment, run:");
    console.log("  keystone env setup <envId> <key> <envName>");
  }
}
