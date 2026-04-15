import { getConfig } from "@shared/config/config.mod.ts";
import { ProjectStore, Project, ProjectMilestones } from "@planner/data/projects.ts";

interface QuarterMilestone {
  project: string;
  milestone: string;
  date: string;
}

const milestoneLabels: Record<keyof ProjectMilestones, string> = {
  kickoff: "Kickoff",
  software: "Software",
  meeting: "Meeting",
  poc_delivery: "POC Delivery",
  integration: "Integration",
  launch: "Launch",
  iteration: "Iteration",
};

function getQuarterRange(quarter: number, year: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

function getMilestonesInQuarter(project: Project, start: string, end: string): QuarterMilestone[] {
  const milestones: QuarterMilestone[] = [];

  for (const [key, label] of Object.entries(milestoneLabels)) {
    const date = project.milestones[key as keyof ProjectMilestones];
    if (date && date >= start && date <= end) {
      milestones.push({ project: project.name, milestone: label, date });
    }
  }

  return milestones.sort((a, b) => a.date.localeCompare(b.date));
}

export async function showQuarter(quarter: number, year?: number): Promise<void> {
  if (quarter < 1 || quarter > 4) {
    console.error("Quarter must be between 1 and 4.");
    Deno.exit(1);
  }

  const config = await getConfig();

  if (!config.repoPath) {
    console.error("No repo path configured.");
    console.error("\nTo set up your repo, run:");
    console.error("  keystone workspace init");
    Deno.exit(1);
  }

  const docsPath = `${config.repoPath}/docs`;
  const store = new ProjectStore(docsPath);
  await store.load();

  const targetYear = year ?? new Date().getFullYear();
  const { start, end } = getQuarterRange(quarter, targetYear);

  const projects = store.getProjects();
  const quarterData: Map<string, QuarterMilestone[]> = new Map();

  for (const project of projects) {
    const milestones = getMilestonesInQuarter(project, start, end);
    if (milestones.length > 0) {
      quarterData.set(project.name, milestones);
    }
  }

  const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
  console.log(`\n${quarterNames[quarter - 1]} ${targetYear} Projects\n`);

  if (quarterData.size === 0) {
    console.log("No projects with milestones in this quarter.");
    return;
  }

  for (const [projectName, milestones] of quarterData) {
    console.log(`${projectName}`);
    for (const m of milestones) {
      console.log(`  ${m.date}  ${m.milestone}`);
    }
    console.log();
  }
}
