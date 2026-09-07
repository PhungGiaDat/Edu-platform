import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// @ts-expect-error Public browser helper is intentionally plain JavaScript.
import { advanceCatReturnTween, canPlayCatMeow, classifyCatTap, shouldRevealAR, smoothstep } from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

describe('AR interaction lifecycle contracts', () => {
  it('keeps the active CAT return ticking ahead of combo phase exits', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const activeReturnMarker = 'const activeCatReturn = interactionState.catReturn;'
    const comboTurningEarlyReturn = 'if (phase === InteractionPhase.COMBO_TURNING) {'
    const comboPlayingEarlyReturn = 'if (phase === InteractionPhase.COMBO_PLAYING) {'

    expect(source.indexOf(activeReturnMarker)).toBeGreaterThanOrEqual(0)
    expect(source.indexOf(activeReturnMarker)).toBeLessThan(source.indexOf(comboTurningEarlyReturn))
    expect(source.indexOf(activeReturnMarker)).toBeLessThan(source.indexOf(comboPlayingEarlyReturn))
    expect(source).toContain("from './static/ar-assets/js/ar-interaction-lifecycle.js'")
    expect(source).not.toContain('function applyCatReturn(')
    expect(source).not.toContain('function smoothstep(')
    expect(source).toContain('comboLatch?.catOriginalYaw ?? 0')
    expect(source).toContain("sendARDebug('CAT_RETURN_CANCELLED_STALE'")
    expect(source).toContain('interactionState.catReturn = null;')
    expect(source).toContain('CAT_RETURN_COMPLETE')
  })

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
