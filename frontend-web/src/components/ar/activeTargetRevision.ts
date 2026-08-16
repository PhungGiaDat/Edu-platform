/**
 * Pure state machine for the revisioned active-target protocol.
 *
 * The Shared-Mind Persistent Viewer treats catalog activation as a
 * monotonic revision: the parent asks for ``revision N`` with a fresh
 * target set, the child applies it inside the iframe and replies with
 * ``ACTIVE_TARGETS_APPLIED`` carrying ``revision N``.  The parent's UI
 * keeps rendering the previous acknowledged target set until the new
 * revision is acknowledged, so half-applied revisions never flash to
 * the learner.
 *
 * This module is intentionally framework-free — it is a pure reducer
 * that the React side (and tests) can call directly.
 */

import type { ActiveViewerTarget } from '@/core/types/ARMessages';

export interface ActiveTargetRevisionState {
  desiredRevision: number;
  desiredTargets: ActiveViewerTarget[];
  acknowledgedRevision: number;
  acknowledgedTargets: ActiveViewerTarget[];
  rejectedRevision: number | null;
}

export const initialRevisionState: ActiveTargetRevisionState = {
  desiredRevision: 0,
  desiredTargets: [],
  acknowledgedRevision: 0,
  acknowledgedTargets: [],
  rejectedRevision: null,
};

/**
 * Ask the viewer to bind a new target set.
 *
 * The desired revision is monotonic — every call advances by exactly 1,
 * even if the previous revision was rejected — so the child can use
 * ``===`` to detect stale replies.
 */
export function requestRevision(
  state: ActiveTargetRevisionState,
  targets: ActiveViewerTarget[],
): ActiveTargetRevisionState {
  return {
    ...state,
    desiredRevision: state.desiredRevision + 1,
    desiredTargets: targets,
    rejectedRevision: null,
  };
}

/**
 * Mark the currently desired revision as acknowledged.
 *
 * Stale acknowledgements (revision numbers that no longer match the
 * desired revision) are dropped by returning ``state`` unchanged.  This
 * prevents an in-flight reply from the previous catalog activation from
 * overwriting the freshly-acknowledged one.
 */
export function acknowledgeRevision(
  state: ActiveTargetRevisionState,
  revision: number,
): ActiveTargetRevisionState {
  if (revision !== state.desiredRevision) {
    return state;
  }
  return {
    ...state,
    acknowledgedRevision: revision,
    acknowledgedTargets: state.desiredTargets,
    rejectedRevision: null,
  };
}

/**
 * Record that the child rejected the desired revision.
 *
 * ``desiredTargets`` is preserved so the parent can show the user which
 * card set failed to apply; only the ``rejectedRevision`` marker is set.
 */
export function rejectRevision(
  state: ActiveTargetRevisionState,
  revision: number,
): ActiveTargetRevisionState {
  if (revision !== state.desiredRevision) {
    return state;
  }
  return {
    ...state,
    rejectedRevision: revision,
  };
}
