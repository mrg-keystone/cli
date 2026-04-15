/**
 * Pure ANSI escape code renderer for the TUI.
 * No external dependencies - uses standard terminal escape sequences.
 */

import type { ProjectStore } from "../data/projects.ts";
import { hotkeys } from "../config/hotkeys.ts";

// ANSI escape codes
const ESC = "\x1b";
const CSI = `${ESC}[`;

export const ansi = {
  // Cursor
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  moveTo: (x: number, y: number) => `${CSI}${y};${x}H`,

  // Screen
  clear: `${CSI}2J${CSI}H`,
  clearLine: `${CSI}2K`,

  // Colors
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,

  // Foreground colors
  fg: {
    black: `${CSI}30m`,
    red: `${CSI}31m`,
    green: `${CSI}32m`,
    yellow: `${CSI}33m`,
    blue: `${CSI}34m`,
    magenta: `${CSI}35m`,
    cyan: `${CSI}36m`,
    white: `${CSI}37m`,
    default: `${CSI}39m`,
  },

  // Background colors
  bg: {
    black: `${CSI}40m`,
    red: `${CSI}41m`,
    green: `${CSI}42m`,
    yellow: `${CSI}43m`,
    blue: `${CSI}44m`,
    magenta: `${CSI}45m`,
    cyan: `${CSI}46m`,
    white: `${CSI}47m`,
    default: `${CSI}49m`,
  },
};

export interface RenderState {
  currentDate: Date;
  selectedDay: number;
  store: ProjectStore;
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

/**
 * Project colors palette - maximally distinct colors.
 * Using a carefully chosen set to avoid similar-looking colors.
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
export function getProjectColor(index: number): string {
  return projectColors[index % projectColors.length];
}

/**
 * Render the entire TUI screen.
 */
export function render(state: RenderState): void {
  const { width, height } = getTerminalSize();
  const output: string[] = [];

  output.push(ansi.clear);
  output.push(ansi.hideCursor);

  // Header
  output.push(ansi.moveTo(1, 1));
  output.push(`${ansi.bg.blue}${ansi.fg.white}${ansi.bold} KEYSTONE PLANNER ${ansi.reset}`);

  // Calendar
  output.push(renderCalendar(state));

  // Events panel
  output.push(renderEvents(state, width));

  // Help bar
  output.push(renderHelpBar(height));

  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode(output.join("")));
}

/**
 * Render the calendar grid.
 */
function renderCalendar(state: RenderState): string {
  const { currentDate, selectedDay, store } = state;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build project index map for consistent colors (active projects only)
  const projects = store.getActiveProjects();
  const projectIndexMap = new Map<string, number>();
  projects.forEach((p, i) => projectIndexMap.set(p.name, i));

  // Get days with events - map day to milestone info
  const dayEvents = new Map<number, { milestone: string; project: string; projectIndex: number }>();
  const allEvents = store.getAllEvents();
  for (const event of allEvents) {
    const [eventYear, eventMonth, eventDay] = event.date.split("-").map(Number);
    if (eventYear === year && eventMonth === month + 1) {
      // Only store first event per day (one event per day rule)
      if (!dayEvents.has(eventDay)) {
        const projectIndex = projectIndexMap.get(event.project) ?? 0;
        dayEvents.set(eventDay, { milestone: event.milestone, project: event.project, projectIndex });
      }
    }
  }

  const output: string[] = [];

  // Month/year header
  output.push(ansi.moveTo(3, 3));
  output.push(`${ansi.bold}${months[month]} ${year}${ansi.reset}`);

  // Day headers
  output.push(ansi.moveTo(3, 5));
  output.push(dayHeaders.join("  "));

  // Separator
  output.push(ansi.moveTo(3, 6));
  output.push("\u2500".repeat(20));

  // Calendar grid
  let row = 7;
  let col = 3 + firstDay * 4;

  for (let day = 1; day <= daysInMonth; day++) {
    output.push(ansi.moveTo(col, row));

    const event = dayEvents.get(day);
    const isSelected = day === selectedDay;
    const dayStr = String(day).padStart(2, " ");

    if (isSelected) {
      // Selected day - show with cyan background
      if (event) {
        const symbol = milestoneSymbols[event.milestone] || "?";
        const color = getProjectColor(event.projectIndex);
        output.push(`${ansi.bg.cyan}${color}${symbol}${dayStr}${ansi.reset} `);
      } else {
        output.push(`${ansi.bg.cyan}${ansi.fg.black}[${dayStr}]${ansi.reset} `);
      }
    } else if (event) {
      // Day with event - show project color with milestone symbol
      const symbol = milestoneSymbols[event.milestone] || "?";
      const color = getProjectColor(event.projectIndex);
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

  // Legend - projects with colors
  const legendRow = row + 2;
  output.push(ansi.moveTo(3, legendRow));
  output.push(`${ansi.bold}Projects:${ansi.reset}`);

  projects.slice(0, 6).forEach((project, idx) => {
    const color = getProjectColor(idx);
    output.push(ansi.moveTo(3, legendRow + 1 + idx));
    output.push(`${color}\u2588${ansi.reset} ${project.name}`);
  });

  // Milestone symbols legend
  const symbolRow = legendRow + Math.min(projects.length, 6) + 2;
  output.push(ansi.moveTo(3, symbolRow));
  output.push(`${ansi.bold}Milestones:${ansi.reset}`);
  output.push(ansi.moveTo(3, symbolRow + 1));
  output.push(`${ansi.dim}K=Kickoff  S=Software  M=Meeting${ansi.reset}`);
  output.push(ansi.moveTo(3, symbolRow + 2));
  output.push(`${ansi.dim}P=POC  I=Integration  L=Launch${ansi.reset}`);

  return output.join("");
}

/**
 * Render the events panel.
 */
function renderEvents(state: RenderState, termWidth: number): string {
  const { currentDate, selectedDay, store } = state;
  const dateStr = formatDate(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    selectedDay
  );
  const events = store.getEventsForDate(dateStr);

  // Build project index map for consistent colors (active projects only)
  const projects = store.getActiveProjects();
  const projectIndexMap = new Map<string, number>();
  projects.forEach((p, i) => projectIndexMap.set(p.name, i));

  const startCol = Math.floor(termWidth / 2) + 2;
  const output: string[] = [];

  // Events header
  output.push(ansi.moveTo(startCol, 3));
  output.push(`${ansi.bold}Events${ansi.reset}`);

  // Selected date with quarter
  const quarter = getQuarter(currentDate.getMonth());
  output.push(ansi.moveTo(startCol, 5));
  output.push(`${ansi.fg.cyan}${dateStr}${ansi.reset} ${ansi.fg.yellow}(${quarter})${ansi.reset}`);

  // Events list
  let row = 7;
  if (events.length === 0) {
    output.push(ansi.moveTo(startCol, row));
    output.push(`${ansi.dim}No events${ansi.reset}`);
  } else {
    for (const event of events) {
      const projectIndex = projectIndexMap.get(event.project) ?? 0;
      const color = getProjectColor(projectIndex);
      const symbol = milestoneSymbols[event.milestone] || "?";
      output.push(ansi.moveTo(startCol, row++));
      output.push(`${color}\u2588${ansi.reset} ${event.project}`);
      output.push(ansi.moveTo(startCol + 2, row++));
      output.push(`${ansi.dim}${symbol} ${event.milestone}${ansi.reset}`);
      row++;
    }
  }

  // Upcoming events
  output.push(ansi.moveTo(startCol, row + 1));
  output.push(`${ansi.bold}Upcoming${ansi.reset}`);
  row += 3;

  const upcoming = store.getAllEvents().filter(e => e.date >= dateStr).slice(0, 4);
  for (const event of upcoming) {
    const projectIndex = projectIndexMap.get(event.project) ?? 0;
    const color = getProjectColor(projectIndex);
    const symbol = milestoneSymbols[event.milestone] || "?";
    output.push(ansi.moveTo(startCol, row++));
    output.push(`${ansi.fg.white}${event.date}${ansi.reset}`);
    output.push(ansi.moveTo(startCol, row++));
    output.push(`${color}\u2022${ansi.reset} ${event.project} ${ansi.dim}(${symbol})${ansi.reset}`);
    row++;
  }

  return output.join("");
}

/**
 * Format hotkey array for display.
 */
function formatKeys(keys: string[]): string {
  return keys.map(k => k.replace("ctrl_", "C-")).join("/");
}

/**
 * Render the help bar at the bottom.
 */
function renderHelpBar(termHeight: number): string {
  const { navigation: nav, actions: act } = hotkeys;

  const dayKeys = `[${formatKeys(nav.prevDay)}/${formatKeys(nav.nextDay)}]`;
  const weekKeys = `[${formatKeys(nav.prevWeek)}/${formatKeys(nav.nextWeek)}]`;
  const monthKeys = `[${formatKeys(nav.prevMonth)}/${formatKeys(nav.nextMonth)}]`;
  const todayKey = `[${formatKeys(nav.today)}]`;
  const addKey = `[${formatKeys(act.addProject)}]`;
  const viewKey = `[${formatKeys(act.viewProject)}]`;
  const editKey = `[${formatKeys(act.editProject)}]`;
  const delKey = `[${formatKeys(act.deleteProject)}]`;
  const notesKey = `[${formatKeys(act.openNotes)}]`;
  const quitKey = `[${formatKeys(act.quit)}]`;

  const exportKey = `[${formatKeys(act.export)}]`;

  const output: string[] = [];
  output.push(ansi.moveTo(1, termHeight - 1));
  output.push(`${ansi.dim} ${dayKeys} Day  ${weekKeys} Week  ${monthKeys} Month  ${todayKey} Today${ansi.reset}`);
  output.push(ansi.moveTo(1, termHeight));
  output.push(`${ansi.dim}${addKey} New  ${editKey} Edit  ${notesKey} Notes  ${exportKey} Export  ${quitKey} Quit${ansi.reset}`);
  return output.join("");
}

/**
 * Clear screen and show cursor (cleanup).
 */
export function cleanup(): void {
  const encoder = new TextEncoder();
  Deno.stdout.writeSync(encoder.encode(ansi.clear + ansi.showCursor));
}
