export default async function (type: "patch" | "minor") {
  const config = JSON.parse(await Deno.readTextFile("deno.json"));
  const [major, minor, patch] = (config.version ?? "0.1.0").split(".").map(Number);

  if (type === "minor") {
    config.version = `${major}.${minor + 1}.0`;
  } else {
    config.version = `${major}.${minor}.${patch + 1}`;
  }

  await Deno.writeTextFile("deno.json", JSON.stringify(config, null, 2) + "\n");
  console.log(`Bumped version to ${config.version}`);
}
