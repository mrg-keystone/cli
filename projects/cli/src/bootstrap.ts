import { Command } from "#cliffy/command";
import { env } from "@env/mod.ts";
import { init } from "@init/mod.ts";

await new Command()
  .name("keystone")
  .description("Keystone CLI")
  .version("0.1.7")
  .action(function () {
    this.showHelp();
  })
  .command("env", env)
  .command("init", init)
  .parse(Deno.args);
