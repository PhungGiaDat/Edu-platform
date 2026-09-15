// @ts-nocheck
/**
 * LearnAR8thWall.tsx
 *
 * Standalone 8th Wall AR page — ZERO overlap with MindAR.
 * Flow: QRScanner (React jsQR component) → Fetch XR target per QR → Viewer (ar-xr.html iframe)
 *
 * Route: /learn-ar-xr
 * Route: /learn-ar-xr/:deckId
 *
 * State machine (5 phases):
 *   SCANNING  → QRScanner mounted, jsQR polling
 *   PREPARING → API fetch in flight, scanner stopping
 *   XR_BOOTING → ar-xr.html iframe loading
 *   VIEWING   → XR camera live
 *   ERROR     → retry option
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useTelegramSync } from '@/hooks/useTelegramSync';
import { QRScanner } from '@/features/ar/components/QRScanner';
import '../styles/LearnAR8thWall.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://edu-platform-api-do20.onrender.com';
const TRANSITION_FADE_MS = 250;
const DEBUG_CAMERA_HANDOFF_DELAYS_MS = [0, 150, 300, 500] as const;
export const AR_DIAGNOSTICS_VERSION = 'session-catalogue-slam-diagnostics-v1';

export function resolveDebugCameraHandoffDelay(search: string): number {
  const params = new URLSearchParams(search);
  if (params.get('debug') !== 'true') return 0;

  const requestedDelay = Number(params.get('camera_handoff_delay_ms') || '0');
  return DEBUG_CAMERA_HANDOFF_DELAYS_MS.includes(
    requestedDelay as (typeof DEBUG_CAMERA_HANDOFF_DELAYS_MS)[number],
  )
    ? requestedDelay
    : 0;
}

function highResolutionTimestamp(): number {
  return typeof performance !== 'undefined'
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

type Phase =
  | 'SCANNING'
  | 'PREPARING'
  | 'XR_BOOTING'
  | 'VIEWING'
  | 'ERROR';

type AROperatorUser = Pick<User, 'role' | 'roles' | 'is_superuser'>;

/**
 * Mirrors the backend teacher/admin gate for diagnostics-only AR controls.
 * This is presentation gating only; the backend remains authoritative.
 */
export function canUseAROperatorControls(
  user: AROperatorUser | null | undefined,
  isAuthenticated: boolean,
): boolean {
  if (!isAuthenticated || !user) return false;

  return user.is_superuser === true
    || user.role === 'teacher'
    || user.role === 'admin'
    || user.roles?.some(role => role === 'teacher' || role === 'admin') === true;
}

/** XR target data for one flashcard, fetched after QR scan */
export interface XRTarget {
  qr_id: string;
  word: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  model_3d_url?: string;
  texture_url?: string;
  animations?: string[];
  default_animation?: string;
  combo_animation?: string;
  position?: string;
  rotation?: string;
  scale?: string;
  physical_width_m?: number;
  presentation_profile?: string;
  presentation_scale_multiplier?: number;
  presentation_position_offset?: string;
  presentation_forward_axis?: string;
}

type XRTargetResponse = {
  word?: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  model_3d_url?: string;
  texture_url?: string;
  animations?: string[];
  default_animation?: string;
  combo_animation?: string;
  position?: string;
  rotation?: string;
  scale?: string;
  physical_width_m?: number;
  presentation_profile?: string;
  presentation_scale_multiplier?: number;
  presentation_position_offset?: string;
  presentation_forward_axis?: string;
  tracking_target?: Partial<XRTargetResponse>;
  target?: Partial<XRTargetResponse>;
};

export function normalizeXRTarget(targetQrId: string, raw: XRTargetResponse): XRTarget {
  return {
    qr_id: targetQrId,
    word: raw.word || targetQrId.replace('001', ''),
    xr_target_json_url: raw.tracking_target?.xr_target_json_url || raw.xr_target_json_url,
    xr_target_image_url: raw.tracking_target?.xr_target_image_url || raw.xr_target_image_url,
    model_3d_url: raw.target?.model_3d_url || raw.model_3d_url,
    texture_url: raw.target?.texture_url || raw.texture_url,
    animations: raw.target?.animations || raw.animations,
    default_animation: raw.target?.default_animation || raw.default_animation || 'IDLE',
    combo_animation: raw.target?.combo_animation || raw.combo_animation,
    position: raw.target?.position ?? raw.position ?? '0 0 0',
    rotation: raw.target?.rotation ?? raw.rotation ?? '0 0 0',
    scale: raw.target?.scale ?? raw.scale ?? '1 1 1',
    physical_width_m: raw.tracking_target?.physical_width_m ?? raw.physical_width_m,
    presentation_profile: raw.target?.presentation_profile ?? raw.presentation_profile,
    presentation_scale_multiplier:
      raw.target?.presentation_scale_multiplier ?? raw.presentation_scale_multiplier,
    presentation_position_offset:
      raw.target?.presentation_position_offset ?? raw.presentation_position_offset,
    presentation_forward_axis:
      raw.target?.presentation_forward_axis ?? raw.presentation_forward_axis,
  };
}

export function normalizeScannedQrId(qrId: unknown): string | null {
  const normalizedQrId = String(qrId || '').trim();
  return normalizedQrId || null;
}

type XRTargetCatalogueEntry = XRTargetResponse & {
  qr_id?: unknown;
};

export type SessionTargetCatalogue = {
  targets: XRTarget[];
  candidates: Array<string | null>;
  rejectedTargets: Array<{
    targetName: string | null;
    reason: 'missing_qr_id' | 'duplicate_qr_id' | 'missing_xr_target_json_url';
  }>;
};

/**
 * Builds the session's tracking catalogue from deck metadata, not combo membership.
 * The scanned entry target is ordered first; every remaining target with a usable
 * 8th Wall JSON stays registered so it can be recognized independently.
 */
export function buildSessionTargetCatalogue(
  entryQrId: unknown,
  rawTargets: unknown,
): SessionTargetCatalogue {
  const normalizedEntryQrId = normalizeScannedQrId(entryQrId);
  const targetsByQrId = new Map<string, XRTarget>();
  const candidates: Array<string | null> = [];
  const rejectedTargets: SessionTargetCatalogue['rejectedTargets'] = [];

  for (const rawTarget of Array.isArray(rawTargets) ? rawTargets : []) {
    if (!rawTarget || typeof rawTarget !== 'object') {
      rejectedTargets.push({ targetName: null, reason: 'missing_qr_id' });
      continue;
    }
    const targetQrId = normalizeScannedQrId((rawTarget as XRTargetCatalogueEntry).qr_id);
    if (!targetQrId) {
      rejectedTargets.push({ targetName: null, reason: 'missing_qr_id' });
      continue;
    }
    candidates.push(targetQrId);
    if (targetsByQrId.has(targetQrId)) {
      rejectedTargets.push({ targetName: targetQrId, reason: 'duplicate_qr_id' });
      continue;
    }

    const target = normalizeXRTarget(targetQrId, rawTarget as XRTargetResponse);
    // ar-xr.html always loads a target JSON. Image-only records are not safe
    // to register because inferred JSON paths are not a backend contract.
    if (!target.xr_target_json_url) {
      rejectedTargets.push({ targetName: targetQrId, reason: 'missing_xr_target_json_url' });
      continue;
    }
    targetsByQrId.set(targetQrId, target);
  }

  const entryTarget = normalizedEntryQrId
    ? targetsByQrId.get(normalizedEntryQrId)
    : null;

  const targets = entryTarget
    ? [entryTarget, ...Array.from(targetsByQrId.values()).filter(target => target.qr_id !== entryTarget.qr_id)]
    : Array.from(targetsByQrId.values());

  return { targets, candidates, rejectedTargets };
}

export function resolveSessionTargetCatalogue(
  entryQrId: unknown,
  rawTargets: unknown,
): XRTarget[] {
  return buildSessionTargetCatalogue(entryQrId, rawTargets).targets;
}

export function serializeXRTargets(targets: XRTarget[]): string {
  return JSON.stringify(targets.map(target => ({
    qr_id: target.qr_id,
    word: target.word,
    xr_target_json_url: target.xr_target_json_url,
    xr_target_image_url: target.xr_target_image_url,
    model_3d_url: target.model_3d_url,
    animations: target.animations,
    default_animation: target.default_animation,
    combo_animation: target.combo_animation,
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    physical_width_m: target.physical_width_m,
    presentation_profile: target.presentation_profile,
    presentation_scale_multiplier: target.presentation_scale_multiplier,
    presentation_position_offset: target.presentation_position_offset,
    presentation_forward_axis: target.presentation_forward_axis,
  })));
}

export const LearnAR8thWall: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const canUseOperatorControls = canUseAROperatorControls(user, isAuthenticated);

  const deckIdRef = useRef(deckId || 'claymorphic-animals-001');
  // Backend deck metadata is the session tracking catalogue source. It is
  // deliberately independent from the entry QR and interaction rule choices.
  const deckTargetCatalogueRef = useRef<XRTarget[]>([]);
  const sessionTargetCatalogueSourceRef = useRef('uninitialized');
  const parentBuildFingerprintEmittedRef = useRef(false);

  // ========== AR RUNTIME PREWARM (runs once on mount) ==========
  useEffect(() => {
    const ensureLink = (rel: string, href: string, as?: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      link.crossOrigin = 'anonymous';
      if (as) link.as = as;
      document.head.appendChild(link);
    };

    // Connection warmup
    ensureLink('preconnect', 'https://cdn.jsdelivr.net');
    ensureLink('preconnect', 'https://rofprrtoeyirssfndxag.supabase.co');

    // 8th Wall engine — heaviest dependency
    ensureLink('preload', 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js', 'script');

    // Three.js module + GLTFLoader
    ensureLink('modulepreload', 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js');
    ensureLink('modulepreload', 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js');

    // Viewer HTML
    ensureLink('prefetch', '/ar-xr.html');
  }, []);

  // ========== LESSON MODEL PRELOAD (runs once on mount) ==========
  // Preload primary AR model as soon as page opens — before QR scan.
  const FALLBACK_CAT_URL =
    'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile_v1.glb';

  useEffect(() => {
    const warmARModel = (url: string, priority: 'current' | 'next') => {
      if (!url) return;
      // Remove stale preload link(s) for this URL before injecting fresh one.
      // SPA navigation leaves <link> nodes in document.head even after component
      // unmount. querySelector check alone silently skips re-preload on remount,
      // losing the pre-QR head-start. Always re-inject so the browser can reuse
      // the in-flight cache entry or re-prefetch.
      document
        .querySelectorAll(`link[data-ar-model-warm][href="${url}"]`)
        .forEach(node => node.remove());
      const link = document.createElement('link');
      link.rel = priority === 'current' ? 'preload' : 'prefetch';
      link.as = 'fetch';
      link.href = url;
      link.crossOrigin = 'anonymous';
      link.dataset.arModelWarm = `${priority}:${Date.now()}`;
      document.head.appendChild(link);
    };

    let cancelled = false;

    const preloadLesson = async () => {
      try {
        const deckId = deckIdRef.current || 'claymorphic-animals-001';
        // Fixed URL: /flashcard/ar-preload/deck/{deck_id} (not /decks/{deckId}/ar-preload)
        const res = await fetch(`${API_BASE}/api/v1/flashcard/ar-preload/deck/${deckId}`);
        if (cancelled) return;

        // non-2xx also triggers fallback — don't silently skip preload
        if (!res.ok) {
          warmARModel(FALLBACK_CAT_URL, 'current');
          trace('LESSON_MODEL_PRELOAD', 'fallback');
          return;
        }

        const manifest = await res.json();
        deckTargetCatalogueRef.current = resolveSessionTargetCatalogue('', manifest?.targets);
        sessionTargetCatalogueSourceRef.current = 'ar-preload/deck';
        // If API returns 200 but primary has no model URL, fall back to hardcoded CAT
        const primaryUrl = manifest.primary?.model_3d_url || FALLBACK_CAT_URL;
        warmARModel(primaryUrl, 'current');
        trace('LESSON_MODEL_PRELOAD', manifest.primary?.qr_id || 'fallback');

        // DON'T preload secondary models on page open.
        // Fish (34 MB) must not fight CAT (20 MB) for bandwidth.
        // Secondary model loading remains lazy on IMAGE_FOUND for now.
      } catch {
        if (!cancelled) {
          warmARModel(FALLBACK_CAT_URL, 'current');
          trace('LESSON_MODEL_PRELOAD', 'fallback');
        }
      }
    };

    preloadLesson();
    return () => { cancelled = true; };
  }, []);

  // Viewer iframe ref
  const viewerRef = useRef<HTMLIFrameElement>(null);

  // Iframe timing instrumentation
  const iframeTimingRef = useRef<{ srcSet: number; onLoad: number; onError: number } | null>(null);
  const lastEmptyQrIgnoredAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const qrCameraStopAtRef = useRef<number | null>(null);
  const qrCameraHandoffAtRef = useRef<number | null>(null);
  const cameraHandoffTimerRef = useRef<number | null>(null);
  const lastIframeMountSrcRef = useRef<string | null>(null);

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('SCANNING');
  const [transitionMounted, setTransitionMounted] = useState(false);
  const [transitionVisible, setTransitionVisible] = useState(false);

  // Flags that gate XR_BOOTING transition
  const [cameraReleased, setCameraReleased] = useState(false);
  const [cameraHandoffGateReady, setCameraHandoffGateReady] = useState(false);
  const [targetReady, setTargetReady] = useState(false);

  // Current scanned target (primary card / UI / primary model)
  const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const transitionClearTimerRef = useRef<number | null>(null);

  // All scanned cards this session
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());

  // All XR targets to track in this session (may include non-scanned co-targets)
  const [xrTargets, setXrTargets] = useState<XRTarget[]>([]);

  // Buffer AR_DEBUG messages from viewer iframe for Telegram sync
  const arDebugBufferRef = useRef<string[]>([]);

  // Parent-side trace logs for Telegram sync (React state, always accessible)
  const [parentTraceLogs, setParentTraceLogs] = useState<string[]>([]);

  // Helper: push timestamped trace into parentTraceLogs state AND persistent control buffer
  const trace = (label: string, detail: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    const entry = `${ts} [${label}] ${detail}`;
    setParentTraceLogs(prev => {
      const next = [...prev, entry];
      return next.length > 200 ? next.slice(-200) : next;
    });
    // Dual sink: also write to persistent ARControlTrace ring buffer (survives reload, immune to drop_console)
    window.ARControlTrace?.(`AR_${label}`, { detail, phase });
  };

  useEffect(() => {
    if (!canUseOperatorControls || parentBuildFingerprintEmittedRef.current) return;

    parentBuildFingerprintEmittedRef.current = true;
    trace('AR_PARENT_BUILD', JSON.stringify({
      version: AR_DIAGNOSTICS_VERSION,
      diagnosticsVersion: AR_DIAGNOSTICS_VERSION,
    }));
  }, [canUseOperatorControls, trace]);

  const clearCameraHandoffTimer = useCallback(() => {
    if (cameraHandoffTimerRef.current !== null) {
      window.clearTimeout(cameraHandoffTimerRef.current);
      cameraHandoffTimerRef.current = null;
    }
  }, []);

  const armCameraHandoffGate = useCallback((delayMs: number) => {
    clearCameraHandoffTimer();
    const now = highResolutionTimestamp();
    const handoffAt = qrCameraHandoffAtRef.current ?? now;
    const remainingDelayMs = Math.max(0, delayMs - (now - handoffAt));

    if (remainingDelayMs === 0) {
      setCameraHandoffGateReady(true);
      trace('QR_CAMERA_HANDOFF_GATE_READY', JSON.stringify({
        ts: now,
        delayMs,
        elapsedSinceQrHandoffMs: now - handoffAt,
      }));
      return;
    }

    cameraHandoffTimerRef.current = window.setTimeout(() => {
      const readyAt = highResolutionTimestamp();
      setCameraHandoffGateReady(true);
      cameraHandoffTimerRef.current = null;
      trace('QR_CAMERA_HANDOFF_GATE_READY', JSON.stringify({
        ts: readyAt,
        delayMs,
        elapsedSinceQrHandoffMs: readyAt - handoffAt,
      }));
    }, remainingDelayMs);
  }, [clearCameraHandoffTimer, trace]);

  const handleQrCameraHandoffTelemetry = useCallback((event: {
    label: string;
    ts: number;
    [key: string]: unknown;
  }) => {
    if (event.label === 'QR_CAMERA_STOP_BEGIN') {
      qrCameraStopAtRef.current = event.ts;
    }
    if (event.label === 'QR_HANDOFF_TO_PARENT') {
      qrCameraHandoffAtRef.current = event.ts;
    }
    trace(event.label, JSON.stringify(event));
  }, [trace]);

  const clearTransitionTimer = useCallback(() => {
    if (transitionClearTimerRef.current !== null) {
      window.clearTimeout(transitionClearTimerRef.current);
      transitionClearTimerRef.current = null;
    }
  }, []);

  const clearTransitionPresentation = useCallback(() => {
    clearTransitionTimer();
    setTransitionVisible(false);
    setTransitionMounted(false);
  }, [clearTransitionTimer]);

  const showTransition = useCallback(() => {
    clearTransitionTimer();
    setTransitionMounted(true);
    setTransitionVisible(true);
  }, [clearTransitionTimer]);

  const dismissTransition = useCallback(() => {
    setTransitionVisible(false);
    clearTransitionTimer();

    const reducedMotionQuery = typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
      : undefined;
    const prefersReducedMotion = reducedMotionQuery?.matches === true;

    if (prefersReducedMotion) {
      setTransitionMounted(false);
      return;
    }

    transitionClearTimerRef.current = window.setTimeout(() => {
      setTransitionMounted(false);
      transitionClearTimerRef.current = null;
    }, TRANSITION_FADE_MS);
  }, [clearTransitionTimer]);

  useEffect(() => () => clearTransitionTimer(), [clearTransitionTimer]);
  useEffect(() => () => clearCameraHandoffTimer(), [clearCameraHandoffTimer]);

  // Telegram Sync integration
  const { syncTelegram, syncStatus, iframeLogs } = useTelegramSync({
    iframeRef: viewerRef,
    flashcardCount: foundCards.size || 1,
    enabled: canUseOperatorControls,
    getParentLogs: () => {
      const arDebug = arDebugBufferRef.current.join('\n') || 'No AR_DEBUG logs';
      const traces = parentTraceLogs.join('\n') || 'No parent traces';
      return `=== PARENT TRACES ===\n${traces}\n\n=== AR_DEBUG BUFFER ===\n${arDebug}`;
    },
    getActiveEngine: () => '8th-wall',
  });

  // Keyboard shortcut for Telegram sync (Ctrl+Shift+S)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (canUseOperatorControls && e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        syncTelegram();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUseOperatorControls, syncTelegram]);

  // Debug: log phase changes
  useEffect(() => {
    console.log('[LearnAR8thWall] Phase changed to:', phase);
  }, [phase]);

  // ========================================================================
  // XR_BOOTING TRIGGER
  // Fires when both the camera has been released and the API has returned.
  // No more unreliable postMessage bridging.
  // ========================================================================
  useEffect(() => {
    if (
      phase === 'PREPARING'
      && targetReady
      && cameraReleased
      && cameraHandoffGateReady
      && currentTarget
    ) {
      const now = highResolutionTimestamp();
      const elapsedSinceQrStopMs = qrCameraStopAtRef.current == null
        ? null
        : now - qrCameraStopAtRef.current;
      setPhase('XR_BOOTING');
      trace('XR_BOOT_TRIGGER', JSON.stringify({
        ts: now,
        elapsedSinceQrStopMs,
        cameraReleased,
        cameraHandoffGateReady,
        targetReady,
      }));
      trace('XR_BOOTING', 'target and camera handoff gate ready — transitioning');
    }
  }, [
    phase,
    targetReady,
    cameraReleased,
    cameraHandoffGateReady,
    currentTarget,
    trace,
  ]);

  // ========================================================================
  // fetchXRTarget — fetch XR metadata for one QR ID from backend
  // ========================================================================
  const fetchXRTarget = useCallback(async (targetQrId: string): Promise<XRTarget> => {
    const res = await fetch(`${API_BASE}/api/v1/flashcard/${targetQrId}/xr-urls`);
    if (!res.ok) throw new Error(`XR target ${targetQrId}: API ${res.status}`);
    return normalizeXRTarget(targetQrId, await res.json());
  }, []);

  const fetchSessionTargetCatalogue = useCallback(async (): Promise<XRTarget[]> => {
    if (deckTargetCatalogueRef.current.length > 0) {
      return deckTargetCatalogueRef.current;
    }

    const activeDeckId = deckIdRef.current || 'claymorphic-animals-001';
    const res = await fetch(`${API_BASE}/api/v1/flashcard/xr-targets/deck/${activeDeckId}`);
    if (!res.ok) throw new Error(`XR target catalogue ${activeDeckId}: API ${res.status}`);

    const payload = await res.json();
    const catalogue = resolveSessionTargetCatalogue('', payload?.targets);
    if (catalogue.length === 0) {
      throw new Error(`XR target catalogue ${activeDeckId} contains no usable target JSON`);
    }

    deckTargetCatalogueRef.current = catalogue;
    sessionTargetCatalogueSourceRef.current = 'xr-targets/deck';
    return catalogue;
  }, []);

  // ========================================================================
  // handleQRDetected — called by QRScanner when QR is found.
  // QRScanner calls stopCamera() internally before this fires.
  // We record cameraReleased here since we know the camera was just stopped.
  // ========================================================================
  const handleQRDetected = useCallback(async (qrId: string) => {
    const normalizedQrId = normalizeScannedQrId(qrId);
    if (!normalizedQrId) {
      clearTransitionPresentation();
      const now = performance.now();
      if (now - lastEmptyQrIgnoredAtRef.current >= 1000) {
        lastEmptyQrIgnoredAtRef.current = now;
        trace('QR_IGNORED_EMPTY', 'Scanner payload is empty; skipping AR preparation');
      }
      return;
    }

    if (foundCards.has(normalizedQrId)) {
      clearTransitionPresentation();
      trace('QR_DUPLICATE', `Already scanned: ${normalizedQrId}`);
      return;
    }

    trace('QR_DETECTED', `QR=${normalizedQrId} → PHASE=PREPARING`);

    showTransition();
    clearCameraHandoffTimer();
    const releaseAssumedAt = highResolutionTimestamp();
    const elapsedSinceQrStopMs = qrCameraStopAtRef.current == null
      ? null
      : releaseAssumedAt - qrCameraStopAtRef.current;
    const debugHandoffDelayMs = resolveDebugCameraHandoffDelay(window.location.search);
    trace('PARENT_CAMERA_RELEASE_ASSUMED', JSON.stringify({
      ts: releaseAssumedAt,
      elapsedSinceQrStopMs,
      cameraReleased: true,
      cameraHandoffDelayMs: debugHandoffDelayMs,
    }));
    setPhase('PREPARING');
    setTargetReady(false);
    setCameraReleased(true); // QRScanner already stopped the camera
    setCameraHandoffGateReady(false);
    armCameraHandoffGate(debugHandoffDelayMs);
    setCurrentTarget(null);
    setXrTargets([]);
    setScanError(null);
    lastIframeMountSrcRef.current = null;

    try {
      // Entry target, tracking catalogue, and interaction rules have distinct
      // ownership. The viewer independently loads combo rules after XR boots.
      const [entryTarget, deckTargets] = await Promise.all([
        fetchXRTarget(normalizedQrId),
        fetchSessionTargetCatalogue(),
      ]);
      const sessionTargetCatalogue = buildSessionTargetCatalogue(normalizedQrId, [
        entryTarget,
        ...deckTargets,
      ]);
      const targets = sessionTargetCatalogue.targets;
      const sessionCatalogueCandidates = sessionTargetCatalogue.candidates;
      const sessionCatalogueRejectedTargets = sessionTargetCatalogue.rejectedTargets;
      const primary = targets.find(target => target.qr_id === normalizedQrId);
      if (!primary?.xr_target_json_url) {
        throw new Error(`No XR target JSON for entry target ${normalizedQrId}`);
      }

      trace('SESSION_TARGET_CATALOGUE', JSON.stringify({
        entryTarget: normalizedQrId,
        source: sessionTargetCatalogueSourceRef.current,
        candidates: sessionCatalogueCandidates,
        usableTargets: targets.map(target => target.qr_id),
        rejectedTargets: sessionCatalogueRejectedTargets,
      }));

      // Preload tracking JSONs for all targets
      for (const target of targets) {
        if (!target.xr_target_json_url) continue;
        const key = `ar-target-${target.xr_target_json_url}`;
        if (document.querySelector(`[data-preload="${key}"]`)) continue;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'fetch';
        link.href = target.xr_target_json_url;
        link.crossOrigin = 'anonymous';
        link.dataset.preload = key;
        document.head.appendChild(link);
      }

      // Preload primary model — always inject <link>, don't skip on stale DOM check.
      // If request is still in-flight from preloadLesson, browser deduplicates.
      // If cache was evicted, we re-preload rather than silently miss.
      if (primary.model_3d_url) {
        const url = primary.model_3d_url;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'fetch';
        link.href = url;
        link.crossOrigin = 'anonymous';
        link.dataset.arModel = url;
        link.dataset.preloadAttempt = String(Date.now());
        document.head.appendChild(link);
        trace('MODEL_PRELOAD', url);
      }

      // Preconnect to model CDN without transferring any non-entry GLBs.
      // This reduces DNS+TLS handshake time before the staged preload fires.
      const cdnOrigin = 'https://rofprrtoeyirssfndxag.supabase.co';
      if (!document.querySelector(`link[rel="preconnect"][href="${cdnOrigin}"]`)) {
        const preconn = document.createElement('link');
        preconn.rel = 'preconnect';
        preconn.href = cdnOrigin;
        preconn.crossOrigin = 'anonymous';
        document.head.appendChild(preconn);
      }

      setCurrentTarget(primary);
      setXrTargets(targets);
      setFoundCards(prev => new Set([...prev, normalizedQrId]));
      setTargetReady(true);
      trace('TARGET_READY', normalizedQrId);
      trace('MULTI_TARGET_READY', JSON.stringify(targets.map(t => t.qr_id)));
    } catch (err) {
      clearTransitionPresentation();
      clearCameraHandoffTimer();
      setCameraHandoffGateReady(false);
      trace('API_ERROR', String(err));
      setScanError(err instanceof Error ? err.message : 'Failed to load XR target');
      setPhase('ERROR');
    }
  }, [
    armCameraHandoffGate,
    clearCameraHandoffTimer,
    clearTransitionPresentation,
    foundCards,
    fetchSessionTargetCatalogue,
    fetchXRTarget,
    showTransition,
    trace,
  ]);

  // ========================================================================
  // LISTEN: messages from viewer iframe (XR lifecycle events from ar-xr.html)
  // ========================================================================
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'AR_DEBUG') {
        const label = data.payload?.label || '?';
        const details = data.payload?.details || {};
        const ts = new Date().toISOString().substring(11, 23);
        const entry = `${ts} [${label}] ${JSON.stringify(details)}`;
        arDebugBufferRef.current.push(entry);
        if (arDebugBufferRef.current.length > 200) arDebugBufferRef.current.shift();
        return;
      }

      switch (data.type) {
        case 'XR_ENGINE_READY':
          console.log('[LearnAR8thWall] XR engine ready');
          trace('XR_ENGINE_READY', '8th Wall binary loaded');
          break;

        case 'XR_SLAM_LOADED':
          console.log('[LearnAR8thWall] XR SLAM loaded');
          trace('XR_SLAM_LOADED', 'Camera+tracking module ready');
          break;

        case 'XR_PIPELINE_READY':
          console.log('[LearnAR8thWall] XR pipeline ready');
          trace('XR_PIPELINE_READY', 'All pipeline modules registered');
          break;

        case 'XR_CAMERA_STATUS':
          trace('XR_CAMERA_STATUS', data.payload?.status || '?');
          break;

        case 'XR_CAMERA_HAS_VIDEO':
          console.log('[LearnAR8thWall] XR camera has video — AR is LIVE');
          trace('XR_CAMERA_HAS_VIDEO', 'Camera feed visible, AR tracking active');
          setPhase('VIEWING');
          dismissTransition();
          trace('PHASE', 'VIEWING — AR session active');
          break;

        case 'XR_STARTED':
          console.log('[LearnAR8thWall] AR viewer ready');
          break;

        case 'XR_ERROR':
          console.error('[LearnAR8thWall] XR error:', data.payload);
          trace('XR_ERROR', data.payload?.message || 'Unknown XR error');
          clearTransitionPresentation();
          setScanError(data.payload?.message || 'XR session failed');
          setPhase('ERROR');
          break;

        case 'TARGET_FOUND':
          console.log('[LearnAR8thWall] Target found in viewer:', data.payload);
          break;

        case 'TARGET_LOST':
          console.log('[LearnAR8thWall] Target lost in viewer:', data.payload);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [clearTransitionPresentation, dismissTransition]);

  // ========================================================================
  // NAVIGATION
  // ========================================================================
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    clearTransitionPresentation();
    clearCameraHandoffTimer();
    setPhase('SCANNING');
    setScanError(null);
    setCurrentTarget(null);
    setCameraReleased(false);
    setCameraHandoffGateReady(false);
    setTargetReady(false);
    lastIframeMountSrcRef.current = null;
  }, [clearCameraHandoffTimer, clearTransitionPresentation]);

  const handleSwitchToMindAR = useCallback(() => {
    navigate('/learn-ar');
  }, [navigate]);

  // ========================================================================
  // BUILD VIEWER IFRAME SRC
  // ========================================================================
  const viewerSrc = (() => {
    if (!currentTarget) return '';
    const params = new URLSearchParams();
    params.set('api_base', API_BASE);
    params.set('deck_id', deckIdRef.current);
    params.set('qr_id', currentTarget.qr_id);
    params.set('word', currentTarget.word);
    if (currentTarget.xr_target_json_url)   params.set('xr_target_json_url', currentTarget.xr_target_json_url);
    if (currentTarget.xr_target_image_url)   params.set('xr_target_image_url', currentTarget.xr_target_image_url);
    if (currentTarget.model_3d_url)         params.set('model_3d_url', currentTarget.model_3d_url);
    if (currentTarget.position)  params.set('position', currentTarget.position);
    if (currentTarget.rotation)  params.set('rotation', currentTarget.rotation);
    if (currentTarget.scale)     params.set('scale', currentTarget.scale);
    const presentationMode = new URLSearchParams(window.location.search).get('presentation_mode');
    if (presentationMode) params.set('presentation_mode', presentationMode);
    // Milestone 1: pass all tracked targets (cat + fish) to viewer
    if (xrTargets.length > 0) {
      params.set('xr_targets', serializeXRTargets(xrTargets));
    }
    if (canUseOperatorControls) {
      params.set('debug', 'true');
      params.set('ar_diagnostics_version', AR_DIAGNOSTICS_VERSION);
    }
    return `/ar-xr.html?${params.toString()}`;
  })();

  // Track when viewerSrc is set — timing instrumentation after viewerSrc is initialized
  useEffect(() => {
    if (!viewerSrc) return;
    iframeTimingRef.current = { srcSet: Date.now(), onLoad: 0, onError: 0 };
    trace('VIEWER_SRC_SET', viewerSrc);
  }, [viewerSrc]);

  useEffect(() => {
    if ((phase !== 'XR_BOOTING' && phase !== 'VIEWING') || !viewerSrc) return;
    if (lastIframeMountSrcRef.current === viewerSrc) return;

    lastIframeMountSrcRef.current = viewerSrc;
    const now = highResolutionTimestamp();
    const elapsedSinceQrStopMs = qrCameraStopAtRef.current == null
      ? null
      : now - qrCameraStopAtRef.current;
    trace('IFRAME_MOUNT', JSON.stringify({
      ts: now,
      elapsedSinceQrStopMs,
      phase,
      hasIframeElement: !!viewerRef.current,
    }));
  }, [phase, trace, viewerSrc]);

  // ========================================================================
  // RENDER
  // ========================================================================
  const isDebugMode = canUseOperatorControls
    && new URLSearchParams(window.location.search).get('debug') === 'true';

  return (
    <div className="ar-xr-page">

      {/* Debug Phase Indicator */}
      {isDebugMode && (
        <div className="debug-phase-indicator">
          Phase: <strong>{phase}</strong> |
          Scanner: <strong>{phase === 'SCANNING' ? 'active' : 'hidden'}</strong> |
          Camera: <strong>{foundCards.size}</strong> cards
        </div>
      )}

      {/* Operator-only header and engine switch. Learners stay in the immersive AR viewport. */}
      {canUseOperatorControls && (
        <div className="ar-xr-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="header-title">
            <h1>{currentTarget?.word || '8th Wall XR'}</h1>
            <span className="card-count">
              {foundCards.size} card{foundCards.size !== 1 ? 's' : ''} scanned
            </span>
          </div>
          <button className="engine-switch" onClick={handleSwitchToMindAR}>
            MindAR
          </button>
        </div>
      )}

      {/* AR Viewport */}
      <div className="ar-viewport">

        {/* SCANNING: QRScanner React component */}
        {phase === 'SCANNING' && (
          <QRScanner
            onDetected={handleQRDetected}
            onReady={() => trace('SCANNER_READY', 'getUserMedia succeeded')}
            onError={(msg) => {
              trace('SCANNER_ERROR', msg);
              clearTransitionPresentation();
              setScanError(msg);
              setPhase('ERROR');
            }}
            onCameraHandoffTelemetry={handleQrCameraHandoffTelemetry}
            active={phase === 'SCANNING'}
            debug={isDebugMode}
          />
        )}

        {/* XR_BOOTING | VIEWING: 8th Wall XR viewer */}
        {/* XR_READY is signaled by XR_CAMERA_HAS_VIDEO from iframe, NOT iframe.onload.
            iframe.onload fires when GLBs finish downloading (~30-40s) — far too late. */}
        {(phase === 'XR_BOOTING' || phase === 'VIEWING') && viewerSrc && (
          <iframe
            ref={viewerRef}
            src={viewerSrc}
            title="AR Viewer"
            allow="camera; xr-spatial-tracking; gyroscope; accelerometer; autoplay"
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => {
              iframeTimingRef.current = {
                ...(iframeTimingRef.current || {}),
                onLoad: Date.now(),
              } as { srcSet: number; onLoad: number; onError: number };
              const t = iframeTimingRef.current;
              const delta = t.onLoad - (t as any).srcSet;
              trace('VIEWER_IFRAME_LOADED', `srcSet→load Δ${delta}ms`);
            }}
            onError={() => {
              trace('VIEWER_IFRAME_ERROR', viewerSrc);
            }}
          />
        )}

        {transitionMounted && (
          <div
            className={`ar-transition-overlay ${transitionVisible ? 'is-visible' : 'is-leaving'}`}
            data-testid="ar-transition-overlay"
            data-visible={transitionVisible ? 'true' : 'false'}
            role="status"
            aria-live="polite"
          >
            <div className="ar-transition-mesh" aria-hidden="true" />
            <div className="ar-transition-shade" aria-hidden="true" />
            <div className="ar-transition-bubble ar-transition-bubble--one" aria-hidden="true" />
            <div className="ar-transition-bubble ar-transition-bubble--two" aria-hidden="true" />
            <div className="ar-transition-bubble ar-transition-bubble--three" aria-hidden="true" />

            <div className="ar-transition-content">
              <div className="ar-transition-visual" aria-hidden="true">
                <div className="ar-transition-halo" />
                <div className="ar-transition-clay-orb" data-testid="ar-transition-clay-orb">
                  <div className="ar-transition-orb-highlight" />
                </div>
                <div className="ar-transition-dots" data-testid="ar-transition-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div
                className="ar-transition-status ar-transition-status-card"
                data-testid="ar-transition-status-card"
              >
                <div className="ar-transition-card-gloss" aria-hidden="true" />
                <strong>
                  {phase === 'PREPARING' || phase === 'SCANNING'
                    ? '✨ Đã tìm thấy thẻ!'
                    : 'Đang mở thế giới AR...'}
                </strong>
                <span>
                  {phase === 'PREPARING' || phase === 'SCANNING'
                    ? 'Đang chuẩn bị trải nghiệm AR cho bé...'
                    : 'Chỉ mất một chút thôi — camera AR đang sẵn sàng'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ERROR: retry option */}
        {phase === 'ERROR' && (
          <div className="ar-error">
            <div className="error-icon">
              <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth={2}>
                <circle cx={12} cy={12} r={10} />
                <line x1={15} y1={9} x2={9} y2={15} />
                <line x1={9} y1={9} x2={15} y2={15} />
              </svg>
            </div>
            <h2>Could not load XR target</h2>
            <p>{scanError}</p>
            <div className="error-actions">
              <button className="btn-primary" onClick={handleRetry}>Scan Again</button>
              <button className="btn-secondary" onClick={handleBack}>Go Back</button>
            </div>
          </div>
        )}

      </div>

      {/* Operator-only diagnostics: the backend separately enforces this role gate. */}
      {canUseOperatorControls && (
        <button
          type="button"
          className={`telegram-sync-btn ${syncStatus}`}
          onClick={syncTelegram}
          disabled={syncStatus === 'syncing'}
          aria-label={`Send ${phase.toLowerCase()} AR logs to Telegram`}
          title={`Sync ${phase.toLowerCase()} logs to Telegram (Ctrl+Shift+S)`}
        >
          {syncStatus === 'syncing' ? '...' : syncStatus === 'success' ? 'OK' : syncStatus === 'error' ? 'ERR' : 'TG'}
        </button>
      )}

      {/* Operator-only scan telemetry */}
      {canUseOperatorControls && foundCards.size > 0 && (
        <div className="found-cards-overlay">
          <div className="found-cards-title">Scanned</div>
          <div className="found-cards-list">
            {Array.from(foundCards).map(card => (
              <div key={card} className="found-card-badge">{card}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === 'SCANNING' && (
        <div className="ar-instructions">
          <p>Point camera at flashcard QR code</p>
        </div>
      )}

        {phase === 'VIEWING' && (
          <div className="ar-instructions ar-viewing-hint">
            <p>Đưa thẻ vào khung để khám phá ✨</p>
          </div>
        )}

    </div>
  );
};

export default LearnAR8thWall;
