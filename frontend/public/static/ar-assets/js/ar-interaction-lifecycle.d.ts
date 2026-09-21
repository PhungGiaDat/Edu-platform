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
export function advanceTargetAcquisitionState(args: {
  foundAt: number | null
  stable: boolean
  event: 'found' | 'confirmed_loss'
  now: number
}): {
  foundAt: number | null
  stable: boolean
}

export function calculateVisualPoseSmoothingAlpha(args: {
  dtMs?: number | null
  tauMs?: number | null
}): number

export function advanceVisualPose(args: {
  visualPose?: {
    position?: { x?: number; y?: number; z?: number }
    rotation?: { x?: number; y?: number; z?: number; w?: number }
    scale?: number | null
  } | null
  visualPoseInitialized?: boolean
  rawPose?: {
    position?: { x?: number; y?: number; z?: number }
    rotation?: { x?: number; y?: number; z?: number; w?: number }
    scale?: number | null
  } | null
  dtMs?: number | null
  tauMs?: number | null
}): {
  visualPose: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number; w: number }
    scale: number
  } | null
  visualPoseInitialized: boolean
  snapped: boolean
  smoothingAlpha: number
  positionDelta: number | null
  rotationDeltaDeg: number | null
}
export function isCatOneShotCompletionOwner(args: Record<string, unknown>): boolean

export function normalizeDeviceGravity(
  vector: {
    x?: number | null
    y?: number | null
    z?: number | null
  } | null,
  out?: { x: number; y: number; z: number } | null,
): { x: number; y: number; z: number } | null

export function mapDeviceGravityToScreen(args: {
  vector: { x?: number | null; y?: number | null; z?: number | null } | null
  screenAngle: number | null
  out?: { x: number; y: number; z: number } | null
}): { x: number; y: number; z: number } | null

export function resolveDeviceMotionPermissionMode(args: {
  apiAvailable: boolean
  requestPermissionAvailable: boolean
  permissionResult: string | null
}): 'granted' | 'denied' | 'implicit' | 'unsupported' | 'error'

export function getSurfaceFlatScore(args: {
  targetNormal: { x?: number | null; y?: number | null; z?: number | null } | null
  worldUp: { x?: number | null; y?: number | null; z?: number | null } | null
}): number | null

export function resolveGravityWorldUpCandidate(args: {
  worldUp: { x?: number | null; y?: number | null; z?: number | null } | null
  previousWorldUp?: { x?: number | null; y?: number | null; z?: number | null } | null
  sampleAgeMs: number | null
  maxAgeMs?: number | null
  minStabilityDot?: number | null
}): {
  worldUp: { x: number; y: number; z: number } | null
  available: boolean
  reason: string
  stabilityDot?: number
}

export function resolvePresentationMode(
  requestedMode?: string | null,
): 'AUTO' | 'SCREEN' | 'TABLETOP'

export function resolveInstancePresentationMode(args: {
  instance?: {
    config?: {
      qr_id?: string | null
      presentation_mode?: string | null
    } | null
  } | null
  primaryModelTargetName?: string | null
  requestedPresentationMode?: string | null
}): 'AUTO' | 'SCREEN' | 'TABLETOP'

export function classifySurfaceOrientation(args: {
  requestedMode?: string | null
  flatScore: number | null
  currentMode?: string | null
  candidateMode?: string | null
  candidateSince?: number | null
  now: number
  tabletopEnterScore?: number
  tabletopExitScore?: number
  orientationStableMs?: number
  lastValidAt?: number | null
  orientationLossGraceMs?: number
}): {
  presentationMode: 'SCREEN' | 'TABLETOP'
  candidateMode: 'SCREEN' | 'TABLETOP' | null
  candidateSince: number | null
  changed: boolean
  reason: string
  lastValidAt: number | null
}

export function resolveModelPresentationProfile(profileName: unknown): {
  name: string
  fitRatio: number
  minScale: number
  maxScale: number
} | null

export function resolveForwardAxis(axis: unknown): {
  x: number
  y: number
  z: number
  name: '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'
} | null

export function getGroundedCenterOffset(bounds: {
  min?: { x?: number; y?: number; z?: number }
  max?: { x?: number; y?: number; z?: number }
} | null): { x: number; y: number; z: number } | null

export function getPresentationBoundingWidth(args: {
  size?: { x?: number; y?: number; z?: number }
  forwardAxis?: string | null
}): number | null

export function calculateAutoFitScale(args: {
  boundingBoxWidth?: number | null
  physicalWidth?: number | null
  fitRatio?: number | null
  scaleMultiplier?: number | null
  fallbackScale?: number | null
  minScale?: number | null
  maxScale?: number | null
}): {
  ok: boolean
  reason: string
  finalScale: number
  desiredWidth?: number
  autoScale?: number
}

export function resolveModelPresentation(args: {
  config?: {
    position?: string | number[] | null
    rotation?: string | number[] | null
    scale?: string | number[] | null
    presentation_profile?: string | null
    presentation_scale_multiplier?: number | null
    presentation_position_offset?: string | number[] | null
    presentation_forward_axis?: string | null
  } | null
  bounds?: {
    min?: { x?: number; y?: number; z?: number }
    max?: { x?: number; y?: number; z?: number }
    size?: { x?: number; y?: number; z?: number }
  } | null
  physicalWidth?: number | null
}): {
  mode: 'legacy' | 'profile'
  profile: string | null
  position: number[]
  rotation: number[]
  finalScale: number
  positionOffset: number[]
  forwardAxis: ReturnType<typeof resolveForwardAxis>
  autoFit: ReturnType<typeof calculateAutoFitScale> | null
}

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

export function resolveSessionTargetAdmission(args: {
  entryTarget: string
  rules: Array<ReturnType<typeof normalizeInteractionRule>>
}): Set<string>

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

export function shouldUpdateVisualPose(args: {
  transaction?: {
    runId?: number | null
    actorTarget?: string | null
    partnerTargets?: string[] | null
  } | null
  targetName?: string | null
  currentRunId?: number | null
}): boolean

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

export function selectCapabilityTargetInstance<T extends {
  modelState?: string
  model?: { visible?: boolean } | null
  tracked?: boolean
  interactionReady?: boolean
  }>(args: {
  targetInstances?: Map<string, T> | null
  supportsCapability: (instance: T) => boolean
  requireTracked?: boolean
  requireVisible?: boolean
  requireInteractionReady?: boolean
}): {
  targetName: string
  instance: T
} | null

export function resolveTargetModelAttachment(args: {
  targetName: string
  instance: {
    modelState?: string
    model?: unknown
    anchor?: unknown
    offsetGroup?: unknown
    surfaceRoot?: unknown
  } | null
  tracked: boolean
  sceneReady: boolean
}): {
  action: 'attach' | 'load' | 'wait' | 'skip'
  reason: string
}

export function shouldReplaceCatAnimation(args: { currentPriority: number; nextPriority: number }): boolean
export function shouldRevealAR(args: { cameraReady: boolean; primaryReady: boolean }): boolean
export function smoothstep(value: number): number
