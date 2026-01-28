const configPath = `${Deno.env.get("HOME")}/.keystone/config.json`;

function getEditorCommand(): { cmd: string; args: string[] } {
  const editor = Deno.env.get("EDITOR");
  if (editor) {
    return { cmd: editor, args: [] };
  }

  const os = Deno.build.os;
  if (os === "darwin") return { cmd: "open", args: [] };
  if (os === "linux") return { cmd: "xdg-open", args: [] };
  if (os === "windows") return { cmd: "cmd", args: ["/c", "start"] };

  return { cmd: "vi", args: [] };
}

export async function editConfig(): Promise<void> {
  // Ensure config exists
  try {
    await Deno.stat(configPath);
  } catch {
    console.error("No config found. Run 'keystone repo init' or 'keystone repo bind' first.");
    Deno.exit(1);
  }

  const { cmd, args } = getEditorCommand();

  const command = new Deno.Command(cmd, {
    args: [...args, configPath],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Failed to open config.");
    Deno.exit(1);
  }
}
