import clean from "./clean.ts";
import compile from "./compile.ts";
import generatePackage from "./generate-package.ts";
import install from "./install.ts";

await clean();
await compile();
await generatePackage();
await install();
await clean();
