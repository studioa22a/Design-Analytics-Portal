'use server';

import { z } from 'zod';
import { createServerSupabase } from '@/db/supabase/server';
import { publicEnv } from '@/db/env';

const schema = z.object({
  email: z.string().email().max(254),
  next: z
    .string()
    .regex(/^\/(?!\/)[A-Za-z0-9/_\-?=&.]*$/)
    .optional(),
});

export type LoginState = { status: 'idle' } | { status: 'sent'; email: string } | { status: 'error'; message: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    next: formData.get('next') ? String(formData.get('next')) : undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const { email, next } = parsed.data;
  const supabase = await createServerSupabase();
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const redirectTo = new URL('/auth/callback', site);
  if (next) redirectTo.searchParams.set('next', next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      // Account creation happens here: an unknown email creates a user and
      // the on_auth_user_created trigger writes its profile. Memberships are
      // granted separately by an operator.
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Do not echo the provider message to the user; log it server-side.
    console.error('signInWithOtp failed', { email, code: error.code, message: error.message });
    return { status: 'error', message: 'We could not send a sign-in link. Try again in a minute.' };
  }

  return { status: 'sent', email };
}
