import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/db/supabase/server';

/** POST only: a GET sign-out can be triggered by a prefetch or an image tag. */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin), { status: 303 });
}
