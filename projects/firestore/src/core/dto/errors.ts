import { z } from "#zod";

export const FirestoreErrorPayloadSchema = z.object({
  message: z.string(),
  status: z.string(),
  code: z.number(),
  details: z.unknown().optional(),
});

export type FirestoreErrorPayload = z.infer<typeof FirestoreErrorPayloadSchema>;

export function parseFirestoreErrorPayload(v: unknown): FirestoreErrorPayload {
  return FirestoreErrorPayloadSchema.parse(v);
}

export class FirestoreError extends Error {
  status: string;
  code: number;
  details?: unknown;

  constructor(message: string, status: string, code: number, details?: unknown) {
    super(message);
    this.name = "FirestoreError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const RETRYABLE_STATUSES = new Set([
  "ABORTED",
  "UNAVAILABLE",
  "DEADLINE_EXCEEDED",
]);

export function isRetryable(err: FirestoreError): boolean {
  return RETRYABLE_STATUSES.has(err.status) || err.code >= 500;
}
