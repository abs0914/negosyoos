import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine(
    (value) => value.startsWith("https://") || value.startsWith("http://127.0.0.1"),
    "Supabase URL must use HTTPS, except for local development",
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  APP_URL: z.url().refine(
    (value) =>
      value.startsWith("https://") ||
      value.startsWith("http://127.0.0.1") ||
      value.startsWith("http://localhost"),
    "Application URL must use HTTPS, except for local development",
  ),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

type EnvironmentSource = Record<string, string | undefined>;

export function parsePublicEnvironment(source: EnvironmentSource): PublicEnvironment {
  return publicEnvironmentSchema.parse(source);
}

export function parseServerEnvironment(source: EnvironmentSource): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}

export function getPublicEnvironment(): PublicEnvironment {
  return parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    APP_URL: process.env.APP_URL,
  });
}

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    APP_URL: process.env.APP_URL,
    APP_ENV: process.env.APP_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
}
