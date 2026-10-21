/**
 * Session refresh for the Next.js proxy (formerly middleware). Must be
 * called on every matched request so expired access tokens are renewed
 * before a Server Component reads them.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '../env';

export async function updateSession(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the JWT against the auth server; getSession() does not.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
