import config from "./hotkeys.json" with { type: "json" };

export interface HotkeyConfig {
  navigation: {
    prevDay: string[];
    nextDay: string[];
    prevWeek: string[];
    nextWeek: string[];
    prevMonth: string[];
    nextMonth: string[];
    today: string[];
  };
  actions: {
    quit: string[];
    addProject: string[];
    editProject: string[];
    viewProject: string[];
    deleteProject: string[];
    openNotes: string[];
    export: string[];
    save: string[];
  };
  picker: {
    select: string[];
    cancel: string[];
    prevStep: string[];
    nextStep: string[];
  };
}

export const hotkeys: HotkeyConfig = config;

/**
 * Check if a key matches any of the configured hotkeys for an action.
 */
export function matchesKey(key: string, keys: string[]): boolean {
  return keys.includes(key);
}
