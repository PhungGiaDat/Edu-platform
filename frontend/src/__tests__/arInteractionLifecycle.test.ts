import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  advanceCatReturnTween,
  advanceComboProximityGate,
  canPlayCatMeow,
  classifyCatGesture,
  classifyCatTap,
  getEligibleCatAmbient,
  getTargetLossGraceState,
  isInteractionRuleMatched,
  isCatOneShotCompletionOwner,
  normalizeInteractionRule,
  resolveCatFishComboRule,
  selectComboSecondaryTargetName,
  selectActiveInteractionRule,
  shouldReplaceCatAnimation,
  shouldRevealAR,
  smoothstep,
} from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

describe('AR interaction lifecycle contracts', () => {
  it('normalizes a configured pair using target order for actor and backend proximity', () => {
    const rule = normalizeInteractionRule({
      tags: ['dog001', 'bone001'],
      target_order: ['dog001', 'bone001'],
      combo_id: 'dog-eats-bone',
      animation_trigger: 'DOG_EAT',
      priority: 40,
      proximity: {
        enter_distance: 0.45,
        exit_distance: 0.55,
        proximity_stable_ms: 300,
        smoothing_alpha: 0.25,
      },
    })

    expect(rule).toEqual({
      id: 'dog-eats-bone',
      requiredTargets: ['dog001', 'bone001'],
      actorTarget: 'dog001',
      partnerTargets: ['bone001'],
      animation: 'DOG_EAT',
      priority: 40,
      proximity: {
        enterDistance: 0.45,
        exitDistance: 0.55,
        stableMs: 300,
        smoothingAlpha: 0.25,
      },
      actorSource: 'target_order',
      executable: true,
    })
  })

  it('filters unrelated target-order entries before selecting the actor', () => {
    const rule = normalizeInteractionRule({
      tags: ['dog001', 'bone001'],
      target_order: ['unrelated001', 'bone001', 'dog001'],
      combo_id: 'dog-eats-bone',
    })

    expect(rule).toMatchObject({
      actorTarget: 'bone001',
      partnerTargets: ['dog001'],
      actorSource: 'target_order',
      executable: true,
    })
  })

  it('uses required-tags actor fallback and marks three-target rules unsupported', () => {
    expect(normalizeInteractionRule({
      tags: ['cat001', 'fish001'],
      combo_id: 'cat-fish',
      priority: 100,
    })).toMatchObject({
      actorTarget: 'cat001',
      partnerTargets: ['fish001'],
      actorSource: 'required_tags_fallback',
      executable: true,
    })

    expect(normalizeInteractionRule({
      tags: ['rain001', 'soil001', 'seed001'],
      combo_id: 'grow-seed',
    })).toMatchObject({
      actorTarget: 'rain001',
      partnerTargets: ['soil001', 'seed001'],
      executable: false,
    })
  })

  it('rejects unsupported high-priority rules even when every target is tracked', () => {
    const unsupported = normalizeInteractionRule({
      tags: ['rain001', 'soil001', 'seed001'],
      target_order: ['rain001', 'soil001', 'seed001'],
      combo_id: 'grow-seed',
      priority: 1000,
    })

    expect(unsupported.executable).toBe(false)
    expect(isInteractionRuleMatched(
      unsupported,
      ['rain001', 'soil001', 'seed001'],
    )).toBe(false)
    expect(selectActiveInteractionRule(
      [unsupported],
      ['rain001', 'soil001', 'seed001'],
    )).toBeNull()
  })

  it('matches configured pairs independently of unrelated tracked targets', () => {
    const catFish = normalizeInteractionRule({
      tags: ['cat001', 'fish001'],
      combo_id: 'cat-fish',
      priority: 100,
    })
    const dogBone = normalizeInteractionRule({
      tags: ['dog001', 'bone001'],
      combo_id: 'dog-bone',
      priority: 50,
    })

    expect(isInteractionRuleMatched(catFish, ['cat001', 'fish001'])).toBe(true)
    expect(isInteractionRuleMatched(catFish, ['cat001', 'fish001', 'dog001'])).toBe(true)
    expect(isInteractionRuleMatched(catFish, ['cat001'])).toBe(false)
    expect(isInteractionRuleMatched(dogBone, new Set(['dog001', 'bone001']))).toBe(true)
    expect(selectActiveInteractionRule([dogBone], ['unknown001'])).toBeNull()
  })

  it('selects matching rules by priority then lexical id regardless of input order', () => {
    const catFish = normalizeInteractionRule({
      tags: ['cat001', 'fish001'],
      target_order: ['cat001', 'fish001'],
      combo_id: 'cat-fish',
      priority: 100,
    })
    const dogBone = normalizeInteractionRule({
      tags: ['dog001', 'bone001'],
      target_order: ['dog001', 'bone001'],
      combo_id: 'dog-bone',
      priority: 50,
    })
    const tracked = ['bone001', 'fish001', 'dog001', 'cat001']

    for (const rules of [[dogBone, catFish], [catFish, dogBone]]) {
      expect(selectActiveInteractionRule(rules, tracked)).toMatchObject({
        id: 'cat-fish',
        actorTarget: 'cat001',
        partnerTargets: ['fish001'],
      })
    }

    const aRule = normalizeInteractionRule({
      tags: ['marker-a', 'marker-b'],
      combo_id: 'a-rule',
      priority: 20,
    })
    const bRule = normalizeInteractionRule({
      tags: ['marker-c', 'marker-d'],
      combo_id: 'b-rule',
      priority: 20,
    })

    expect(selectActiveInteractionRule(
      [bRule, aRule],
      ['marker-d', 'marker-b', 'marker-c', 'marker-a'],
    )?.id).toBe('a-rule')
    expect(selectActiveInteractionRule(
      [aRule, bRule],
      ['marker-a', 'marker-c', 'marker-b', 'marker-d'],
    )?.id).toBe('a-rule')
  })

  it('passes the canonical primary target explicitly to every runtime combo-secondary selector', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const callsites = [
      [
        'function computeAnchorDistance()',
        'function updateFilteredDistance(raw)',
      ],
      [
        'function evaluateInteraction(now)',
        '// ========== TARGET FOUND / LOST ==========',
      ],
    ] as const

    for (const [startMarker, endMarker] of callsites) {
      const start = source.indexOf(startMarker)
      const end = source.indexOf(endMarker, start)
      const functionSource = source.slice(start, end)

      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeGreaterThan(start)
      expect(functionSource).toContain('selectComboSecondaryTargetName({')
      expect(functionSource).toContain('primaryTargetName: primaryModelTargetName,')
      expect(functionSource).not.toMatch(
        /selectComboSecondaryTargetName\(\{\s*primaryTargetName\s*,/,
      )
    }
  })

  it('keeps target-loss visibility processing independent from interaction evaluation', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const processorStart = source.indexOf('function processPendingTargetLosses(now)')
    const evaluatorStart = source.indexOf('function evaluateInteraction(now)')
    const evaluatorEnd = source.indexOf('// ========== TARGET FOUND / LOST ==========', evaluatorStart)
    const evaluatorSource = source.slice(evaluatorStart, evaluatorEnd)
    const updateStart = source.indexOf('const cameraPipelineModule = {')
    const updateEnd = source.indexOf('// Image target events', updateStart)
    const updateSource = source.slice(updateStart, updateEnd)

    expect(processorStart).toBeGreaterThanOrEqual(0)
    expect(evaluatorStart).toBeGreaterThan(processorStart)
    expect(evaluatorSource).not.toContain('pendingGraceHides')
    expect(updateSource.indexOf('processPendingTargetLosses(now);')).toBeGreaterThanOrEqual(0)
    expect(updateSource.indexOf('processPendingTargetLosses(now);')).toBeLessThan(
      updateSource.indexOf('evaluateInteraction(now);'),
    )
    expect(updateSource.indexOf('evaluateInteraction(now);')).toBeLessThan(
      updateSource.indexOf('updateCatAmbient(now);'),
    )
  })

  it('classifies target loss at the 300ms boundary without hiding during grace', () => {
    expect(getTargetLossGraceState({
      lostAt: 1000,
      now: 1200,
      lostGraceMs: 300,
    })).toMatchObject({
      lostForMs: 200,
      withinGrace: true,
      confirmed: false,
      hide: false,
    })

    expect(getTargetLossGraceState({
      lostAt: 1000,
      now: 1301,
      lostGraceMs: 300,
    })).toMatchObject({
      lostForMs: 301,
      withinGrace: false,
      confirmed: true,
      hide: true,
    })
  })

  it('cancels a pending hide only for a target reacquired within grace', () => {
    const pendingGraceHides = new Map([['cat001', 1000]])
    const reacquired = getTargetLossGraceState({
      lostAt: pendingGraceHides.get('cat001')!,
      now: 1180,
      lostGraceMs: 300,
    })

    if (reacquired.withinGrace) pendingGraceHides.delete('cat001')

    expect(reacquired.withinGrace).toBe(true)
    expect(reacquired.confirmed).toBe(false)
    expect(pendingGraceHides.has('cat001')).toBe(false)
  })

  it('never calls a 1.2-second reacquisition within grace', () => {
    const reacquired = getTargetLossGraceState({
      lostAt: 1000,
      now: 2200,
      lostGraceMs: 300,
    })

    expect(reacquired.withinGrace).toBe(false)
    expect(reacquired.confirmed).toBe(true)
    expect(reacquired.hide).toBe(true)
  })

  it('keeps the active CAT return ticking ahead of combo phase exits', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const activeReturnMarker = 'const activeCatReturn = interactionState.catReturn;'
    const comboTurningEarlyReturn = 'if (phase === InteractionPhase.COMBO_TURNING) {'
    const comboPlayingEarlyReturn = 'if (phase === InteractionPhase.COMBO_PLAYING) {'

    expect(source.indexOf(activeReturnMarker)).toBeGreaterThanOrEqual(0)
    expect(source.indexOf(activeReturnMarker)).toBeLessThan(source.indexOf(comboTurningEarlyReturn))
    expect(source.indexOf(activeReturnMarker)).toBeLessThan(source.indexOf(comboPlayingEarlyReturn))
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

  it('completes the real CAT return lifecycle during COMBO_CONSUMED', () => {
    const returnLifecycle: {
      phase: string
      comboRunId: number
      catReturn: {
        fromYaw: number
        toYaw: number
        startedAt: number
        durationMs: number
        runId: number
      } | null
      yaw: number
      events: string[]
    } = {
      phase: 'COMBO_CONSUMED',
      comboRunId: 4,
      catReturn: {
        fromYaw: 55 * Math.PI / 180,
        toYaw: 0.2,
        startedAt: 1000,
        durationMs: 400,
        runId: 4,
      },
      yaw: 55 * Math.PI / 180,
      events: [] as string[],
    }

    const tickReturn = (now: number) => {
      const activeReturn = returnLifecycle.catReturn
      if (!activeReturn || activeReturn.runId !== returnLifecycle.comboRunId) return

      const tick = advanceCatReturnTween(now, activeReturn)
      returnLifecycle.yaw = tick.yaw
      if (tick.complete) {
        returnLifecycle.catReturn = null
        returnLifecycle.events.push('CAT_RETURN_COMPLETE')
      }
    }

    expect(returnLifecycle.phase).toBe('COMBO_CONSUMED')
    tickReturn(1200)
    expect(returnLifecycle.yaw).toBeLessThan(55 * Math.PI / 180)
    expect(returnLifecycle.yaw).toBeGreaterThan(0.2)
    expect(returnLifecycle.catReturn).not.toBeNull()
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)

    tickReturn(1401)
    expect(returnLifecycle.yaw).toBe(0.2)
    expect(returnLifecycle.catReturn).toBeNull()
    expect(returnLifecycle.events).toEqual(['CAT_RETURN_COMPLETE'])
  })

  it('restores CAT idle before consuming the combo and starts return afterward', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const triggerStart = source.indexOf('function triggerComboAnimation')
    const triggerEnd = source.indexOf('\n    function evaluateInteraction', triggerStart)
    const triggerSource = source.slice(triggerStart, triggerEnd)
    const eatFinished = triggerSource.indexOf("sendARDebug('COMBO_ANIMATION_FINISHED'")
    const idleRestore = triggerSource.indexOf("restoreCatIdleAfterOneShot(instance, action, 'CAT_EAT'")
    const comboConsumed = triggerSource.indexOf('setInteractionPhase(InteractionPhase.COMBO_CONSUMED)')
    const returnCreated = triggerSource.indexOf('interactionState.catReturn = {')
    const returnStart = triggerSource.indexOf("sendARDebug('CAT_RETURN_START'")

    expect(triggerSource).toContain("sendARDebug('CAT_ACTION_STATE_AFTER_EAT'")
    expect(source).toContain("sendARDebug('CAT_IDLE_RESTORED'")
    expect(eatFinished).toBeGreaterThanOrEqual(0)
    expect(idleRestore).toBeGreaterThan(eatFinished)
    expect(comboConsumed).toBeGreaterThan(idleRestore)
    expect(returnCreated).toBeGreaterThan(comboConsumed)
    expect(returnStart).toBeGreaterThan(returnCreated)
    expect(triggerSource).not.toContain('Math.abs(fromYaw - toYaw) > 0.01')
    expect(triggerSource.indexOf("sendARDebug('CAT_IDLE_RESTORED'", returnStart)).toBe(-1)
  })

  it('uses immediate one-shot cleanup instead of an unowned delayed stop', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const restoreStart = source.indexOf('function restoreCatIdleAfterOneShot')
    const restoreEnd = source.indexOf('\n    function cacheCatInteractionProxy', restoreStart)
    const restoreSource = source.slice(restoreStart, restoreEnd)
    const cancelStart = source.indexOf('function cancelActiveCatOneShotForCombo')
    const cancelEnd = source.indexOf('\n    function playCatOneShot', cancelStart)
    const cancelSource = source.slice(cancelStart, cancelEnd)

    expect(restoreSource).toContain('oneShotAction.fadeOut(0.12)')
    expect(restoreSource).not.toContain('setTimeout(')
    expect(cancelSource).toContain('catAnimationState.generation++')
    expect(cancelSource).toContain('catAnimationState.action.fadeOut(0.12)')
    expect(cancelSource).not.toContain('setTimeout(')
  })

  it('restores CAT idle after CAT_MEOW finishes without creating a CAT return', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const finishStart = source.indexOf('function emitCatOneShotFinished')
    const finishEnd = source.indexOf('\n    function cancelActiveCatOneShotForCombo', finishStart)
    const finishSource = source.slice(finishStart, finishEnd)
    const oneShotStart = source.indexOf('function playCatOneShot')
    const oneShotEnd = source.indexOf('\n    function playCatMeow', oneShotStart)
    const oneShotSource = source.slice(oneShotStart, oneShotEnd)
    const finishedDispatch = oneShotSource.indexOf('emitCatOneShotFinished(source, clip, generation)')
    const idleRestore = oneShotSource.indexOf('restoreCatIdleAfterOneShot(catInst, action, source, clip.name)')

    expect(finishSource).toContain("sendARDebug('CAT_MEOW_FINISHED'")
    expect(finishedDispatch).toBeGreaterThanOrEqual(0)
    expect(idleRestore).toBeGreaterThan(finishedDispatch)
    expect(oneShotSource).not.toContain('CAT_RETURN_START')
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
    expect(source).toContain('canPlayCatMeow')
    expect(source).toContain('classifyCatTap')
    expect(pointerSource).toContain('raycaster.intersectObject(catInst.model, true)')
    expect(pointerSource).toContain('filter(hit => !hit.object.userData.isCatInteractionProxy)')
    expect(pointerSource).toContain('raycaster.intersectObject(catInst.catInteractionProxy, false)')
    expect(pointerSource).toContain('classifyCatTap({')
    expect(pointerSource).not.toContain('new THREE.Box3()')
    expect(pointerSource).not.toContain('intersectObjects(scene.children')
  })

  it('opens boot only for camera plus CAT readiness, never FISH warmup', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const bootStart = source.indexOf('function maybeRevealAR')
    const bootEnd = source.indexOf('\n    // Update overlay text', bootStart)
    const bootSource = source.slice(bootStart, bootEnd)
    const overlayStart = source.indexOf('function updateOverlayForBoot')
    const overlayEnd = source.indexOf('\n    function showError', overlayStart)
    const overlaySource = source.slice(overlayStart, overlayEnd)
    const cameraStart = source.indexOf("if (status === 'hasVideo')")
    const cameraEnd = source.indexOf("if (status === 'failed')", cameraStart)
    const cameraSource = source.slice(cameraStart, cameraEnd)

    expect(source).toContain('cameraReady: false,')
    expect(source).toContain('shouldRevealAR')
    expect(bootSource).toContain('cameraReady: bootState.cameraReady')
    expect(bootSource).toContain('catReady: bootState.catReady')
    expect(bootSource).not.toContain('secondaryWarmup')
    expect(bootSource).not.toContain('fishLastProgress >=')
    expect(bootSource).not.toContain('maxSecondaryWarmupMs')
    expect(overlaySource).not.toContain('Interaction assets')
    expect(cameraSource.indexOf('bootState.cameraReady = true;')).toBeGreaterThanOrEqual(0)
    expect(cameraSource.indexOf('bootState.cameraReady = true;')).toBeLessThan(
      cameraSource.indexOf("maybeRevealAR({ trigger: 'cameraReady' })"),
    )
  })

  it('reports CAT audio request and browser-confirmed outcomes without claiming play at invocation', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const audioStart = source.indexOf('function requestCatMeowAudio')
    const audioEnd = source.indexOf('\n    function emitCatOneShotStart', audioStart)
    const audioSource = source.slice(audioStart, audioEnd)
    const requested = audioSource.indexOf("sendARDebug('CAT_MEOW_AUDIO_REQUESTED'")
    const playInvocation = audioSource.indexOf('catMeowAudio.play()')
    const playing = audioSource.indexOf("sendARDebug('CAT_MEOW_AUDIO_PLAYING'")
    const playError = audioSource.indexOf("sendARDebug('CAT_MEOW_AUDIO_PLAY_ERROR'")

    expect(requested).toBeGreaterThanOrEqual(0)
    expect(requested).toBeLessThan(playInvocation)
    expect(playing).toBeGreaterThanOrEqual(0)
    expect(playError).toBeGreaterThanOrEqual(0)
    expect(audioSource).toContain("catMeowAudio.addEventListener('playing', reportPlaying")
    expect(audioSource).not.toContain('CAT_MEOW_AUDIO_START')
  })

  it('keeps CSP, resource, and module-import probes outside the main AR module', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const xrScriptIndex = source.indexOf('id="xr8-engine-script"')
    const probeStart = source.indexOf("debug('MODULE_PROBE_START')")
    const mainModuleStart = source.indexOf("import * as THREE from 'three';")

    expect(source).toContain('window.__arSendDebug = sendDebug')
    expect(source).toContain("window.addEventListener('securitypolicyviolation'")
    expect(source).toContain("sendDebug('CSP_VIOLATION'")
    expect(source).toContain("sendDebug('VIEWER_ERROR'")
    expect(source).toContain("debug('XR8_SCRIPT_LOAD'")
    expect(source).toContain("debug('XR8_SCRIPT_ERROR'")
    expect(source).toContain("debug('MODULE_PROBE_THREE_OK'")
    expect(source).toContain("debug('MODULE_PROBE_GLTF_OK'")
    expect(source).toContain("debug('MODULE_PROBE_LIFECYCLE_OK'")
    expect(source).toContain('const expectedLifecycleExports = [')
    expect(source).toContain('missingExports')
    expect(xrScriptIndex).toBeGreaterThan(-1)
    expect(probeStart).toBeGreaterThan(xrScriptIndex)
    expect(probeStart).toBeLessThan(mainModuleStart)
  })

  it('keeps every main lifecycle named import present in the lifecycle helper exports', () => {
    const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const lifecycleSource = readFileSync(
      resolve(process.cwd(), 'public/static/ar-assets/js/ar-interaction-lifecycle.js'),
      'utf8',
    )
    const namedImport = viewerSource.match(
      /import \{\s*\n([\s\S]*?)\n\s*\} from '([^']*ar-interaction-lifecycle\.js(?:\?[^']+)?)';/,
    )
    const probeImport = viewerSource.match(
      /await import\('([^']*ar-interaction-lifecycle\.js(?:\?[^']+)?)'\)/,
    )
    const importedNames = (namedImport?.[1] || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    const probeExportList = viewerSource.match(
      /const expectedLifecycleExports = \[\s*([\s\S]*?)\s*\];/,
    )
    const probedNames = Array.from(
      (probeExportList?.[1] || '').matchAll(/'([A-Za-z0-9_]+)'/g),
      (match) => match[1],
    )
    const exportedNames = Array.from(
      lifecycleSource.matchAll(/export function\s+([A-Za-z0-9_]+)/g),
      (match) => match[1],
    )

    expect(namedImport).not.toBeNull()
    expect(probeImport).not.toBeNull()
    expect(importedNames).not.toHaveLength(0)
    expect(probedNames).toEqual(importedNames)
    expect(importedNames.filter((name) => !exportedNames.includes(name))).toEqual([])
    expect(probeImport?.[1]).toBe(namedImport?.[2])
    expect(namedImport?.[2]).toBe(
      './static/ar-assets/js/ar-interaction-lifecycle.js?v=cat-interactions-v2',
    )
  })

  it('resolves the locked CAT plus FISH proximity rule from backend or the exact pair fallback', () => {
    const fallback = resolveCatFishComboRule({
      primaryTargetName: 'cat001',
      secondaryTargetName: 'fish001',
      rules: [],
    })
    const backend = resolveCatFishComboRule({
      primaryTargetName: 'cat001',
      secondaryTargetName: 'fish001',
      rules: [{
        tags: ['fish001', 'cat001'],
        proximity: {
          enter_distance: 0.52,
          exit_distance: 0.60,
          proximity_stable_ms: 300,
          smoothing_alpha: 0.25,
        },
      }],
    })

    expect(fallback).toEqual({
      primaryTargetName: 'cat001',
      secondaryTargetName: 'fish001',
      source: 'fallback',
      enterDistance: 0.52,
      exitDistance: 0.60,
      proximityStableMs: 300,
      smoothingAlpha: 0.25,
    })
    expect(backend).toEqual({ ...fallback, source: 'backend' })
    expect(fallback).not.toEqual(expect.objectContaining({ enterDistance: 0.72, exitDistance: 0.80 }))
  })

  it('selects fish001 rather than an arbitrary secondary target for the CAT plus FISH combo', () => {
    expect(selectComboSecondaryTargetName({
      primaryTargetName: 'cat001',
      targetNames: ['cat001', 'bird001', 'fish001'],
    })).toBe('fish001')

    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')
    const distanceFunction = source.slice(
      source.indexOf('function computeAnchorDistance()'),
      source.indexOf('function updateFilteredDistance(raw)'),
    )
    expect(distanceFunction).toContain('selectComboSecondaryTargetName')
    expect(distanceFunction).toContain('targetInstances.get(secondaryTargetName)')
  })

  it('applies the approved CAT plus FISH enter/stable/exit hysteresis', () => {
    const config = resolveCatFishComboRule({
      primaryTargetName: 'cat001',
      secondaryTargetName: 'fish001',
      rules: [],
    })
    expect(config).not.toBeNull()

    const outside = advanceComboProximityGate({
      now: 0,
      distance: 0.53,
      enteredAt: null,
      comboConsumed: false,
      config: config!,
    })
    expect(outside.enteredAt).toBeNull()
    expect(outside.stable).toBe(false)

    const entered = advanceComboProximityGate({
      now: 100,
      distance: 0.51,
      enteredAt: null,
      comboConsumed: false,
      config: config!,
    })
    const stable = advanceComboProximityGate({
      now: 400,
      distance: 0.51,
      enteredAt: entered.enteredAt,
      comboConsumed: false,
      config: config!,
    })
    expect(stable.stable).toBe(true)

    const notRearmed = advanceComboProximityGate({
      now: 500,
      distance: 0.56,
      enteredAt: null,
      comboConsumed: true,
      config: config!,
    })
    const rearmed = advanceComboProximityGate({
      now: 600,
      distance: 0.61,
      enteredAt: null,
      comboConsumed: true,
      config: config!,
    })
    expect(notRearmed.rearmEligible).toBe(false)
    expect(rearmed.rearmEligible).toBe(true)
  })

  it('classifies CAT tap, pet, swipe, and invalid gestures without overlap', () => {
    expect(classifyCatGesture({ durationMs: 200, dx: 4, dy: 5 })).toBe('tap')
    expect(classifyCatGesture({ durationMs: 500, dx: 4, dy: 3 })).toBe('pet')
    expect(classifyCatGesture({ durationMs: 400, dx: 75, dy: 12 })).toBe('swipe')
    expect(classifyCatGesture({ durationMs: 400, dx: 30, dy: 30 })).toBe('none')
  })

  it('rejects stale CAT one-shot cleanup and lets CAT_EAT take ownership', () => {
    const firstAction = {}
    const secondAction = {}
    expect(isCatOneShotCompletionOwner({
      capturedGeneration: 1,
      capturedAction: firstAction,
      current: { generation: 2, action: secondAction },
    })).toBe(false)
    expect(isCatOneShotCompletionOwner({
      capturedGeneration: 2,
      capturedAction: secondAction,
      current: { generation: 2, action: secondAction },
    })).toBe(true)
    expect(shouldReplaceCatAnimation({ currentPriority: 60, nextPriority: 100 })).toBe(true)
  })

  it('schedules deterministic CAT ambient clips only when all suppressors are clear', () => {
    const common = {
      idleSince: 0,
      activeOneShot: false,
      pointerGestureActive: false,
      catReturn: null,
      phase: 'WAIT_SECONDARY',
    }
    expect(getEligibleCatAmbient({ now: 7999, nextClip: 'CAT_LOOK_UP', ...common })).toBeNull()
    expect(getEligibleCatAmbient({ now: 8000, nextClip: 'CAT_LOOK_UP', ...common })).toBe('CAT_LOOK_UP')
    expect(getEligibleCatAmbient({ now: 15999, nextClip: 'CAT_SIT', ...common })).toBeNull()
    expect(getEligibleCatAmbient({ now: 16000, nextClip: 'CAT_SIT', ...common })).toBe('CAT_SIT')

    for (const blocked of [
      { activeOneShot: true },
      { pointerGestureActive: true },
      { catReturn: { runId: 1 } },
      { phase: 'COMBO_ARMED' },
      { phase: 'COMBO_TURNING' },
      { phase: 'COMBO_PLAYING' },
    ]) {
      expect(getEligibleCatAmbient({ now: 16000, nextClip: 'CAT_SIT', ...common, ...blocked })).toBeNull()
    }
  })
})
