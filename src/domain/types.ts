/**
 * Domain types for the Design Analytics Lodgement Portal.
 *
 * This module is framework-free. Nothing in src/domain imports Next.js,
 * React or Supabase. Route handlers and pages call into it; it never
 * calls out.
 *
 * Naming mirrors the DA engine where the concept is the same
 * (SubmissionPackage, rulepack_version) so the hand-off to the Python
 * engine in a later phase needs no translation layer.
 */

/** Role a user holds within one estate. A user may hold different roles in different estates. */
export const ROLES = ['submitter', 'assessor', 'developer'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Application lifecycle states for the light version.
 *
 * `approved` and `not_approved` are terminal for submitters. Only an
 * assessor may set either, and only an assessor may reopen (back to
 * `under_assessment`) with a recorded reason. Nothing automated writes
 * `approved` — the DA pre-screen, when it lands, produces a report, never
 * a state change.
 */
export const APPLICATION_STATES = [
  'draft',
  'lodged',
  'under_assessment',
  'awaiting_information',
  'approved',
  'not_approved',
  'withdrawn',
] as const;
export type ApplicationState = (typeof APPLICATION_STATES)[number];

/** Lot typology values. `*` in a rulepack means "all"; a lot itself always has a concrete typology. */
export type LotTypology = string;

export interface Lot {
  id: string;
  estateId: string;
  lotNumber: string;
  stage: string;
  areaM2: number;
  frontageM: number | null;
  cornerLot: boolean;
  lotTypology: LotTypology;
}

/**
 * One entry in an estate's document checklist.
 *
 * `appliesToTypologies` follows the rulepack convention: `['*']` applies to
 * every lot; a specific list applies only to lots whose typology is listed.
 * `required` decides whether lodgement is blocked when no document is
 * attached. Optional items still appear so submitters see what the panel
 * may ask for.
 */
export interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  required: boolean;
  appliesToTypologies: LotTypology[] | ['*'];
  acceptedMimeTypes: string[];
}

export interface EstateChecklistConfig {
  rulepackVersion: string;
  items: ChecklistItem[];
}

/**
 * Lot facts the submitter declares at lodgement. These are recorded on the
 * snapshot as declared, not verified. They are the portal's contribution to
 * the FactBundle's lot-typology inputs; the engine treats them as
 * `extraction_method: "declared"` with MEDIUM confidence at most.
 */
export interface DeclaredLotFacts {
  lotNumber: string;
  stage: string;
  areaM2: number;
  cornerLot: boolean;
  lotTypology: LotTypology;
}

/** A document bound to a snapshot. Immutable once the snapshot is sealed. */
export interface SnapshotDocument {
  id: string;
  checklistItemKey: string;
  filename: string;
  storagePath: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * An immutable lodgement. The portal's equivalent of the sealed FactBundle:
 * written once, never updated. A resubmission is a new snapshot with
 * `version + 1` on the same application.
 */
export interface SubmissionSnapshot {
  id: string;
  applicationId: string;
  version: number;
  rulepackVersion: string;
  lotFactsDeclared: DeclaredLotFacts;
  documents: SnapshotDocument[];
  lodgedAt: string;
  lodgedBy: string;
  sealed: true;
}

/**
 * What the DA engine will consume. A SubmissionSnapshot plus estate and lot
 * identity is already this shape; nothing needs adding when the hook lands.
 */
export interface SubmissionPackage {
  estateId: string;
  estateSlug: string;
  lotId: string;
  snapshot: SubmissionSnapshot;
}

export const AUDIT_EVENT_TYPES = [
  'application.created',
  'application.state_changed',
  'application.assigned',
  'snapshot.sealed',
  'document.uploaded',
  'document.removed',
  'message.posted',
  'decision.recorded',
  'decision.reopened',
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export interface AuditEvent {
  estateId: string;
  applicationId: string | null;
  actorId: string;
  eventType: AuditEventType;
  fromState: ApplicationState | null;
  toState: ApplicationState | null;
  payload: Record<string, unknown>;
  occurredAt: string;
}
