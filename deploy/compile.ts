await Deno.mkdir("dist", { recursive: true });

const cmd = new Deno.Command("deno", {
  args: ["compile", "-A", "--output", "dist/keystone", "src/bootstrap.ts"],
  stdout: "inherit",
  stderr: "inherit",
});
const { code } = await cmd.output();
if (code !== 0) Deno.exit(code);
console.log("Compiled dist/keystone");
