import { openInEditor } from "@shared/editor.mod.ts";

const configPath = `${Deno.env.get("HOME")}/.keystone/config.json`;

export async function editConfig(): Promise<void> {
  console.log("Edit Keystone Configuration\n");

  try {
    await Deno.stat(configPath);
  } catch {
    console.error("No configuration file found.");
    console.error(`\nExpected location: ${configPath}`);
    console.error("\nTo create a config, run:");
    console.error("  keystone workspace init");
    console.error("  keystone workspace bind");
    Deno.exit(1);
  }

  console.log(`Config file: ${configPath}\n`);
  await openInEditor(configPath, "keystone config");
}
