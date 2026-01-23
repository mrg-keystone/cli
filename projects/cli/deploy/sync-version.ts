export default async function syncVersion() {
  const config = JSON.parse(await Deno.readTextFile("deno.json"));
  const version = config.version ?? "0.1.0";

  let bootstrap = await Deno.readTextFile("src/bootstrap.ts");
  bootstrap = bootstrap.replace(/\.version\("[^"]+"\)/, `.version("${version}")`);
  await Deno.writeTextFile("src/bootstrap.ts", bootstrap);

  console.log(`Synced version ${version} to bootstrap.ts`);
}

if (import.meta.main) await syncVersion();
