// src/hooks/useArData.ts

import { useState, useEffect } from 'react';
import type { ARTarget, ARCombo } from '../types';
import { getApiBase } from '../config'; // ‚úÖ Import config

const API_BASE = getApiBase(); // ‚úÖ Dynamic API base

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
      console.log('Ì¥ç useArData: No QR ID provided');
      return;
    }

    const fetchData = async () => {
      console.log('Ì¥ç useArData: Fetching data for QR ID:', qrId);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/flashcard/${qrId}`);
        console.log('Ì≥° Raw response status:', response.status);
        console.log('Ì≥° Raw response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`Failed to fetch AR data: ${response.statusText}`);
        }

        const text = await response.text();
        console.log('Ì≥Ñ Raw response text:', text);

        const data = JSON.parse(text);
        console.log('Ì≥¶ Parsed JSON data:', data);

        console.log('Ì¥ç Validating data structure...');
        console.log('Ì≥ä Data keys:', Object.keys(data));
        console.log('ÔøΩÔøΩ Has flashcard:', !!data.flashcard);
        console.log('Ì≥ä Has target:', !!data.target);
        console.log('Ì≥ä Has related_combos:', !!data.related_combos);

        if (!data.flashcard || !data.target) {
          console.log('‚ùå Missing required fields:', {
            hasFlashcard: !!data.flashcard,
            hasTarget: !!data.target
          });
          throw new Error('Invalid or empty data received from API');
        }

        // Transform target data
        const target: ARTarget = {
          tag: data.target.ar_tag,
          nft_base_url: data.target.nft_base_url, // Keep relative path
          image_2d_url: data.target.image_2d_url ? `${API_BASE}${data.target.image_2d_url}` : undefined,
          model_3d_url: `${API_BASE}${data.target.model_3d_url}`,
          position: data.target.position,
          rotation: data.target.rotation,
          scale: data.target.scale,
        };

        const transformedData: ArData = {
          flashcard: data.flashcard,
          targets: [target],
          combo: data.related_combos?.length > 0 ? data.related_combos[0] : null
        };

        console.log('‚úÖ Transformed AR data:', transformedData);
        setArData(transformedData);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('‚ùå useArData error:', errorMessage);
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
