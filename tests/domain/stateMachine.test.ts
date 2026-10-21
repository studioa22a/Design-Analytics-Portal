import { describe, expect, it } from 'vitest';
import {
  TRANSITIONS,
  TransitionError,
  assertTransition,
  availableTransitions,
  checkTransition,
  isTerminalForSubmitter,
} from '@/domain/stateMachine';
import { APPLICATION_STATES, ROLES } from '@/domain/types';

describe('state machine: table integrity', () => {
  it('has no duplicate from/to pairs', () => {
    const seen = new Set<string>();
    for (const t of TRANSITIONS) {
      const key = `${t.from}->${t.to}`;
      expect(seen.has(key), `duplicate transition ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('only references known states and roles', () => {
    for (const t of TRANSITIONS) {
      expect(APPLICATION_STATES).toContain(t.from);
      expect(APPLICATION_STATES).toContain(t.to);
      for (const r of t.allowedRoles) expect(ROLES).toContain(r);
    }
  });

  it('every state is reachable from draft', () => {
    const reachable = new Set<string>(['draft']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of TRANSITIONS) {
        if (reachable.has(t.from) && !reachable.has(t.to)) {
          reachable.add(t.to);
          grew = true;
        }
      }
    }
    for (const s of APPLICATION_STATES) expect(reachable.has(s), `${s} unreachable`).toBe(true);
  });
});

describe('state machine: approval invariant', () => {
  it('approved is reachable only by an assessor', () => {
    const intoApproved = TRANSITIONS.filter((t) => t.to === 'approved');
    expect(intoApproved.length).toBeGreaterThan(0);
    for (const t of intoApproved) {
      expect(t.allowedRoles).toEqual(['assessor']);
      expect(t.requiresReason).toBe(true);
    }
  });

  it('a submitter cannot move anything to approved', () => {
    for (const from of APPLICATION_STATES) {
      const r = checkTransition(from, 'approved', 'submitter', 'reason');
      expect(r.ok).toBe(false);
    }
  });

  it('a developer cannot change state at all', () => {
    for (const t of TRANSITIONS) expect(t.allowedRoles).not.toContain('developer');
  });
});

describe('checkTransition', () => {
  it('allows a submitter to lodge a draft', () => {
    const r = checkTransition('draft', 'lodged', 'submitter', null);
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown transition', () => {
    const r = checkTransition('draft', 'approved', 'assessor', 'x');
    expect(r).toMatchObject({ ok: false, code: 'no_such_transition' });
  });

  it('rejects a role not on the transition', () => {
    const r = checkTransition('lodged', 'under_assessment', 'submitter', null);
    expect(r).toMatchObject({ ok: false, code: 'role_not_permitted' });
  });

  it('requires a reason where the table says so', () => {
    expect(checkTransition('under_assessment', 'approved', 'assessor', '')).toMatchObject({
      ok: false,
      code: 'reason_required',
    });
    expect(checkTransition('under_assessment', 'approved', 'assessor', '   ')).toMatchObject({
      ok: false,
      code: 'reason_required',
    });
    expect(checkTransition('under_assessment', 'approved', 'assessor', 'Complies').ok).toBe(true);
  });
});

describe('assertTransition', () => {
  it('throws TransitionError with the structured failure', () => {
    expect(() => assertTransition('approved', 'lodged', 'assessor', 'x')).toThrowError(TransitionError);
    try {
      assertTransition('approved', 'lodged', 'assessor', 'x');
    } catch (e) {
      expect((e as TransitionError).failure.code).toBe('no_such_transition');
    }
  });
});

describe('availableTransitions / isTerminalForSubmitter', () => {
  it('lists assessor actions from under_assessment', () => {
    const tos = availableTransitions('under_assessment', 'assessor').map((t) => t.to);
    expect(tos.sort()).toEqual(['approved', 'awaiting_information', 'not_approved'].sort());
  });

  it('approved, not_approved and withdrawn are terminal for submitters', () => {
    expect(isTerminalForSubmitter('approved')).toBe(true);
    expect(isTerminalForSubmitter('not_approved')).toBe(true);
    expect(isTerminalForSubmitter('withdrawn')).toBe(true);
    expect(isTerminalForSubmitter('draft')).toBe(false);
  });
});
