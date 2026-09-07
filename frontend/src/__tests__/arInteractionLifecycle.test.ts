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

  it('restores CAT idle before consuming the combo and starts return afterward', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const triggerStart = source.indexOf('function triggerComboAnimation')
    const triggerEnd = source.indexOf('\n    function evaluateInteraction', triggerStart)
    const triggerSource = source.slice(triggerStart, triggerEnd)
    const eatFinished = triggerSource.indexOf("sendARDebug('COMBO_ANIMATION_FINISHED'")
    const idleRestore = triggerSource.indexOf("restoreCatIdleAfterOneShot(instance, action, 'CAT_EAT'")
    const comboConsumed = triggerSource.indexOf('setInteractionPhase(InteractionPhase.COMBO_CONSUMED)')
    const returnStart = triggerSource.indexOf("sendARDebug('CAT_RETURN_START'")

    expect(triggerSource).toContain("sendARDebug('CAT_ACTION_STATE_AFTER_EAT'")
    expect(source).toContain("sendARDebug('CAT_IDLE_RESTORED'")
    expect(eatFinished).toBeGreaterThanOrEqual(0)
    expect(idleRestore).toBeGreaterThan(eatFinished)
    expect(comboConsumed).toBeGreaterThan(idleRestore)
    expect(returnStart).toBeGreaterThan(comboConsumed)
    expect(triggerSource.indexOf("sendARDebug('CAT_IDLE_RESTORED'", returnStart)).toBe(-1)
  })

  it('uses immediate one-shot cleanup instead of an unowned delayed stop', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const restoreStart = source.indexOf('function restoreCatIdleAfterOneShot')
    const restoreEnd = source.indexOf('\n    // Cancel CAT_MEOW', restoreStart)
    const restoreSource = source.slice(restoreStart, restoreEnd)
    const cancelStart = source.indexOf('function cancelCatMeowForCombo')
    const cancelEnd = source.indexOf('\n    // Pointer event handler', cancelStart)
    const cancelSource = source.slice(cancelStart, cancelEnd)

    expect(restoreSource).toContain('oneShotAction.fadeOut(0.12)')
    expect(restoreSource).not.toContain('setTimeout(')
    expect(cancelSource).toContain('catTapState.action.fadeOut(0.12)')
    expect(cancelSource).not.toContain('setTimeout(')
  })

  it('restores CAT idle after CAT_MEOW finishes without creating a CAT return', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const meowStart = source.indexOf('function playCatMeow')
    const meowEnd = source.indexOf('\n    // Cancel CAT_MEOW', meowStart)
    const meowSource = source.slice(meowStart, meowEnd)
    const meowFinished = meowSource.indexOf("sendARDebug('CAT_MEOW_FINISHED'")
    const idleRestore = meowSource.indexOf("restoreCatIdleAfterOneShot(catInst, action, 'CAT_MEOW'")

    expect(meowFinished).toBeGreaterThanOrEqual(0)
    expect(idleRestore).toBeGreaterThan(meowFinished)
    expect(meowSource).not.toContain('CAT_RETURN_START')
  })

  it('uses a cached 1.30x CAT proxy only after a direct mesh miss', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const pointerStart = source.indexOf('function onPointerDown')
    const pointerEnd = source.indexOf('\n    // ========== BOOT GATE', pointerStart)
    const pointerSource = source.slice(pointerStart, pointerEnd)

    expect(source).toContain('const CAT_HIT_PROXY_SCALE = 1.30;')
    expect(source).toContain('function cacheCatInteractionProxy(instance)')
    expect(source).toContain('instance.catInteractionProxy = proxy;')
    expect(source).toContain('proxy.visible = false;')
    expect(source).toContain("sendARDebug('CAT_INTERACTION_PROXY_READY'")
    expect(source).toContain('import { advanceCatReturnTween, canPlayCatMeow, classifyCatTap, smoothstep }')
    expect(pointerSource).toContain('raycaster.intersectObject(catInst.model, true)')
    expect(pointerSource).toContain('filter(hit => !hit.object.userData.isCatInteractionProxy)')
    expect(pointerSource).toContain('raycaster.intersectObject(catInst.catInteractionProxy, false)')
    expect(pointerSource).toContain('classifyCatTap({')
    expect(pointerSource).not.toContain('new THREE.Box3()')
    expect(pointerSource).not.toContain('intersectObjects(scene.children')
  })
})
