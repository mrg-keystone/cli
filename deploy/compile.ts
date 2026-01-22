const TARGETS = [
  { target: "x86_64-unknown-linux-gnu", output: "keystone-linux-x64" },
  { target: "aarch64-unknown-linux-gnu", output: "keystone-linux-arm64" },
  { target: "x86_64-apple-darwin", output: "keystone-darwin-x64" },
  { target: "aarch64-apple-darwin", output: "keystone-darwin-arm64" },
  { target: "x86_64-pc-windows-msvc", output: "keystone-win-x64.exe" },
];

export default async function () {
  await Deno.mkdir("dist", { recursive: true });

  for (const { target, output } of TARGETS) {
    console.log(`Compiling for ${target}...`);
    const cmd = new Deno.Command("deno", {
      args: ["compile", "-A", "--target", target, "--output", `dist/${output}`, "src/bootstrap.ts"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await cmd.output();
    if (code !== 0) {
      console.error(`Failed to compile for ${target}`);
      Deno.exit(code);
    }
  }

  console.log("Compiled all platforms");
}
