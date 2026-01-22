const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

const packageJson = {
  name: denoConfig.name ?? "keystone-cli",
  version: denoConfig.version ?? "0.1.0",
  bin: { keystone: "./keystone" },
  files: ["keystone"],
};

await Deno.writeTextFile("dist/package.json", JSON.stringify(packageJson, null, 2) + "\n");
console.log("Generated dist/package.json");
