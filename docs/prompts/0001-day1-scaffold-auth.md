# 0001 — Phase A Day 1: scaffold and auth

- Date: 2026-10-21
- Outcome: merged to main (initial commit)
- Executed by: Claude directly in the cloud workspace (no coding-agent prompt was issued; this file records the brief Claude worked to)

## Brief

Objective: a running Next.js + Supabase project with magic-link sign-in, a profile row per user created by trigger, a memberships table carrying role-per-estate, and CI.

Scope boundary: no estates data beyond the table shell, no lots, no applications, no uploads. Those are Days 2–5.

Invariants applied: state machine defined once in `src/domain` and mirrored in SQL with a drift test; `approved` reachable only by an assessor; every tenant table has `estate_id` and RLS in its creating migration; service role confined to `scripts/`.

Defensive requirements: env validated at startup with zod; magic-link `next` parameter restricted to same-origin paths; sign-out is POST only; missing profile row throws rather than being created on the fly.

Tests: state-machine table integrity, reachability, approval invariant, role gating, reason gating; SQL mirror sync.

## Review item for Wally

Can log in via magic link and out again; dashboard shows "not yet linked to an estate" until a membership is granted with `pnpm grant`.
