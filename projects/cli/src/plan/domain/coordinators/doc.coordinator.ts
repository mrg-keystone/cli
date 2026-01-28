import { Select, Input } from "#cliffy/prompt";
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

async function openInEditor(filePath: string): Promise<void> {
  const { cmd, args } = getEditorCommand();

  const command = new Deno.Command(cmd, {
    args: [...args, filePath],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await command.output();

  if (code !== 0) {
    console.error("Failed to open file.");
    Deno.exit(1);
  }
}

async function listDocs(technicalDir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    for await (const entry of Deno.readDir(technicalDir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        files.push(entry.name);
      }
    }
  } catch {
    // Directory may not exist yet
  }
  return files.sort();
}

export async function openDoc(): Promise<void> {
  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured. Run 'keystone repo init' first.");
    Deno.exit(1);
  }

  const technicalDir = `${config.repoPath}/docs/technical`;
  const docs = await listDocs(technicalDir);

  const options = [
    { name: "New document", value: "__new__" },
    ...docs.map((doc) => ({ name: doc, value: doc })),
  ];

  const selected = await Select.prompt({
    message: "Select a document",
    options,
  });

  if (selected === "__new__") {
    const name = await Input.prompt({
      message: "Document name (without .md)",
    });

    if (!name.trim()) {
      console.error("Name cannot be empty.");
      Deno.exit(1);
    }

    await Deno.mkdir(technicalDir, { recursive: true });
    const filePath = `${technicalDir}/${name}.md`;
    await Deno.writeTextFile(filePath, `# ${name}\n\n`);
    console.log(`Created ${filePath}`);
    await openInEditor(filePath);
  } else {
    const filePath = `${technicalDir}/${selected}`;
    await openInEditor(filePath);
  }
}
