/**
 * Catalog card validation and asset preflight.
 *
 * The Shared-Mind Persistent Viewer treats a MindAR catalog as the
 * authoritative source of truth for image targets. Every card that the
 * viewer tries to activate must carry a ``(catalog, index)`` pair that
 * resolves to a real slot in the loaded manifest, and the 3D model it
 * points at must be a real GLB on disk. Anything else is rejected
 * before the AR scene spins up so children never see a half-built card.
 */

const GLTF_MAGIC = new Uint8Array([0x67, 0x6c, 0x54, 0x46]); // "glTF"
const GLB_MAGIC = new Uint8Array([0x67, 0x6c, 0x54, 0x46]); // GLB container also starts with "glTF"

const MANIFEST_FETCH_TIMEOUT_MS = 5000;
const GLB_PREFLIGHT_TIMEOUT_MS = 5000;

export interface MindCatalogTarget {
  arTag: string;
  mindTargetIndex: number;
}

export interface MindCatalogManifest {
  schemaVersion: 1;
  catalogId: string;
  mindUrl: string;
  targetCount: number;
  sha256: string;
  targets: MindCatalogTarget[];
}

export interface CatalogCardIdentity extends MindCatalogTarget {
  mindCatalogId: string;
  mindUrl: string;
}

/**
 * Validate that a card's catalog identity matches the active manifest.
 *
 * Returns the matching ``MindCatalogTarget`` so callers can reuse the
 * resolved index without re-scanning the manifest.
 */
export function validateCardForCatalog(
  card: CatalogCardIdentity,
  manifest: MindCatalogManifest,
): MindCatalogTarget {
  if (card.mindCatalogId !== manifest.catalogId || card.mindUrl !== manifest.mindUrl) {
    throw new Error('MIND_CATALOG_MISMATCH');
  }
  const expected = manifest.targets.find((target) => target.arTag === card.arTag);
  if (
    !expected
    || expected.mindTargetIndex !== card.mindTargetIndex
    || card.mindTargetIndex >= manifest.targetCount
    || card.mindTargetIndex < 0
  ) {
    throw new Error('MIND_TARGET_INDEX_INVALID');
  }
  return expected;
}

const SHA256_HEX = /^[0-9a-f]{64}$/i;

function assertManifestShape(payload: unknown, catalogId: string): asserts payload is MindCatalogManifest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('CATALOG_MANIFEST_INVALID');
  }
  const candidate = payload as Partial<MindCatalogManifest>;
  if (candidate.schemaVersion !== 1) {
    throw new Error('CATALOG_SCHEMA_UNSUPPORTED');
  }
  if (candidate.catalogId !== catalogId) {
    throw new Error('CATALOG_ID_MISMATCH');
  }
  if (typeof candidate.mindUrl !== 'string' || candidate.mindUrl.length === 0) {
    throw new Error('CATALOG_URL_MISSING');
  }
  if (typeof candidate.sha256 !== 'string' || !SHA256_HEX.test(candidate.sha256)) {
    throw new Error('CATALOG_SHA256_INVALID');
  }
  if (typeof candidate.targetCount !== 'number' || candidate.targetCount < 1) {
    throw new Error('CATALOG_TARGET_COUNT_INVALID');
  }
  if (!Array.isArray(candidate.targets) || candidate.targets.length !== candidate.targetCount) {
    throw new Error('CATALOG_TARGET_LIST_MISMATCH');
  }
  const seenIndices = new Set<number>();
  const seenTags = new Set<string>();
  for (const target of candidate.targets) {
    if (!target || typeof target !== 'object') {
      throw new Error('CATALOG_TARGET_INVALID');
    }
    const t = target as MindCatalogTarget;
    if (typeof t.arTag !== 'string' || t.arTag.length === 0) {
      throw new Error('CATALOG_TAG_INVALID');
    }
    if (!Number.isInteger(t.mindTargetIndex) || t.mindTargetIndex < 0) {
      throw new Error('CATALOG_INDEX_INVALID');
    }
    if (seenIndices.has(t.mindTargetIndex) || seenTags.has(t.arTag)) {
      throw new Error('CATALOG_DUPLICATE_ENTRY');
    }
    seenIndices.add(t.mindTargetIndex);
    seenTags.add(t.arTag);
  }
  const expectedIndices = Array.from({ length: candidate.targetCount }, (_, i) => i);
  if (!expectedIndices.every((i) => seenIndices.has(i))) {
    throw new Error('CATALOG_INDICES_NOT_CONTIGUOUS');
  }
}

/**
 * Fetch and validate the catalog manifest for ``catalogId``. The active
 * AbortSignal cancels the network request if the consumer navigates away
 * before the manifest resolves.
 */
export async function loadMindCatalog(
  catalogId: string,
  signal: AbortSignal,
  baseUrl = '/assets/target/catalogs',
): Promise<MindCatalogManifest> {
  if (!catalogId || !/^[a-zA-Z0-9._-]+$/.test(catalogId)) {
    throw new Error('CATALOG_ID_INVALID');
  }
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(catalogId)}.manifest.json`;
  const composed = composeTimeoutSignal(signal, MANIFEST_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: composed.signal });
  } catch (error) {
    if (composed.timedOut()) {
      throw new Error('CATALOG_FETCH_TIMEOUT');
    }
    throw new Error('CATALOG_FETCH_FAILED');
  }
  composed.dispose();
  if (!response.ok) {
    throw new Error('CATALOG_FETCH_NOT_FOUND');
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('CATALOG_MANIFEST_INVALID');
  }
  assertManifestShape(payload, catalogId);
  return payload;
}

/**
 * Issue a tiny range GET against ``url`` and verify the first four bytes
 * are the glTF/GLB magic. Used to fail fast when the Supabase deploy
 * silently swaps a 3D asset for an HTML error page.
 */
export async function preflightRequiredGlb(
  url: string,
  signal: AbortSignal,
): Promise<void> {
  if (!url || typeof url !== 'string') {
    throw new Error('MODEL_ASSET_URL_INVALID');
  }
  const composed = composeTimeoutSignal(signal, GLB_PREFLIGHT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-3' },
      signal: composed.signal,
    });
  } catch (error) {
    if (composed.timedOut()) {
      throw new Error('MODEL_ASSET_TIMEOUT');
    }
    throw new Error('MODEL_ASSET_UNAVAILABLE');
  }
  composed.dispose();
  if (!response.ok && response.status !== 206) {
    throw new Error('MODEL_ASSET_UNAVAILABLE');
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 4) {
    throw new Error('MODEL_ASSET_INVALID');
  }
  const head = new Uint8Array(buffer, 0, 4);
  if (!matchesMagic(head, GLTF_MAGIC) && !matchesMagic(head, GLB_MAGIC)) {
    throw new Error('MODEL_ASSET_INVALID');
  }
}

function matchesMagic(actual: Uint8Array, expected: Uint8Array): boolean {
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) return false;
  }
  return true;
}

interface ComposedSignal {
  signal: AbortSignal;
  timedOut: () => boolean;
  dispose: () => void;
}

function composeTimeoutSignal(parent: AbortSignal, timeoutMs: number): ComposedSignal {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onParentAbort = () => controller.abort();
  if (parent.aborted) {
    controller.abort();
  } else {
    parent.addEventListener('abort', onParentAbort, { once: true });
  }
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timeout);
      parent.removeEventListener('abort', onParentAbort);
    },
  };
}
