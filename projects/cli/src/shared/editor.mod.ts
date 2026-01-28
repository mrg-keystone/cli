// Shared editor utility to avoid duplication

export function getEditorCommand(): { cmd: string; args: string[] } {
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

export async function openInEditor(filePath: string, description?: string): Promise<void> {
  const { cmd, args } = getEditorCommand();

  if (description) {
    console.log(`Opening ${description}...`);
  } else {
    console.log(`Opening ${filePath}...`);
  }

  const command = new Deno.Command(cmd, {
    args: [...args, filePath],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error(`Failed to open file: ${filePath}`);
    console.error("Check that your $EDITOR environment variable is set correctly.");
    Deno.exit(1);
  }
}
