import { Command } from "#cliffy/command";
import { deploy } from "@deploy/domain/coordinators/deploy.coordinator.ts";

export const deployCmd = new Command()
  .description("Deploy a project from keystone-suite")
  .arguments("[repo:string] [project:string]")
  .example("Interactive deploy", "keystone deploy")
  .example("Deploy specific project", "keystone deploy clients cli")
  .example("Deploy from repo", "keystone deploy backend")
  .action(async (_, repo, project) => {
    await deploy(repo, project);
  });
