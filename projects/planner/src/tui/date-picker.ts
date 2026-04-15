/**
 * Interactive calendar date picker with event preview.
 */

import { readKey } from "./input.ts";
import { ansi } from "./renderer.ts";
import type { ProjectStore } from "../data/projects.ts";
import { hotkeys, matchesKey } from "../config/hotkeys.ts";

export interface DatePickerOptions {
  store: ProjectStore;
  initialDate?: Date;
  prompt: string;
  stepIndex?: number;
  totalSteps?: number;
}

export type PickerAction = "select" | "prev" | "next" | "cancel";

export interface DatePickerResult {
  action: PickerAction;
  value?: string;
}

/**
 * Get terminal dimensions.
 */
function getTerminalSize(): { width: number; height: number } {
  try {
    const size = Deno.consoleSize();
    return { width: size.columns, height: size.rows };
  } catch {
    return { width: 80, height: 24 };
  }
}

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get the quarter for a given month (0-indexed).
 */
function getQuarter(month: number): string {
  if (month <= 2) return "Q1";
  if (month <= 5) return "Q2";
  if (month <= 8) return "Q3";
  return "Q4";
}

// ANSI escape code prefix for 256-color mode
const CSI = "\x1b[";

/**
 * Project colors palette - maximally distinct colors.
 */
const projectColors = [
  `${CSI}38;5;39m`,   // bright blue
  `${CSI}38;5;208m`,  // orange
  `${CSI}38;5;40m`,   // bright green
  `${CSI}38;5;201m`,  // magenta/pink
  `${CSI}38;5;226m`,  // bright yellow
  `${CSI}38;5;196m`,  // bright red
  `${CSI}38;5;51m`,   // cyan
  `${CSI}38;5;141m`,  // purple
];

/**
 * Milestone type symbols.
 */
const milestoneSymbols: Record<string, string> = {
  "Kickoff": "K",
  "Software": "S",
  "Meeting": "M",
  "POC Delivery": "P",
  "Integration": "I",
  "Launch": "L",
  "Iteration": "R",
};

/**
 * Get color for a project by its index.
 */
function getProjectColor(index: number): string {
  return projectColors[index % projectColors.length];
}

/**
 * Render the date picker UI.
 */
function render(
  currentDate: Date,
  selectedDay: number,
  store: ProjectStore,
  prompt: string,
  stepIndex?: number,
  totalSteps?: number
): void {
  const { width } = getTerminalSize();
  const output: string[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build project index map for consistent colors (active projects only)
  const projects = store.getActiveProjects();
  const projectIndexMap = new Map<string, number>();
  projects.forEach((p, i) => projectIndexMap.set(p.name, i));

  // Get days with events
  const daysWithEvents = new Map<number, { project: string; milestone: string; projectIndex: number }[]>();
  const allEvents = store.getAllEvents();
  for (const event of allEvents) {
    const [eventYear, eventMonth, eventDay] = event.date.split("-").map(Number);
    if (eventYear === year && eventMonth === month + 1) {
      if (!daysWithEvents.has(eventDay)) {
        daysWithEvents.set(eventDay, []);
      }
      const projectIndex = projectIndexMap.get(event.project) ?? 0;
      daysWithEvents.get(eventDay)!.push({ project: event.project, milestone: event.milestone, projectIndex });
    }
  }

  output.push(ansi.clear);
  output.push(ansi.hideCursor);

  // Header with prompt and step indicator
  output.push(ansi.moveTo(1, 1));
  const stepInfo = stepIndex !== undefined && totalSteps !== undefined
    ? ` (${stepIndex + 1}/${totalSteps})`
    : "";
  output.push(`${ansi.bg.magenta}${ansi.fg.white}${ansi.bold} SELECT DATE${stepInfo} ${ansi.reset}`);
  output.push(ansi.moveTo(1, 3));
  output.push(`${ansi.fg.cyan}${prompt}${ansi.reset}`);

  // Month/year header
  output.push(ansi.moveTo(3, 5));
  output.push(`${ansi.bold}${months[month]} ${year}${ansi.reset}`);

  // Day headers
  output.push(ansi.moveTo(3, 7));
  output.push(days.join("  "));

  // Separator
  output.push(ansi.moveTo(3, 8));
  output.push("\u2500".repeat(20));

  // Calendar grid
  let row = 9;
  let col = 3 + firstDay * 4;

  for (let day = 1; day <= daysInMonth; day++) {
    output.push(ansi.moveTo(col, row));

    const events = daysWithEvents.get(day);
    const isSelected = day === selectedDay;
    const dayStr = String(day).padStart(2, " ");

    if (isSelected) {
      // Selected day - show with cyan background
      if (events && events.length > 0) {
        const symbol = milestoneSymbols[events[0].milestone] || "?";
        const color = getProjectColor(events[0].projectIndex);
        output.push(`${ansi.bg.cyan}${color}${symbol}${dayStr}${ansi.reset} `);
      } else {
        output.push(`${ansi.bg.cyan}${ansi.fg.black}[${dayStr}]${ansi.reset} `);
      }
    } else if (events && events.length > 0) {
      // Day with event - show project color with milestone symbol
      const symbol = milestoneSymbols[events[0].milestone] || "?";
      const color = getProjectColor(events[0].projectIndex);
      output.push(`${color}${dayStr}${ansi.bold}${symbol}${ansi.reset}`);
    } else {
      output.push(` ${dayStr} `);
    }

    col += 4;
    if ((firstDay + day) % 7 === 0) {
      row++;
      col = 3;
    }
  }

  // Selected date info
  const selectedDateStr = formatDate(year, month, selectedDay);
  const quarter = getQuarter(month);
  const panelCol = Math.min(35, Math.floor(width / 2));

  output.push(ansi.moveTo(panelCol, 5));
  output.push(`${ansi.bold}Selected: ${ansi.fg.cyan}${selectedDateStr}${ansi.reset} ${ansi.fg.yellow}(${quarter})${ansi.reset}`);

  // Events on selected date
  output.push(ansi.moveTo(panelCol, 7));
  output.push(`${ansi.bold}Events on this date:${ansi.reset}`);

  const eventsOnDay = daysWithEvents.get(selectedDay) || [];
  let eventRow = 9;

  if (eventsOnDay.length === 0) {
    output.push(ansi.moveTo(panelCol, eventRow));
    output.push(`${ansi.dim}No other milestones${ansi.reset}`);
  } else {
    for (const event of eventsOnDay.slice(0, 4)) {
      const symbol = milestoneSymbols[event.milestone] || "?";
      const color = getProjectColor(event.projectIndex);
      output.push(ansi.moveTo(panelCol, eventRow++));
      output.push(`${color}\u2588${ansi.reset} ${event.project}`);
      output.push(ansi.moveTo(panelCol + 2, eventRow++));
      output.push(`${ansi.dim}${symbol} ${event.milestone}${ansi.reset}`);
    }
    if (eventsOnDay.length > 4) {
      output.push(ansi.moveTo(panelCol, eventRow));
      output.push(`${ansi.dim}... and ${eventsOnDay.length - 4} more${ansi.reset}`);
    }
  }

  // Projects legend
  output.push(ansi.moveTo(panelCol, eventRow + 2));
  output.push(`${ansi.bold}Projects:${ansi.reset}`);
  projects.slice(0, 4).forEach((project, idx) => {
    const color = getProjectColor(idx);
    output.push(ansi.moveTo(panelCol, eventRow + 3 + idx));
    output.push(`${color}\u2588${ansi.reset} ${project.name}`);
  });

  // Milestone symbols
  const symbolRow = eventRow + 3 + Math.min(projects.length, 4) + 1;
  output.push(ansi.moveTo(panelCol, symbolRow));
  output.push(`${ansi.dim}K=Kickoff S=Software M=Meeting${ansi.reset}`);
  output.push(ansi.moveTo(panelCol, symbolRow + 1));
  output.push(`${ansi.dim}P=POC I=Integration L=Launch${ansi.reset}`);

  // Help bar - display configured hotkeys
  const dayKeys = `[${hotkeys.navigation.prevDay.join("/")}/${hotkeys.navigation.nextDay.join("/")}]`;
  const weekKeys = `[${hotkeys.navigation.prevWeek.join("/")}/${hotkeys.navigation.nextWeek.join("/")}]`;
  const monthKeys = `[${hotkeys.navigation.prevMonth.join("/")}/${hotkeys.navigation.nextMonth.join("/")}]`;
  const selectKeys = `[${hotkeys.picker.select.join("/")}]`;
  const cancelKeys = `[${hotkeys.picker.cancel.join("/")}]`;
  const prevStepKey = `[${hotkeys.picker.prevStep.join("/")}]`;
  const nextStepKey = `[${hotkeys.picker.nextStep.join("/")}]`;

  output.push(ansi.moveTo(1, row + 4));
  output.push(`${ansi.dim}${dayKeys} Day  ${weekKeys} Week  ${monthKeys} Month  ${selectKeys} Select  ${cancelKeys} Skip${ansi.reset}`);
  output.push(ansi.moveTo(1, row + 5));
  output.push(`${ansi.dim}${prevStepKey} Prev Step  ${nextStepKey} Next Step${ansi.reset}`);

  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode(output.join("")));
}

/**
 * Show an interactive date picker and return the selected date with action.
 */
export async function pickDate(options: DatePickerOptions): Promise<DatePickerResult> {
  const { store, prompt, stepIndex, totalSteps } = options;

  const today = new Date();
  let currentDate = options.initialDate ? new Date(options.initialDate) : new Date(today);
  let selectedDay = currentDate.getDate();

  function getDaysInMonth(): number {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }

  function prevDayNav(): void {
    if (selectedDay > 1) {
      selectedDay--;
    } else {
      currentDate.setMonth(currentDate.getMonth() - 1);
      selectedDay = getDaysInMonth();
    }
  }

  function nextDayNav(): void {
    const daysInMonth = getDaysInMonth();
    if (selectedDay < daysInMonth) {
      selectedDay++;
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDay = 1;
    }
  }

  function prevWeek(): void {
    if (selectedDay > 7) {
      selectedDay -= 7;
    } else {
      currentDate.setMonth(currentDate.getMonth() - 1);
      const daysInPrevMonth = getDaysInMonth();
      selectedDay = Math.min(daysInPrevMonth, selectedDay + daysInPrevMonth - 7);
    }
  }

  function nextWeek(): void {
    const daysInMonth = getDaysInMonth();
    if (selectedDay + 7 <= daysInMonth) {
      selectedDay += 7;
    } else {
      const overshoot = selectedDay + 7 - daysInMonth;
      currentDate.setMonth(currentDate.getMonth() + 1);
      selectedDay = Math.min(overshoot, getDaysInMonth());
    }
  }

  function prevMonth(): void {
    currentDate.setMonth(currentDate.getMonth() - 1);
    selectedDay = Math.min(selectedDay, getDaysInMonth());
  }

  function nextMonth(): void {
    currentDate.setMonth(currentDate.getMonth() + 1);
    selectedDay = Math.min(selectedDay, getDaysInMonth());
  }

  // Enter raw mode for navigation
  Deno.stdin.setRaw(true);
  render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);

  while (true) {
    const { key } = await readKey();

    // Select date
    if (matchesKey(key, hotkeys.picker.select)) {
      Deno.stdin.setRaw(false);
      return { action: "select", value: formatDate(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) };
    }
    // Cancel - always cancels entire flow
    else if (matchesKey(key, hotkeys.picker.cancel)) {
      Deno.stdin.setRaw(false);
      return { action: "cancel" };
    }
    // Step navigation - previous step
    else if (matchesKey(key, hotkeys.picker.prevStep)) {
      Deno.stdin.setRaw(false);
      return { action: "prev", value: formatDate(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) };
    }
    // Step navigation - next step
    else if (matchesKey(key, hotkeys.picker.nextStep)) {
      Deno.stdin.setRaw(false);
      return { action: "next", value: formatDate(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) };
    }
    // Day navigation
    else if (matchesKey(key, hotkeys.navigation.prevDay)) {
      prevDayNav();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    else if (matchesKey(key, hotkeys.navigation.nextDay)) {
      nextDayNav();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    // Week navigation
    else if (matchesKey(key, hotkeys.navigation.prevWeek)) {
      prevWeek();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    else if (matchesKey(key, hotkeys.navigation.nextWeek)) {
      nextWeek();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    // Month navigation
    else if (matchesKey(key, hotkeys.navigation.prevMonth)) {
      prevMonth();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    else if (matchesKey(key, hotkeys.navigation.nextMonth)) {
      nextMonth();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
    // Jump to today
    else if (matchesKey(key, hotkeys.navigation.today)) {
      currentDate = new Date();
      selectedDay = currentDate.getDate();
      render(currentDate, selectedDay, store, prompt, stepIndex, totalSteps);
    }
  }
}
