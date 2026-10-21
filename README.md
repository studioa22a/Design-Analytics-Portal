# Design Analytics — Lodgement Portal

The front door for estate design guideline applications. Lot owners, building designers and builders lodge drawings and documents against a per-estate checklist; assessors work a queue, raise requests for information and record Design Review Panel decisions; developers see progress by lot.

This repository is the portal only. The Design Analytics evaluation engine (Python) lives in `studioa22a/Design-Analytics`; the two meet through an HTTP contract in a later phase. See `docs/decisions/0001-repo-split-and-stack.md`.

## Stack

- Next.js 16 (App Router, TypeScript), pnpm, Node 22
- Supabase (Postgres with row-level security, Auth magic links, Storage), region `ap-southeast-2`
- vitest for the domain layer, Playwright for end-to-end (Phase B)

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase values. In the Supabase dashboard, under Authentication → URL Configuration, set the Site URL to your `NEXT_PUBLIC_SITE_URL` and add `<site>/auth/callback` to the redirect allow list.
3. Apply migrations: `pnpm exec supabase link --project-ref <ref>` once, then `pnpm db:migrate`.
4. `pnpm dev` and open http://localhost:3000.

## Granting access

Account creation is self-service: anyone can request a magic link and gets a profile. Access to an estate is granted by an operator:

```
pnpm grant --email person@example.com --estate gen-fynsford --role assessor
```

Roles are `submitter`, `assessor`, `developer`. The person must have signed in once first.

## Layout

```
src/domain/      framework-free types and the application state machine (fully unit-tested)
src/db/          Supabase clients, session helpers, env validation
src/app/         routes: (auth)/login, auth/callback, auth/signout, dashboard, …
supabase/        migrations (one file per change, never edited after merge) and seed data
scripts/         operator scripts (service role; never reachable from the browser)
tests/domain/    vitest
tests/e2e/       Playwright (Phase B)
docs/decisions/  ADRs
docs/prompts/    every build prompt retained verbatim, defective ones included
```

## Rules that are enforced, not advised

- `src/domain/stateMachine.ts` is the only definition of state transitions. The database holds a mirror; `tests/domain/stateMachine.sql-sync.test.ts` fails if they drift.
- `approved` is written by an assessor action only. No automated path exists.
- A `submission_snapshot` is immutable once sealed. A resubmission is a new version.
- Every table with tenant data carries `estate_id` and has RLS enabled in the migration that creates it.
- Service-role access is confined to `scripts/`.

## Checks

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI runs the same four on every push and pull request.
