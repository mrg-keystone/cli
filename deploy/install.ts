const cmd = new Deno.Command("npm", {
  args: ["install", "-g", "./dist"],
  stdout: "inherit",
  stderr: "inherit",
});
const { code } = await cmd.output();
if (code !== 0) Deno.exit(code);
console.log("Installed globally");
