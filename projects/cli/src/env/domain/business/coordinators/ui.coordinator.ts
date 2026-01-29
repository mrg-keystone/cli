const ENVAULT_URL = "https://envault-deploy.ngrok.app/auth";

export async function openEnvaultUI(): Promise<void> {
  console.log(`Opening ${ENVAULT_URL}...`);

  const cmd = Deno.build.os === "darwin"
    ? "open"
    : Deno.build.os === "windows"
    ? "start"
    : "xdg-open";

  const command = new Deno.Command(cmd, {
    args: [ENVAULT_URL],
    stdout: "null",
    stderr: "null",
  });

  const { code } = await command.output();
  if (code !== 0) {
    console.error("Failed to open browser.");
    console.error(`\nManually visit: ${ENVAULT_URL}`);
    Deno.exit(1);
  }
}
