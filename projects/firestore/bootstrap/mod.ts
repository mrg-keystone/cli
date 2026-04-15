import { Firestore } from "@client/mod-root.ts";
import type { ServiceAccount } from "@core/data/auth/mod.ts";
import { loadConfig } from "./config.ts";

export function bootstrap(serviceAcct: ServiceAccount): Firestore {
  const cfg = loadConfig();
  return new Firestore(serviceAcct, { emulatorPort: cfg.emulatorPort });
}
