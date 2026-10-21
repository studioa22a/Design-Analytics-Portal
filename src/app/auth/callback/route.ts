import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/db/supabase/server';

const SAFE_NEXT = /^\/(?!\/)[A-Za-z0-9/_\-?=&.]*$/;

/**
 * Magic-link landing. Supabase sends the user here with a `code`; we
 * exchange it for a session cookie and continue to `next` (same-origin
 * paths only) or the dashboard.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next');
  const next = nextParam && SAFE_NEXT.test(nextParam) ? nextParam : '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', url.origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('exchangeCodeForSession failed', { code: error.code, message: error.message });
    return NextResponse.redirect(new URL('/auth/error?reason=exchange_failed', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
