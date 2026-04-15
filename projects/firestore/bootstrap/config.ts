export type AppConfig = {
  emulatorPort?: number;
};

export function loadConfig(): AppConfig {
  const raw = Deno.env.get("FIRESTORE_EMULATOR_PORT");
  const port = raw ? Number(raw) : undefined;
  return { emulatorPort: port && !Number.isNaN(port) ? port : undefined };
}
