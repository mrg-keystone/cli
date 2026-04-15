import { Command } from "#cliffy/command";
import {
  listServices,
  buildService,
  startService,
  stopService,
  restartService,
  showLogs,
  execShell,
  showStatus,
} from "@external/domain/coordinators/external.coordinator.ts";

export const external = new Command()
  .description("Manage external Docker services")
  .action(function () {
    this.showHelp();
  })
  .command(
    "list",
    new Command()
      .description("List available services")
      .example("List services", "keystone external list")
      .action(async () => {
        await listServices();
      })
  )
  .command(
    "status",
    new Command()
      .description("Show status of all services")
      .example("Show status", "keystone external status")
      .action(async () => {
        await showStatus();
      })
  )
  .command(
    "build",
    new Command()
      .description("Build a service Docker image")
      .arguments("[service:string]")
      .example("Interactive build", "keystone external build")
      .example("Build specific service", "keystone external build postgres")
      .action(async (_, service) => {
        await buildService(service);
      })
  )
  .command(
    "start",
    new Command()
      .description("Start a service container")
      .arguments("[service:string]")
      .option("-f, --foreground", "Run in foreground instead of detached")
      .example("Interactive start", "keystone external start")
      .example("Start specific service", "keystone external start postgres")
      .example("Start in foreground", "keystone external start postgres -f")
      .action(async ({ foreground }, service) => {
        await startService(service, !foreground);
      })
  )
  .command(
    "stop",
    new Command()
      .description("Stop a running service")
      .arguments("[service:string]")
      .example("Interactive stop", "keystone external stop")
      .example("Stop specific service", "keystone external stop postgres")
      .action(async (_, service) => {
        await stopService(service);
      })
  )
  .command(
    "restart",
    new Command()
      .description("Restart a service")
      .arguments("[service:string]")
      .example("Interactive restart", "keystone external restart")
      .example("Restart specific service", "keystone external restart postgres")
      .action(async (_, service) => {
        await restartService(service);
      })
  )
  .command(
    "logs",
    new Command()
      .description("View service logs")
      .arguments("[service:string]")
      .option("--no-follow", "Don't follow log output")
      .example("Follow logs", "keystone external logs postgres")
      .example("View logs once", "keystone external logs postgres --no-follow")
      .action(async ({ follow }, service) => {
        await showLogs(service, follow);
      })
  )
  .command(
    "shell",
    new Command()
      .description("Open a shell in a running container")
      .arguments("[service:string]")
      .example("Open shell", "keystone external shell postgres")
      .action(async (_, service) => {
        await execShell(service);
      })
  );
