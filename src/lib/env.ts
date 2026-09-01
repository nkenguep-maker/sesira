import { z } from "zod";

const rawPublicEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          value.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    {
      message:
        "A Supabase publishable key is required (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    },
  );

const parsedPublicEnv = rawPublicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: parsedPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
  // Keep the core-facing property stable while allowing existing deployments
  // that still expose Supabase's legacy anon-key variable name.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    parsedPublicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    parsedPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

const serverEnvSchema = z.object({
  EXTERNAL_ACTIONS_ENABLED: z.enum(["true", "false"]).default("false"),
});

export const serverEnv = {
  ...publicEnv,
  ...serverEnvSchema.parse({
    EXTERNAL_ACTIONS_ENABLED: process.env.EXTERNAL_ACTIONS_ENABLED,
  }),
};
