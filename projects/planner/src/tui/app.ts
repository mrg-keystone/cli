import { Input, Select, Confirm } from "#cliffy/prompt";
import { ProjectStore, Project } from "../data/projects.ts";
import { readKey } from "./input.ts";
import { render, cleanup, ansi } from "./renderer.ts";
import { showProjectForm } from "./form.ts";
import { hotkeys, matchesKey } from "../config/hotkeys.ts";
import { generateCalendarHTML } from "../export/html.ts";

// Vim-style key bindings for Cliffy Select/Confirm prompts
const vimKeys = {
  next: ["down", "j"],
  previous: ["up", "k"],
};

export async function createApp(docsPath: string): Promise<void> {
  const store = new ProjectStore(docsPath);
  await store.load();

  const today = new Date();
  let currentDate = new Date(today);
  let selectedDay = today.getDate();
  let running = true;

  /**
   * Get the number of days in the current month.
   */
  function getDaysInMonth(): number {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }

  /**
   * Navigate to the previous day.
   */
  function prevDay(): void {
    if (selectedDay > 1) {
      selectedDay--;
    } else {
      // Move to previous month's last day
      currentDate.setMonth(currentDate.getMonth() - 1);
      selectedDay = getDaysInMonth();
    }
  }

  /**
   * Navigate to the next day.
   */
  function nextDay(): void {
    const daysInMonth = getDaysInMonth();
    if (selectedDay < daysInMonth) {
      selectedDay++;
    } else {
      // Move to next month's first day
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDay = 1;
    }
  }

  /**
   * Navigate to the previous week.
   */
  function prevWeek(): void {
    if (selectedDay > 7) {
      selectedDay -= 7;
    } else {
      // Move to previous month
      currentDate.setMonth(currentDate.getMonth() - 1);
      const daysInPrevMonth = getDaysInMonth();
      selectedDay = Math.min(daysInPrevMonth, selectedDay + daysInPrevMonth - 7);
    }
  }

  /**
   * Navigate to the next week.
   */
  function nextWeek(): void {
    const daysInMonth = getDaysInMonth();
    if (selectedDay + 7 <= daysInMonth) {
      selectedDay += 7;
    } else {
      // Move to next month
      const overshoot = selectedDay + 7 - daysInMonth;
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDay = Math.min(overshoot, getDaysInMonth());
    }
  }

  /**
   * Navigate to the previous month.
   */
  function prevMonth(): void {
    currentDate.setMonth(currentDate.getMonth() - 1);
    selectedDay = Math.min(selectedDay, getDaysInMonth());
  }

  /**
   * Navigate to the next month.
   */
  function nextMonth(): void {
    currentDate.setMonth(currentDate.getMonth() + 1);
    selectedDay = Math.min(selectedDay, getDaysInMonth());
  }

  /**
   * Jump to today's date.
   */
  function jumpToToday(): void {
    const now = new Date();
    currentDate = new Date(now);
    selectedDay = now.getDate();
  }

  /**
   * Enter input mode and prompt for a new project.
   */
  async function createProject(): Promise<void> {
    Deno.stdin.setRaw(false);
    console.clear();

    try {
      console.log(`${ansi.bg.green}${ansi.fg.white}${ansi.bold} NEW PROJECT ${ansi.reset}\n`);

      const name = await Input.prompt({ message: "Project name" });
      if (!name.trim()) {
        return;
      }

      // Create project with empty milestones
      const project: Project = {
        name: name.trim(),
        milestones: {},
      };

      // Open form for milestone editing
      const { result, project: updatedProject } = await showProjectForm({
        store,
        project,
        isNew: true,
      });

      if (result === "save") {
        store.addProject(updatedProject);
        await store.save();
      }
    } finally {
      // Always restore raw mode for main loop
      Deno.stdin.setRaw(true);
    }
  }

  /**
   * Enter input mode and edit an existing project.
   */
  async function editProject(): Promise<void> {
    const activeProjects = store.getActiveProjects();
    if (activeProjects.length === 0) {
      return;
    }

    Deno.stdin.setRaw(false);
    console.clear();

    try {
      console.log(`${ansi.bg.yellow}${ansi.fg.black}${ansi.bold} EDIT PROJECT ${ansi.reset}\n`);

      const options = activeProjects.map((p) => p.name);
      const selectedName = await Select.prompt({
        message: "Select project to edit",
        options,
        keys: vimKeys,
      });

      // Find index in full list for updating
      const allProjects = store.getProjects();
      const index = allProjects.findIndex((p) => p.name === selectedName);
      const existing = allProjects[index];

      // Open form for milestone editing
      const { result, project: updatedProject } = await showProjectForm({
        store,
        project: existing,
        isNew: false,
      });

      if (result === "save") {
        store.updateProject(index, updatedProject);
        await store.save();
      }
    } finally {
      // Always restore raw mode for main loop
      Deno.stdin.setRaw(true);
    }
  }

  /**
   * Enter input mode and view a project's details.
   */
  async function viewProject(): Promise<void> {
    const activeProjects = store.getActiveProjects();
    if (activeProjects.length === 0) {
      return;
    }

    Deno.stdin.setRaw(false);
    console.clear();

    try {
      console.log(`${ansi.bg.cyan}${ansi.fg.black}${ansi.bold} VIEW PROJECT ${ansi.reset}\n`);

      const options = activeProjects.map((p) => p.name);
      const selectedName = await Select.prompt({
        message: "Select project to view",
        options,
        keys: vimKeys,
      });

      const project = activeProjects.find((p) => p.name === selectedName)!;
      const timeline = store.getProjectTimeline(project.name);

      console.clear();
      console.log(`${ansi.bg.green}${ansi.fg.white}${ansi.bold} ${project.name} ${ansi.reset}\n`);

      console.log(`${ansi.bold}Timeline${ansi.reset}`);
      for (const item of timeline) {
        console.log(`  ${item.date}  ${item.milestone}`);
      }

      if (project.notes) {
        console.log(`\n${ansi.bold}Notes${ansi.reset}`);
        for (const line of project.notes.split("\n")) {
          console.log(`  ${line}`);
        }
      }

      console.log("\nPress Enter to continue...");
      await Input.prompt({ message: "" });
    } finally {
      // Always restore raw mode for main loop
      Deno.stdin.setRaw(true);
    }
  }

  /**
   * Enter input mode and delete a project.
   */
  async function deleteProject(): Promise<void> {
    const activeProjects = store.getActiveProjects();
    if (activeProjects.length === 0) {
      return;
    }

    Deno.stdin.setRaw(false);
    console.clear();

    try {
      console.log(`${ansi.bg.red}${ansi.fg.white}${ansi.bold} DELETE PROJECT ${ansi.reset}\n`);

      const options = activeProjects.map((p) => p.name);
      const selectedName = await Select.prompt({
        message: "Select project to delete",
        options,
        keys: vimKeys,
      });

      const confirmed = await Confirm.prompt({
        message: `Delete "${selectedName}"?`,
        default: false,
      });

      if (confirmed) {
        // Find index in full list for deletion
        const allProjects = store.getProjects();
        const index = allProjects.findIndex((p) => p.name === selectedName);
        store.deleteProject(index);
        await store.save();
      }
    } finally {
      // Always restore raw mode for main loop
      Deno.stdin.setRaw(true);
    }
  }

  /**
   * Format date as YYYY-MM-DD.
   */
  function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  /**
   * Open notes for a project in the user's editor.
   */
  async function openNotes(): Promise<void> {
    const dateStr = formatDate(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDay
    );
    const events = store.getEventsForDate(dateStr);
    const activeProjects = store.getActiveProjects();

    // If no events on this day, let user select any active project
    let projectName: string;

    if (events.length === 0) {
      if (activeProjects.length === 0) {
        return;
      }

      Deno.stdin.setRaw(false);
      console.clear();

      try {
        console.log(`${ansi.bg.blue}${ansi.fg.white}${ansi.bold} OPEN NOTES ${ansi.reset}\n`);

        const options = activeProjects.map((p) => p.name);
        projectName = await Select.prompt({
          message: "Select project",
          options,
          keys: vimKeys,
        });
      } finally {
        Deno.stdin.setRaw(true);
      }
    } else if (events.length === 1) {
      // Only one event, open its notes directly
      projectName = events[0].project;
    } else {
      // Multiple events, let user select
      Deno.stdin.setRaw(false);
      console.clear();

      try {
        console.log(`${ansi.bg.blue}${ansi.fg.white}${ansi.bold} OPEN NOTES ${ansi.reset}\n`);

        const options = events.map((e) => e.project);
        projectName = await Select.prompt({
          message: "Select project",
          options,
          keys: vimKeys,
        });
      } finally {
        Deno.stdin.setRaw(true);
      }
    }

    // Ensure notes directory exists
    await store.ensureNotesDir();

    const notesPath = store.getNotesPath(projectName);

    // Create file with template if it doesn't exist
    try {
      await Deno.stat(notesPath);
    } catch {
      const template = `# ${projectName}\n\n## Notes\n\n`;
      await Deno.writeTextFile(notesPath, template);
    }

    // Get editor from environment
    const editor = Deno.env.get("EDITOR") || Deno.env.get("VISUAL") || "vim";

    // Exit raw mode and clear screen before opening editor
    Deno.stdin.setRaw(false);
    cleanup();

    // Open editor
    const cmd = new Deno.Command(editor, {
      args: [notesPath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const process = cmd.spawn();
    await process.status;

    // Restore raw mode after editor closes
    Deno.stdin.setRaw(true);
  }

  /**
   * Export calendar as HTML.
   */
  async function exportCalendar(): Promise<void> {
    Deno.stdin.setRaw(false);
    console.clear();

    try {
      console.log(`${ansi.bg.magenta}${ansi.fg.white}${ansi.bold} EXPORT CALENDAR ${ansi.reset}\n`);

      // Generate HTML starting from current month, showing 12 months
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const html = await generateCalendarHTML(store, startDate, 12);

      // Save to roadmap folder
      await store.ensureNotesDir();
      const exportPath = store.getNotesPath("_calendar").replace(".md", ".html");
      await Deno.writeTextFile(exportPath, html);

      console.log(`${ansi.fg.green}Calendar exported to:${ansi.reset}`);
      console.log(`${ansi.fg.cyan}${exportPath}${ansi.reset}\n`);

      // Try to open in browser
      const openCmd = Deno.build.os === "darwin" ? "open" : Deno.build.os === "windows" ? "start" : "xdg-open";
      try {
        const cmd = new Deno.Command(openCmd, { args: [exportPath] });
        cmd.spawn();
        console.log(`${ansi.dim}Opening in browser...${ansi.reset}`);
      } catch {
        // Ignore if can't open browser
      }

      console.log("\nPress Enter to continue...");
      await Input.prompt({ message: "" });
    } finally {
      Deno.stdin.setRaw(true);
    }
  }

  // Initial render
  Deno.stdin.setRaw(true);
  render({ currentDate, selectedDay, store });

  // Main event loop
  while (running) {
    const { key } = await readKey();

    // Quit
    if (matchesKey(key, hotkeys.actions.quit)) {
      running = false;
    }
    // Day navigation
    else if (matchesKey(key, hotkeys.navigation.prevDay)) {
      prevDay();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.navigation.nextDay)) {
      nextDay();
      render({ currentDate, selectedDay, store });
    }
    // Week navigation
    else if (matchesKey(key, hotkeys.navigation.prevWeek)) {
      prevWeek();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.navigation.nextWeek)) {
      nextWeek();
      render({ currentDate, selectedDay, store });
    }
    // Month navigation
    else if (matchesKey(key, hotkeys.navigation.prevMonth)) {
      prevMonth();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.navigation.nextMonth)) {
      nextMonth();
      render({ currentDate, selectedDay, store });
    }
    // Jump to today
    else if (matchesKey(key, hotkeys.navigation.today)) {
      jumpToToday();
      render({ currentDate, selectedDay, store });
    }
    // Project actions
    else if (matchesKey(key, hotkeys.actions.addProject)) {
      await createProject();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.actions.editProject)) {
      await editProject();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.actions.viewProject)) {
      await viewProject();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.actions.deleteProject)) {
      await deleteProject();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.actions.openNotes)) {
      await openNotes();
      render({ currentDate, selectedDay, store });
    }
    else if (matchesKey(key, hotkeys.actions.export)) {
      await exportCalendar();
      render({ currentDate, selectedDay, store });
    }
  }

  // Cleanup
  Deno.stdin.setRaw(false);
  cleanup();
}
