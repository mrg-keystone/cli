export default async function () {
  const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

  const packageJson = {
    name: denoConfig.name ?? "@mrg-keystone/planner",
    version: denoConfig.version ?? "0.1.0",
    bin: { planner: "./planner.js" },
    scripts: {
      postinstall: "node postinstall.js",
    },
    files: [
      "planner.js",
      "postinstall.js",
      "planner-linux-x64",
      "planner-linux-arm64",
      "planner-darwin-x64",
      "planner-darwin-arm64",
      "planner-win-x64.exe",
    ],
  };

  await Deno.writeTextFile("dist/package.json", JSON.stringify(packageJson, null, 2) + "\n");

  // Copy the bin wrapper and postinstall script
  await Deno.copyFile("deploy/bin-wrapper.js", "dist/planner.js");
  await Deno.copyFile("deploy/postinstall.js", "dist/postinstall.js");

  console.log("Generated dist/package.json");
}
