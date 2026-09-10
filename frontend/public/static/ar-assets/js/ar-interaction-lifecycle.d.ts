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

export function resolveCatFishComboRule(args: {
  primaryTargetName: string
  secondaryTargetName: string
  rules: Array<Record<string, unknown>>
}): {
  primaryTargetName: 'cat001'
  secondaryTargetName: 'fish001'
  source: 'backend' | 'fallback'
  enterDistance: number
  exitDistance: number
  proximityStableMs: number
  smoothingAlpha: number
} | null

export function selectComboSecondaryTargetName(args: {
  primaryTargetName: string
  targetNames: string[]
}): string | null

export function shouldReplaceCatAnimation(args: { currentPriority: number; nextPriority: number }): boolean
export function shouldRevealAR(args: { cameraReady: boolean; catReady: boolean }): boolean
export function smoothstep(value: number): number
