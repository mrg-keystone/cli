import { Command } from "#cliffy/command";
import { config } from "@config/mod.ts";
import { deployCmd } from "@deploy/mod.ts";
import { dev } from "@dev/mod.ts";
import { env } from "@env/mod.ts";
import { plan } from "@plan/mod.ts";
import { prototype } from "@prototype/mod.ts";
import { repo } from "@repo/mod.ts";
import { update } from "@update/mod.ts";

await new Command()
  .name("keystone")
  .description("Keystone CLI")
  .version("0.1.22")
  .action(function () {
    this.showHelp();
  })
  .command("config", config)
  .command("deploy", deployCmd)
  .command("dev", dev)
  .command("env", env)
  .command("plan", plan)
  .command("prototype", prototype)
  .command("repo", repo)
  .command("update", update)
  .parse(Deno.args);
