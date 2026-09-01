import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const serverEnvSchema = publicEnvSchema.extend({
  EXTERNAL_ACTIONS_ENABLED: z.enum(["true", "false"]).default("false"),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const serverEnv = serverEnvSchema.parse({
  ...publicEnv,
  EXTERNAL_ACTIONS_ENABLED: process.env.EXTERNAL_ACTIONS_ENABLED,
});
