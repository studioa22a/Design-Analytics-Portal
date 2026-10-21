/**
 * Current-user helpers for Server Components and actions. Everything here
 * runs under RLS as the signed-in user.
 */
import { redirect } from 'next/navigation';
import type { Role } from '@/domain/types';
import { createServerSupabase } from './supabase/server';

export interface Membership {
  estateId: string;
  estateSlug: string;
  estateName: string;
  role: Role;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string | null;
  organisationId: string | null;
  memberships: Membership[];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('email, display_name, organisation_id').eq('user_id', user.id).single(),
    supabase.from('memberships').select('role, estate_id, estates ( slug, name )').eq('user_id', user.id),
  ]);

  if (profileError || !profile) {
    // The signup trigger should have created this row. Its absence is a
    // defect to surface, not to paper over.
    throw new Error(`profile missing for user ${user.id}: ${profileError?.message ?? 'no row'}`);
  }
  if (membershipError) throw new Error(`memberships query failed: ${membershipError.message}`);

  return {
    id: user.id,
    email: profile.email,
    displayName: profile.display_name,
    organisationId: profile.organisation_id,
    memberships: (memberships ?? []).map((m) => {
      const estate = Array.isArray(m.estates) ? m.estates[0] : m.estates;
      return {
        estateId: m.estate_id as string,
        estateSlug: (estate?.slug ?? '') as string,
        estateName: (estate?.name ?? '') as string,
        role: m.role as Role,
      };
    }),
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Throws (rather than redirecting) so callers in actions get a clear error. */
export function requireRole(user: CurrentUser, estateId: string, role: Role): Membership {
  const m = user.memberships.find((x) => x.estateId === estateId && x.role === role);
  if (!m) throw new Error(`user ${user.id} lacks role ${role} on estate ${estateId}`);
  return m;
}
