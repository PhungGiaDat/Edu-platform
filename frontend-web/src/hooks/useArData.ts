// src/hooks/useArData.ts

import { useState, useEffect } from 'react';
import type { ARTarget, ARCombo } from '../types';
import { getApiBase } from '../config';
import { eventBus } from '@/runtime/EventBus';

const API_BASE = getApiBase();

function buildUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  // Full URLs (http/https) returned by the backend are authoritative —
  // the API response already contains the resolved Supabase URLs.
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Frontend static assets served by the same Vite origin.
  if (path.startsWith('/assets/')) return path;
  // Legacy relative paths — prepend API_BASE.
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

// ── localStorage cache helpers ──────────────────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* quota exceeded — ignore */ }
}
// ────────────────────────────────────────────────────────────────────────────

interface Flashcard {
  _id: string;
  qr_id: string;
  word: string;
  translation: Record<string, string>;
  category: string;
  image_url: string;
  audio_url: string;
  ar_tag: string;
  difficulty: string;
  created_at: string;
  image_animation_type?: string | null;
}

interface ArData {
  flashcard: Flashcard;
  targets: ARTarget[];
  combo: ARCombo | null;
}

/**
 * Hook to fetch AR flashcard data from backend.
 * Serves cached data instantly (<10 min TTL), then revalidates in background.
 */
export const useArData = (qrId: string | null) => {
  const [arData, setArData] = useState<ArData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) return;

    const cacheKey = `ardata:v4:${qrId}`;

    // Helper function to build full URL for backend assets
    // If backend returns full Supabase URLs (https://...), use them as-is
    // Otherwise fall back to API_BASE for legacy relative paths
    const buildUrl = (path: string | undefined): string | undefined => {
      if (!path) return undefined;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      if (path.startsWith('/assets/')) return path;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${API_BASE}${cleanPath}`;
    };

    const getFrontendOrigin = (): string =>
      typeof window !== 'undefined' ? window.location.origin : '';

    const transformRaw = (data: any): ArData => {
      const target: ARTarget = {
        tag: data.target.ar_tag,
        nft_base_url: (() => {
          const rawPath = data.target.nft_base_url;
          if (!rawPath) return '';
          if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
          const cleanPath = rawPath
            .replace(/^\/public\//, '')
            .replace(/^public\//, '')
            .replace(/^\//, '');
          const frontendOrigin = getFrontendOrigin();
          return frontendOrigin ? `${frontendOrigin}/${cleanPath}` : `/${cleanPath}`;
        })(),
        image_2d_url: buildUrl(data.target.image_2d_url),
        model_3d_url: buildUrl(data.target.model_3d_url) || '',
        texture_url: buildUrl(data.target.texture_url),
        position: data.target.position,
        rotation: data.target.rotation,
        scale: data.target.scale,
      };

      const rawCombo = data.related_combos?.length > 0 ? data.related_combos[0] : null;
      const combo = rawCombo ? {
        ...rawCombo,
        image_2d_url: buildUrl(rawCombo.image_2d_url),
        model_3d_url: buildUrl(rawCombo.model_3d_url),
        texture_url: buildUrl(rawCombo.texture_url),
      } : null;

      return { flashcard: data.flashcard, targets: [target], combo };
    };

    const fetchData = async (showLoading: boolean) => {
      if (showLoading) { setIsLoading(true); setError(null); }

      try {
        const response = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch AR data: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.flashcard || !data.target) {
          throw new Error('Invalid or empty data received from API');
        }

        const transformedData = transformRaw(data);
        setCache(cacheKey, transformedData);
        setArData(transformedData);

        // 🚀 SUCCESS EVENT EMISSION
        eventBus.emit('AR_DATA_LOADED' as any, transformedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        if (!arData) setError(errorMessage);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    const cached = getCached<ArData>(cacheKey);
    if (cached) {
      setArData(cached);
      // Emit immediately from cache so AR injection doesn't wait for network
      eventBus.emit('AR_DATA_LOADED' as any, cached);
      fetchData(false);
    } else {
      fetchData(true);
    }
  }, [qrId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { arData, isLoading, error };
};
