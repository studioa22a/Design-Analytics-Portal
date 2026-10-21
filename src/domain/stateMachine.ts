/**
 * Application state machine.
 *
 * This is the single definition of which transitions exist and who may
 * trigger them. Route handlers call `assertTransition`; the database
 * trigger in supabase/migrations mirrors `TRANSITIONS` so a direct SQL
 * write cannot bypass it. If this table changes, the migration must change
 * in the same pull request (see docs/decisions/0001).
 *
 * Invariant: `approved` is reachable only via an assessor action. No path
 * from any automated actor exists, and none may be added.
 */

import type { ApplicationState, Role } from './types';

export interface Transition {
  from: ApplicationState;
  to: ApplicationState;
  allowedRoles: Role[];
  /** Whether the actor must supply a reason that is written to the audit log. */
  requiresReason: boolean;
}

export const TRANSITIONS: readonly Transition[] = [
  // Submitter lodges a draft. Validation (checklist complete, facts declared)
  // happens in the lodge action before this transition is attempted.
  { from: 'draft', to: 'lodged', allowedRoles: ['submitter'], requiresReason: false },
  { from: 'draft', to: 'withdrawn', allowedRoles: ['submitter'], requiresReason: false },

  // Assessor picks up a lodged application.
  { from: 'lodged', to: 'under_assessment', allowedRoles: ['assessor'], requiresReason: false },
  { from: 'lodged', to: 'withdrawn', allowedRoles: ['submitter'], requiresReason: false },

  // Assessor raises an RFI, or records a decision.
  { from: 'under_assessment', to: 'awaiting_information', allowedRoles: ['assessor'], requiresReason: true },
  { from: 'under_assessment', to: 'approved', allowedRoles: ['assessor'], requiresReason: true },
  { from: 'under_assessment', to: 'not_approved', allowedRoles: ['assessor'], requiresReason: true },
  { from: 'under_assessment', to: 'withdrawn', allowedRoles: ['submitter'], requiresReason: false },

  // Submitter resubmits (a new snapshot is sealed before this transition).
  { from: 'awaiting_information', to: 'under_assessment', allowedRoles: ['submitter'], requiresReason: false },
  { from: 'awaiting_information', to: 'withdrawn', allowedRoles: ['submitter'], requiresReason: false },

  // Reopening a decision is an assessor act with a recorded reason.
  { from: 'approved', to: 'under_assessment', allowedRoles: ['assessor'], requiresReason: true },
  { from: 'not_approved', to: 'under_assessment', allowedRoles: ['assessor'], requiresReason: true },
] as const;

export type TransitionFailure =
  | { ok: false; code: 'no_such_transition'; from: ApplicationState; to: ApplicationState }
  | { ok: false; code: 'role_not_permitted'; from: ApplicationState; to: ApplicationState; role: Role }
  | { ok: false; code: 'reason_required'; from: ApplicationState; to: ApplicationState };

export type TransitionResult = { ok: true; transition: Transition } | TransitionFailure;

export function findTransition(from: ApplicationState, to: ApplicationState): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Check a proposed transition. Returns a structured result; never throws.
 * Callers that want an exception use `assertTransition`.
 */
export function checkTransition(
  from: ApplicationState,
  to: ApplicationState,
  role: Role,
  reason: string | null | undefined,
): TransitionResult {
  const transition = findTransition(from, to);
  if (!transition) return { ok: false, code: 'no_such_transition', from, to };
  if (!transition.allowedRoles.includes(role)) {
    return { ok: false, code: 'role_not_permitted', from, to, role };
  }
  if (transition.requiresReason && !(reason && reason.trim().length > 0)) {
    return { ok: false, code: 'reason_required', from, to };
  }
  return { ok: true, transition };
}

export class TransitionError extends Error {
  constructor(public readonly failure: TransitionFailure) {
    super(`Transition ${failure.from} -> ${failure.to} rejected: ${failure.code}`);
    this.name = 'TransitionError';
  }
}

export function assertTransition(
  from: ApplicationState,
  to: ApplicationState,
  role: Role,
  reason: string | null | undefined,
): Transition {
  const result = checkTransition(from, to, role, reason);
  if (!result.ok) throw new TransitionError(result);
  return result.transition;
}

/** States a given role may move an application to from `from`. Used by the UI to render action buttons. */
export function availableTransitions(from: ApplicationState, role: Role): Transition[] {
  return TRANSITIONS.filter((t) => t.from === from && t.allowedRoles.includes(role));
}

/** True when no submitter action can change the state. */
export function isTerminalForSubmitter(state: ApplicationState): boolean {
  return availableTransitions(state, 'submitter').length === 0;
}

/**
 * Render the transition table as the SQL array literal used by the
 * database trigger. Kept here so a test can diff the migration against
 * this module and fail if they drift.
 */
export function transitionsAsSqlRows(): string[] {
  return TRANSITIONS.map(
    (t) =>
      `('${t.from}', '${t.to}', ARRAY[${t.allowedRoles.map((r) => `'${r}'`).join(', ')}]::portal_role[], ${t.requiresReason})`,
  );
}
