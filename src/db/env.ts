/**
 * Environment variables, validated once at import. Missing values fail
 * loudly at startup rather than at the first request.
 */
import { z } from 'zod';

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
});

const publicSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_SITE_URL: true,
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    throw new Error(`Missing or invalid public env: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  return parsed.data;
}

export function serverEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Missing or invalid server env: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  return parsed.data;
}
