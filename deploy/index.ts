import bumpVersion from "./bump-version.ts";
import syncVersion from "./sync-version.ts";
import clean from "./clean.ts";
import compile from "./compile.ts";
import generatePackage from "./generate-package.ts";
import publish from "./publish.ts";

const arg = Deno.args[0];
const bumpType = arg === "major" ? "minor" : "patch";

await bumpVersion(bumpType);
await syncVersion();
await clean();
await compile();
await generatePackage();
await publish();
await clean();
