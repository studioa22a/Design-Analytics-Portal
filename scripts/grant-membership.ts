/**
 * Operator script: grant a role on an estate to a user by email.
 *
 *   pnpm tsx scripts/grant-membership.ts --email you@example.com --estate gen-fynsford --role assessor
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local. The user must have
 * signed in at least once (so their profile row exists); otherwise the
 * script exits non-zero and says so. Nothing is inferred or created on the
 * user's behalf.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { ROLES, type Role } from '../src/domain/types';

function loadDotEnvLocal() {
  try {
    const text = readFileSync('.env.local', 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  } catch {
    /* no .env.local: rely on process env */
  }
}

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    console.error(`missing --${name}`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

async function main() {
  loadDotEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(2);
  }

  const email = arg('email').toLowerCase();
  const estateSlug = arg('estate');
  const role = arg('role') as Role;
  if (!ROLES.includes(role)) {
    console.error(`role must be one of ${ROLES.join(', ')}`);
    process.exit(2);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: profile, error: pErr } = await db.from('profiles').select('user_id').eq('email', email).maybeSingle();
  if (pErr) throw pErr;
  if (!profile) {
    console.error(`no profile for ${email}: ask them to sign in once first`);
    process.exit(1);
  }

  const { data: estate, error: eErr } = await db.from('estates').select('id, name').eq('slug', estateSlug).maybeSingle();
  if (eErr) throw eErr;
  if (!estate) {
    console.error(`no estate with slug ${estateSlug}`);
    process.exit(1);
  }

  const { error: mErr } = await db
    .from('memberships')
    .upsert({ user_id: profile.user_id, estate_id: estate.id, role }, { onConflict: 'user_id,estate_id,role' });
  if (mErr) throw mErr;

  console.log(`granted ${role} on ${estate.name} to ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
