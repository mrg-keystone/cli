import { Command } from "#cliffy/command";
import { env } from "@env/mod.ts";
import { init } from "@init/mod.ts";
import { prototype } from "@prototype/mod.ts";

await new Command()
  .name("keystone")
  .description("Keystone CLI")
  .version("0.1.11")
  .action(function () {
    this.showHelp();
  })
  .command("env", env)
  .command("init", init)
  .command("prototype", prototype)
  .parse(Deno.args);
