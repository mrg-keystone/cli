import YAML from "yaml";

export interface ProjectMilestones {
  kickoff?: string;
  software?: string;
  meeting?: string;
  poc_delivery?: string;
  integration?: string;
  launch?: string;
  iteration?: string;
}

export interface Project {
  name: string;
  milestones: ProjectMilestones;
  notes?: string;
}

export interface ProjectsData {
  projects: Project[];
}

export class ProjectStore {
  private filePath: string;
  private docsPath: string;
  private data: ProjectsData = { projects: [] };

  constructor(docsPath: string) {
    this.docsPath = docsPath;
    this.filePath = `${docsPath}/roadmap/projects.yaml`;
  }

  /**
   * Get the notes file path for a project.
   */
  getNotesPath(projectName: string): string {
    // Sanitize project name for file system
    const safeName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase();
    return `${this.docsPath}/roadmap/notes/${safeName}.md`;
  }

  /**
   * Ensure the notes directory exists.
   */
  async ensureNotesDir(): Promise<void> {
    await Deno.mkdir(`${this.docsPath}/roadmap/notes`, { recursive: true });
  }

  async load(): Promise<void> {
    try {
      const text = await Deno.readTextFile(this.filePath);
      const parsed = YAML.parse(text);
      this.data = {
        projects: Array.isArray(parsed?.projects) ? parsed.projects : [],
      };
    } catch {
      this.data = { projects: [] };
    }
  }

  async save(): Promise<void> {
    const dir = this.filePath.substring(0, this.filePath.lastIndexOf("/"));
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(this.filePath, YAML.stringify(this.data));
  }

  getProjects(): Project[] {
    return this.data.projects;
  }

  /**
   * Check if a project is complete (all milestones in the past).
   */
  isProjectComplete(project: Project): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const milestones = Object.values(project.milestones).filter(Boolean) as string[];

    // If no milestones, not complete (still being planned)
    if (milestones.length === 0) return false;

    // Complete if all milestones are before today
    return milestones.every(date => date < todayStr);
  }

  /**
   * Get active projects (excludes completed projects).
   */
  getActiveProjects(): Project[] {
    return this.data.projects.filter(p => !this.isProjectComplete(p));
  }

  addProject(project: Project): void {
    this.data.projects.push(project);
  }

  updateProject(index: number, project: Project): void {
    this.data.projects[index] = project;
  }

  deleteProject(index: number): void {
    this.data.projects.splice(index, 1);
  }

  getEventsForDate(date: string): { project: string; milestone: string; notes?: string }[] {
    const events: { project: string; milestone: string; notes?: string }[] = [];
    const activeProjects = this.getActiveProjects();

    for (const project of activeProjects) {
      const milestoneNames: Record<keyof ProjectMilestones, string> = {
        kickoff: "Kickoff",
        software: "Software",
        meeting: "Meeting",
        poc_delivery: "POC Delivery",
        integration: "Integration",
        launch: "Launch",
        iteration: "Iteration",
      };

      for (const [key, label] of Object.entries(milestoneNames)) {
        const milestoneDate = project.milestones[key as keyof ProjectMilestones];
        if (milestoneDate === date) {
          events.push({ project: project.name, milestone: label, notes: project.notes });
        }
      }
    }

    return events;
  }

  getAllEvents(): { date: string; project: string; milestone: string; notes?: string }[] {
    const events: { date: string; project: string; milestone: string; notes?: string }[] = [];
    const activeProjects = this.getActiveProjects();

    const milestoneNames: Record<keyof ProjectMilestones, string> = {
      kickoff: "Kickoff",
      software: "Software",
      meeting: "Meeting",
      poc_delivery: "POC Delivery",
      integration: "Integration",
      launch: "Launch",
      iteration: "Iteration",
    };

    for (const project of activeProjects) {
      for (const [key, label] of Object.entries(milestoneNames)) {
        const date = project.milestones[key as keyof ProjectMilestones];
        if (date) {
          events.push({ date, project: project.name, milestone: label, notes: project.notes });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  getProjectByName(name: string): Project | undefined {
    return this.data.projects.find(p => p.name === name);
  }

  getProjectTimeline(name: string): { milestone: string; date: string }[] {
    const project = this.getProjectByName(name);
    if (!project) return [];

    const milestoneNames: Record<keyof ProjectMilestones, string> = {
      kickoff: "Kickoff",
      software: "Software",
      meeting: "Meeting",
      poc_delivery: "POC Delivery",
      integration: "Integration",
      launch: "Launch",
      iteration: "Iteration",
    };

    const timeline: { milestone: string; date: string }[] = [];
    for (const [key, label] of Object.entries(milestoneNames)) {
      const date = project.milestones[key as keyof ProjectMilestones];
      if (date) {
        timeline.push({ milestone: label, date });
      }
    }

    return timeline.sort((a, b) => a.date.localeCompare(b.date));
  }
}
