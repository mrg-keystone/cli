export default async function () {
  // Load .env file
  let token: string | undefined;
  try {
    const envContent = await Deno.readTextFile(".env");
    const match = envContent.match(/NPM_TOKEN=(.+)/);
    token = match?.[1]?.trim();
  } catch {
    // .env doesn't exist
  }

  if (!token) {
    console.error("NPM_TOKEN not found in .env file");
    console.error("Create a token at: https://www.npmjs.com/settings/~/tokens");
    console.error("Then add it to .env: NPM_TOKEN=your_token_here");
    Deno.exit(1);
  }

  // Set token in .npmrc
  const home = Deno.env.get("HOME") ?? "~";
  await Deno.writeTextFile(`${home}/.npmrc`, `//registry.npmjs.org/:_authToken=${token}\n`);

  // Publish to npm
  const publish = new Deno.Command("npm", {
    args: ["publish", "--access", "public"],
    cwd: "dist",
    stdout: "inherit",
    stderr: "inherit",
  });
  const publishResult = await publish.output();
  if (publishResult.code !== 0) Deno.exit(publishResult.code);
  console.log("Published to npm");
}
