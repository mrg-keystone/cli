import { Select, Input } from "#cliffy/prompt";
import { getConfig } from "@shared/config/config.mod.ts";
import { openInEditor } from "@shared/editor.mod.ts";

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
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone repo init");
    Deno.exit(1);
  }

  const technicalDir = `${config.repoPath}/docs/technical`;
  const docs = await listDocs(technicalDir);

  console.log("Technical Documentation\n");

  const options = [
    { name: "+ Create new document", value: "__new__" },
    ...docs.map((doc) => ({ name: doc, value: doc })),
  ];

  if (docs.length === 0) {
    console.log("No documents found. Create your first one!\n");
  }

  const selected = await Select.prompt({
    message: "Select a document to open or create",
    options,
  });

  if (selected === "__new__") {
    const name = await Input.prompt({
      message: "Enter document name",
      hint: "without .md extension",
    });

    if (!name.trim()) {
      console.error("Document name cannot be empty.");
      Deno.exit(1);
    }

    await Deno.mkdir(technicalDir, { recursive: true });
    const filePath = `${technicalDir}/${name}.md`;
    await Deno.writeTextFile(filePath, `# ${name}\n\n`);
    console.log(`\nCreated new document: ${name}.md`);
    await openInEditor(filePath, name);
  } else {
    const filePath = `${technicalDir}/${selected}`;
    await openInEditor(filePath, selected);
  }
}
