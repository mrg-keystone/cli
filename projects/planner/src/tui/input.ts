/**
 * Raw keyboard input handler for navigation mode.
 * Parses escape sequences and single-character keys from stdin.
 */

export type Key =
  | "up"
  | "down"
  | "left"
  | "right"
  | "enter"
  | "escape"
  | "backspace"
  | "tab"
  | "ctrl_c"
  | string; // Single character keys

export interface KeyEvent {
  key: Key;
  raw: Uint8Array;
}

/**
 * Read a single key press from stdin in raw mode.
 * Handles escape sequences for arrow keys.
 */
export async function readKey(): Promise<KeyEvent> {
  const buffer = new Uint8Array(8);
  const bytesRead = await Deno.stdin.read(buffer);

  if (bytesRead === null || bytesRead === 0) {
    return { key: "", raw: new Uint8Array() };
  }

  const data = buffer.slice(0, bytesRead);

  // Parse escape sequences
  if (data[0] === 0x1b) {
    // Escape or escape sequence
    if (bytesRead === 1) {
      return { key: "escape", raw: data };
    }

    if (data[1] === 0x5b) {
      // CSI sequence (ESC [)
      switch (data[2]) {
        case 0x41: // A
          return { key: "up", raw: data };
        case 0x42: // B
          return { key: "down", raw: data };
        case 0x43: // C
          return { key: "right", raw: data };
        case 0x44: // D
          return { key: "left", raw: data };
        case 0x48: // H (Home)
          return { key: "home", raw: data };
        case 0x46: // F (End)
          return { key: "end", raw: data };
      }
    }

    // Unknown escape sequence
    return { key: "escape", raw: data };
  }

  // Control characters
  if (data[0] === 0x03) {
    return { key: "ctrl_c", raw: data };
  }
  if (data[0] === 0x0d || data[0] === 0x0a) {
    return { key: "enter", raw: data };
  }
  if (data[0] === 0x7f || data[0] === 0x08) {
    return { key: "backspace", raw: data };
  }
  if (data[0] === 0x09) {
    return { key: "tab", raw: data };
  }

  // Regular character
  const decoder = new TextDecoder();
  const char = decoder.decode(data);
  return { key: char, raw: data };
}
