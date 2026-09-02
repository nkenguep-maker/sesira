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
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    parsedPublicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    parsedPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

const serverEnvSchema = z.object({
  EXTERNAL_ACTIONS_ENABLED: z.enum(["true", "false"]).default("false"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
});

export const serverEnv = {
  ...publicEnv,
  ...serverEnvSchema.parse({
    EXTERNAL_ACTIONS_ENABLED: process.env.EXTERNAL_ACTIONS_ENABLED,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  }),
};
