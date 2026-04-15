import { z } from "#zod";

export const ValueSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);

export type Value = z.infer<typeof ValueSchema>;

export function parseValue(v: unknown): Value {
  return ValueSchema.parse(v);
}
