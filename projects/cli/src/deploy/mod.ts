import { Command } from "#cliffy/command";
import { deploy } from "@deploy/domain/coordinators/deploy.coordinator.ts";

export const deployCmd = new Command()
  .description("Deploy a project from keystone-suite")
  .arguments("[repo:string] [project:string]")
  .action(async (_, repo, project) => {
    await deploy(repo, project);
  });
