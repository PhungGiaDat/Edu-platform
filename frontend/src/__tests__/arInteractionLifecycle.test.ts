import { describe, expect, it } from 'vitest'
import {
  advanceCatReturnTween,
  canPlayCatMeow,
  classifyCatTap,
  shouldRevealAR,
  smoothstep,
} from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

describe('AR interaction lifecycle contracts', () => {
  it('reveals AR only after both camera and CAT are ready', () => {
    expect(shouldRevealAR({ cameraReady: false, catReady: false })).toBe(false)
    expect(shouldRevealAR({ cameraReady: true, catReady: false })).toBe(false)
    expect(shouldRevealAR({ cameraReady: false, catReady: true })).toBe(false)
    expect(shouldRevealAR({ cameraReady: true, catReady: true })).toBe(true)
  })

  it('allows CAT meow in COMBO_CONSUMED only after the CAT return completes', () => {
    const catReadyAndTracked = {
      phase: 'COMBO_CONSUMED',
      catReady: true,
      catTracked: true,
      catMeowing: false,
    }

    expect(canPlayCatMeow({ ...catReadyAndTracked, catReturn: null })).toBe(true)
    expect(canPlayCatMeow({ ...catReadyAndTracked, catReturn: { runId: 4 } })).toBe(false)
  })

  it('classifies direct mesh hits before proxy hits and rejects a miss', () => {
    expect(classifyCatTap({ meshHit: true, proxyHit: true })).toBe('mesh')
    expect(classifyCatTap({ meshHit: false, proxyHit: true })).toBe('proxy')
    expect(classifyCatTap({ meshHit: false, proxyHit: false })).toBe('miss')
  })

  it('advances a CAT return deterministically through its real yaw range', () => {
    const returnState = {
      fromYaw: 55 * Math.PI / 180,
      toYaw: 0.2,
      startedAt: 1000,
      durationMs: 400,
      runId: 4,
    }

    const halfway = advanceCatReturnTween(1200, returnState)
    expect(halfway.complete).toBe(false)
    expect(halfway.yaw).toBeLessThan(returnState.fromYaw)
    expect(halfway.yaw).toBeGreaterThan(returnState.toYaw)
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)

    expect(advanceCatReturnTween(1401, returnState)).toEqual({
      yaw: returnState.toYaw,
      complete: true,
    })
  })
})
