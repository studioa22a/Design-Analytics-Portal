/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads and writes the auth cookies through Next's async cookies() API.
 *
 * The anon key + the user's session cookie means every query runs under
 * row-level security as that user. Use `createServiceClient` only for
 * operator tasks (seeding, granting memberships) and never in a request
 * path that a browser can reach.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '../env';

export async function createServerSupabase() {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

export function createServiceClient() {
  const env = serverEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set; service client unavailable');
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
