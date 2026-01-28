import { getConfig } from "@shared/config/config.mod.ts";

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

export async function openReadme(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  const readmePath = `${config.repoPath}/docs/README.md`;

  const { cmd, args } = getEditorCommand();

  const command = new Deno.Command(cmd, {
    args: [...args, readmePath],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Failed to open readme.");
    Deno.exit(1);
  }
}
