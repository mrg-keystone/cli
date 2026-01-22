import { Command } from "#cliffy/command";
import { env } from "@env/mod.ts";

await new Command()
  .name("keystone")
  .description("Keystone CLI")
  .version("0.1.0")
  .action(function () {
    this.showHelp();
  })
  .command("env", env)
  .parse(Deno.args);
