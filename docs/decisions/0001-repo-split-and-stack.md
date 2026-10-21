# ADR-0001: Separate repository and stack for the lodgement portal

- Status: Accepted
- Date: 2026-10-21
- Deciders: Wally (A22a)

## Context

Design Analytics (DA) is a Python 3.11 evaluation engine whose layering is enforced by import-linter. The lodgement portal is a web application with auth, file upload, a queue and dashboards. Data Scaffolds (DS), a separate A22a product, has TypeScript/Node scaffolding, an audit-ledger design and a review UI that map closely to what the portal needs. A two-week delivery target was set.

## Decision

1. The portal lives in its own repository, `studioa22a/Design-Analytics-Portal`, not inside `Design-Analytics`.
2. The portal is TypeScript on Next.js, with Supabase (Postgres + RLS, Auth, Storage) in the Sydney region as the managed backend.
3. Patterns and scaffolding from DS are reused by copying, never by importing. The DA invariant "no shared codebase, no shared schemas, no dependency between systems" extends to the portal.
4. The portal and the DA engine communicate only through an HTTP contract: a `SubmissionPackage` (estate, lot, declared facts, rulepack version, typed document list) goes out; a determination report comes back. This contract is not implemented in the light version; the snapshot schema is shaped so no field needs adding when it is.
5. Account creation is self-service by magic link; estate access is granted by an operator script with the service role. No password auth.

## Consequences

- Two repositories, two CI pipelines, two deploy targets. Accepted for the sake of keeping each runtime's constraints enforceable where they live.
- Supabase trades some control for speed. Row-level security carries tenancy from Day 1 so multi-estate hosting is configuration, not migration. Data residency is satisfied by region choice.
- `approved` in the portal is an assessor action and nothing else. When the DA hook lands, its report is an input to the assessor, never a state change.
- `src/domain/` plays the role the engine's sealed FactBundle boundary plays in DA: framework-free, fully tested, and the only place transition rules exist. A database mirror plus a drift test keeps SQL honest.
