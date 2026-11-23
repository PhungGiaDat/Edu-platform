export const LEARNER_TARGET_STABLE_DWELL_MS: number

export type LearnerStableFoundEvent = {
  targetName: string
  word: string
  acquiredAt: number
}

export type LearnerStableLostEvent = {
  targetName: string
  lostAt: number
}

export function createLearnerTargetGate(options?: {
  dwellMs?: number
  onStableFound?: (event: LearnerStableFoundEvent) => void
  onStableLost?: (event: LearnerStableLostEvent) => void
}): {
  onFound(event: LearnerStableFoundEvent): void
  onRawLost(targetName: string): void
  onConfirmedLoss(event: LearnerStableLostEvent): void
  dispose(): void
}
