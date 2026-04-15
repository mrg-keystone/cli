/**
 * Form-based project editor with field navigation.
 */

import { readKey } from "./input.ts";
import { ansi } from "./renderer.ts";
import { pickDate, DatePickerResult } from "./date-picker.ts";
import { hotkeys, matchesKey } from "../config/hotkeys.ts";
import type { ProjectStore, Project, ProjectMilestones } from "../data/projects.ts";

interface FormField {
  key: keyof ProjectMilestones;
  label: string;
}

const formFields: FormField[] = [
  { key: "kickoff", label: "Kickoff" },
  { key: "software", label: "Software" },
  { key: "meeting", label: "Meeting" },
  { key: "poc_delivery", label: "POC Delivery" },
  { key: "integration", label: "Integration" },
  { key: "launch", label: "Launch" },
  { key: "iteration", label: "Iteration" },
];

/**
 * Milestone type symbols.
 */
const milestoneSymbols: Record<string, string> = {
  "kickoff": "K",
  "software": "S",
  "meeting": "M",
  "poc_delivery": "P",
  "integration": "I",
  "launch": "L",
  "iteration": "R",
};

export type FormResult = "save" | "cancel";

export interface FormOptions {
  store: ProjectStore;
  project: Project;
  isNew?: boolean;
}

/**
 * Render the form UI.
 */
function renderForm(
  projectName: string,
  milestones: ProjectMilestones,
  selectedIndex: number,
  isNew: boolean
): void {
  const output: string[] = [];

  output.push(ansi.clear);
  output.push(ansi.hideCursor);

  // Header
  output.push(ansi.moveTo(1, 1));
  const headerBg = isNew ? ansi.bg.green : ansi.bg.yellow;
  const headerFg = isNew ? ansi.fg.white : ansi.fg.black;
  output.push(`${headerBg}${headerFg}${ansi.bold} ${isNew ? "NEW" : "EDIT"} PROJECT ${ansi.reset}`);

  // Project name
  output.push(ansi.moveTo(3, 3));
  output.push(`${ansi.bold}${projectName}${ansi.reset}`);

  // Milestones header
  output.push(ansi.moveTo(3, 5));
  output.push(`${ansi.dim}Milestones:${ansi.reset}`);

  // Field list
  let row = 7;
  for (let i = 0; i < formFields.length; i++) {
    const field = formFields[i];
    const value = milestones[field.key];
    const symbol = milestoneSymbols[field.key] || "?";
    const isSelected = i === selectedIndex;

    output.push(ansi.moveTo(3, row));

    if (isSelected) {
      output.push(`${ansi.bg.white}${ansi.fg.black}>`);
    } else {
      output.push(" ");
    }

    // Symbol and label
    output.push(` ${ansi.fg.cyan}${symbol}${ansi.reset}`);
    if (isSelected) {
      output.push(`${ansi.bg.white}${ansi.fg.black} ${field.label.padEnd(12)}${ansi.reset}`);
    } else {
      output.push(` ${field.label.padEnd(12)}`);
    }

    // Value
    if (value) {
      output.push(`${ansi.fg.green}${value}${ansi.reset}`);
    } else {
      output.push(`${ansi.dim}(none)${ansi.reset}`);
    }

    if (isSelected) {
      output.push(`${ansi.reset}`);
    }

    row++;
  }

  // Help bar
  output.push(ansi.moveTo(1, row + 2));
  output.push(`${ansi.dim}[j/k] Navigate  [Enter] Edit date  [s] Save  [q/Esc] Cancel${ansi.reset}`);

  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode(output.join("")));
}

/**
 * Parse a date string to a Date object.
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
  return new Date(year, month - 1, day);
}

/**
 * Show the project form and allow editing fields.
 * Returns "save" if user wants to save, "cancel" if user cancelled.
 */
export async function showProjectForm(options: FormOptions): Promise<{ result: FormResult; project: Project }> {
  const { store, project, isNew = false } = options;

  // Make a copy of milestones to edit
  const milestones: ProjectMilestones = { ...project.milestones };
  let selectedIndex = 0;
  let lastSelectedDate: Date | undefined;

  Deno.stdin.setRaw(true);
  renderForm(project.name, milestones, selectedIndex, isNew);

  while (true) {
    const { key } = await readKey();

    // Cancel/back
    if (matchesKey(key, hotkeys.actions.quit)) {
      Deno.stdin.setRaw(false);
      return { result: "cancel", project: { ...project, milestones } };
    }

    // Save
    if (key === "s") {
      Deno.stdin.setRaw(false);
      return { result: "save", project: { ...project, milestones } };
    }

    // Navigate up
    if (matchesKey(key, hotkeys.navigation.prevWeek) || matchesKey(key, ["up"])) {
      selectedIndex = Math.max(0, selectedIndex - 1);
      renderForm(project.name, milestones, selectedIndex, isNew);
    }

    // Navigate down
    else if (matchesKey(key, hotkeys.navigation.nextWeek) || matchesKey(key, ["down"])) {
      selectedIndex = Math.min(formFields.length - 1, selectedIndex + 1);
      renderForm(project.name, milestones, selectedIndex, isNew);
    }

    // Edit selected field
    else if (matchesKey(key, hotkeys.picker.select)) {
      const field = formFields[selectedIndex];
      const currentValue = milestones[field.key];

      // Use last selected date, or current field value, or today
      const initialDate = parseDate(currentValue) || lastSelectedDate || new Date();

      // Open date picker for this field
      const result: DatePickerResult = await pickDate({
        store,
        initialDate,
        prompt: `Select ${field.label} date`,
      });

      // Handle result
      if (result.action === "select" || result.action === "next") {
        milestones[field.key] = result.value;
        // Remember the selected date for next picker
        lastSelectedDate = parseDate(result.value);
      }
      // If cancelled, just return to form (don't exit)

      // Re-enter raw mode and re-render form
      Deno.stdin.setRaw(true);
      renderForm(project.name, milestones, selectedIndex, isNew);
    }
  }
}
