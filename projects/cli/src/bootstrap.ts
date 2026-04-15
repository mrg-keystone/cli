import { Command } from "#cliffy/command";
import { CompletionsCommand } from "#cliffy/command/completions";
import { deployCmd } from "@deploy/mod.ts";
import { dev } from "@dev/mod.ts";
import { env } from "@env/mod.ts";
import { external } from "@external/mod.ts";
import { open } from "@open/mod.ts";
import { plan } from "@plan/mod.ts";
import { update } from "@update/mod.ts";
import { workspace } from "@workspace/mod.ts";

await new Command()
  .name("keystone")
  .description("CLI for managing keystone-suite development workflow")
  .version("0.1.33")
  .example("Get started", "keystone workspace init")
  .example("Check setup", "keystone workspace doctor")
  .example("Start dev server", "keystone dev")
  .example("Deploy project", "keystone deploy")
  .action(function () {
    this.showHelp();
  })
  .command("completions", new CompletionsCommand().hidden())
  .command("deploy", deployCmd)
  .command("dev", dev)
  .command("env", env)
  .command("external", external)
  .command("open", open)
  .command("plan", plan)
  .command("update", update)
  .command("workspace", workspace)
  .parse(Deno.args);
