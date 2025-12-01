// src/hooks/useArData.ts

import { useState, useEffect } from 'react';
import type { ARTarget, ARCombo } from '../types';
import { getApiBase } from '../config'; // ✅ Import config

const API_BASE = getApiBase(); // ✅ Dynamic API base

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
}

interface ArData {
  flashcard: Flashcard;
  targets: ARTarget[];
  combo: ARCombo | null;
}

export const useArData = (qrId: string | null) => {
  const [arData, setArData] = useState<ArData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      console.log('��� useArData: No QR ID provided');
      return;
    }

    const fetchData = async () => {
      console.log('��� useArData: Fetching data for QR ID:', qrId);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}`);
        console.log('��� Raw response status:', response.status);
        console.log('��� Raw response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`Failed to fetch AR data: ${response.statusText}`);
        }

        const text = await response.text();
        console.log('��� Raw response text:', text);

        const data = JSON.parse(text);
        console.log('��� Parsed JSON data:', data);

        console.log('��� Validating data structure...');
        console.log('��� Data keys:', Object.keys(data));
        console.log('�� Has flashcard:', !!data.flashcard);
        console.log('��� Has target:', !!data.target);
        console.log('��� Has related_combos:', !!data.related_combos);

        if (!data.flashcard || !data.target) {
          console.log('❌ Missing required fields:', {
            hasFlashcard: !!data.flashcard,
            hasTarget: !!data.target
          });
          throw new Error('Invalid or empty data received from API');
        }

        // Helper function to build full URL for backend assets
        const buildUrl = (path: string | undefined): string | undefined => {
          if (!path) return undefined;
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return path; // Already full URL
          }
          const cleanPath = path.startsWith('/') ? path : `/${path}`;
          return `${API_BASE}${cleanPath}`;
        };

        // Helper to get frontend origin for static assets like NFT
        const getFrontendOrigin = (): string => {
          if (typeof window !== 'undefined') {
            return window.location.origin;
          }
          return ''; // Relative path fallback
        };

        // Transform target data
        const target: ARTarget = {
          tag: data.target.ar_tag,
          // NFT files are served from FRONTEND (public folder), not backend!
          nft_base_url: (() => {
            const cleanPath = data.target.nft_base_url
              .replace(/^\/public\//, '')
              .replace(/^public\//, '')
              .replace(/^\//, '');
            
            // Use frontend origin for NFT files (they're in public/)
            const frontendOrigin = getFrontendOrigin();
            return frontendOrigin ? `${frontendOrigin}/${cleanPath}` : `/${cleanPath}`;
          })(),
          // Other assets (images, models) come from backend
          image_2d_url: buildUrl(data.target.image_2d_url),
          model_3d_url: buildUrl(data.target.model_3d_url) || '',
          position: data.target.position,
          rotation: data.target.rotation,
          scale: data.target.scale,
        };

        // Transform combo data with full URLs
        const rawCombo = data.related_combos?.length > 0 ? data.related_combos[0] : null;
        const combo = rawCombo ? {
          ...rawCombo,
          image_2d_url: buildUrl(rawCombo.image_2d_url),
          model_3d_url: buildUrl(rawCombo.model_3d_url),
        } : null;

        const transformedData: ArData = {
          flashcard: data.flashcard,
          targets: [target],
          combo: combo,
        };

        console.log('✅ Transformed AR data:', transformedData);
        setArData(transformedData);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('❌ useArData error:', errorMessage);
        setError(errorMessage);
        setArData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [qrId]);

  return { arData, isLoading, error };
};
