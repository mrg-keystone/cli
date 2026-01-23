export default async function () {
  const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

  const packageJson = {
    name: denoConfig.name ?? "@mrg-keystone/cli",
    version: denoConfig.version ?? "0.1.0",
    bin: { keystone: "./keystone.js" },
    files: [
      "keystone.js",
      "keystone-linux-x64",
      "keystone-linux-arm64",
      "keystone-darwin-x64",
      "keystone-darwin-arm64",
      "keystone-win-x64.exe",
    ],
  };

  await Deno.writeTextFile("dist/package.json", JSON.stringify(packageJson, null, 2) + "\n");

  // Copy the bin wrapper
  await Deno.copyFile("deploy/bin-wrapper.js", "dist/keystone.js");

  console.log("Generated dist/package.json");
}
