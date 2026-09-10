export function advanceCatReturnTween(
  now: number,
  run: { fromYaw: number; toYaw: number; startedAt: number; durationMs: number },
): { yaw: number; complete: boolean }

export function advanceComboProximityGate(args: {
  now: number
  distance: number | null
  enteredAt: number | null
  comboConsumed: boolean
  config: { enterDistance: number; exitDistance: number; proximityStableMs: number }
}): { enteredAt: number | null; stable: boolean; rearmEligible: boolean }

export function canPlayCatMeow(args: Record<string, unknown>): boolean
export function classifyCatGesture(args: { durationMs: number; dx: number; dy: number }): 'tap' | 'pet' | 'swipe' | 'none'
export function classifyCatTap(args: { meshHit: boolean; proxyHit: boolean }): string
export function getEligibleCatAmbient(args: Record<string, unknown>): 'CAT_LOOK_UP' | 'CAT_SIT' | null
export function getTargetLossGraceState(args: {
  lostAt: number | null
  now: number
  lostGraceMs: number
}): {
  lostForMs: number
  withinGrace: boolean
  confirmed: boolean
  hide: boolean
}
export function isCatOneShotCompletionOwner(args: Record<string, unknown>): boolean

export function normalizeInteractionRule(rule: Record<string, unknown>): {
  id: string
  requiredTargets: string[]
  actorTarget: string | null
  partnerTargets: string[]
  animation: string | null
  priority: number
  action: {
    consumePartners: boolean
    facePrimaryPartner: boolean
    consumeAtRatio: number
  }
  proximity: {
    enterDistance: number
    exitDistance: number
    stableMs: number
    smoothingAlpha: number
  } | null
  actorSource: 'target_order' | 'required_tags_fallback'
  source: 'backend' | 'fallback'
  executable: boolean
}

export function isInteractionRuleMatched(
  rule: ReturnType<typeof normalizeInteractionRule>,
  trackedTargetNames: string[] | Set<string>,
): boolean

export function selectActiveInteractionRule(
  rules: Array<ReturnType<typeof normalizeInteractionRule>>,
  trackedTargetNames: string[] | Set<string>,
): ReturnType<typeof normalizeInteractionRule> | null

export function distanceBetweenPositions(
  a: { x: number; y: number; z: number } | null,
  b: { x: number; y: number; z: number } | null,
): number | null

export function resolveRuleProximityConfig(
  rule: ReturnType<typeof normalizeInteractionRule>,
  fallback?: {
    enterDistance: number
    exitDistance: number
    stableMs: number
    smoothingAlpha: number
  } | null,
): {
  enterDistance: number
  exitDistance: number
  stableMs: number
  smoothingAlpha: number
} | null

export function getInteractionParticipantTargets(
  rule: ReturnType<typeof normalizeInteractionRule>,
): string[]

export function getConsumablePartnerTargets(
  rule: ReturnType<typeof normalizeInteractionRule>,
): string[]

export function setInteractionPartnerVisibility(args: {
  rule: ReturnType<typeof normalizeInteractionRule>
  targetInstances: Map<string, {
    tracked: boolean
    visibleByInteraction: boolean
    model?: { visible: boolean } | null
  }>
  visible: boolean
}): string[]

export function resolveInteractionAnimation(args: {
  rule: ReturnType<typeof normalizeInteractionRule>
  actorInstance: { animations?: Array<{ name?: string }> } | null
}): {
  ok: boolean
  clip: { name?: string } | null
  requested: string | null
  available: string[]
  shouldClearInteraction: boolean
}

export function hasAnimationCapability(
  instanceLike: { animations?: Array<{ name?: string }> } | null,
  clipName: string,
): boolean

export function shouldReplaceCatAnimation(args: { currentPriority: number; nextPriority: number }): boolean
export function shouldRevealAR(args: { cameraReady: boolean; catReady: boolean }): boolean
export function smoothstep(value: number): number
