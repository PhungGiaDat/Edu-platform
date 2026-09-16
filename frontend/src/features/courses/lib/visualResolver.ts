import type { AssetReference, VocabularyItem } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

export interface VisualResolution {
  imageUrl: string | null;
  emoji: string;
  wordEn: string;
  wordVi: string;
}

/**
 * Checks whether an AssetReference is ready and has a valid, non-broken URL.
 * Rejects pending SVG references and technical placeholders.
 */
export function isReadyAsset(asset?: AssetReference | null): boolean {
  if (!asset || !asset.path) return false;
  if (asset.status === 'pending' || asset.status === 'failed' || asset.status === 'generating') {
    return false;
  }
  const lower = asset.path.toLowerCase();
  if (lower.endsWith('.svg') && asset.status !== 'ready') {
    return false;
  }
  return true;
}

/**
 * Filter out technical strings, filenames, and internal media statuses.
 * NEVER renders "sticker.svg", "pending", "Đang chờ", etc.
 */
export function sanitizeChildLabel(label?: string | null, fallback = ''): string {
  if (!label) return fallback;
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();

  // Filter technical filenames and asset paths
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.includes('/') ||
    lower.includes('\\')
  ) {
    return fallback;
  }

  // Filter internal status keywords
  if (
    lower === 'pending' ||
    lower === 'generating' ||
    lower === 'đang chờ' ||
    lower === 'failed' ||
    lower === 'placeholder'
  ) {
    return fallback;
  }

  return trimmed;
}

/**
 * Resolves the canonical vocabulary image for any activity, question, game, or matching item.
 * Prioritizes ready canonical vocabulary imagery over broken or pending activity assets.
 */
export function resolveVocabularyVisual(
  wordOrLabel?: string | null,
  vocabulary?: VocabularyItem[],
  fallbackAsset?: AssetReference | null
): VisualResolution {
  // 1. If an authored fallback asset is explicitly ready and not a pending SVG, we may use it
  if (isReadyAsset(fallbackAsset)) {
    const urls = getAssetCandidateUrls(fallbackAsset);
    if (urls.length > 0 && !urls[0].toLowerCase().endsWith('.svg')) {
      return {
        imageUrl: urls[0],
        emoji: '✨',
        wordEn: sanitizeChildLabel(wordOrLabel),
        wordVi: '',
      };
    }
  }

  if (!wordOrLabel || !vocabulary || vocabulary.length === 0) {
    return {
      imageUrl: null,
      emoji: '✨',
      wordEn: sanitizeChildLabel(wordOrLabel),
      wordVi: '',
    };
  }

  const clean = wordOrLabel.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/gi, '').trim();

  // 2. Search vocabulary list for exact match
  const exact = vocabulary.find(
    (v) =>
      v.word_en.toLowerCase() === clean ||
      v.word_vi.toLowerCase() === clean
  );

  if (exact) {
    const urls = getAssetCandidateUrls(exact.image);
    const validUrl = urls.find((u) => !u.toLowerCase().endsWith('.svg')) || urls[0] || null;
    return {
      imageUrl: validUrl,
      emoji: exact.emoji || '🔤',
      wordEn: exact.word_en,
      wordVi: exact.word_vi,
    };
  }

  // 3. Search vocabulary list for fuzzy/contains match (e.g. "Tap elephant" -> "elephant")
  const fuzzy = vocabulary.find((v) => {
    const en = v.word_en.toLowerCase();
    const vi = v.word_vi.toLowerCase();
    return clean.includes(en) || en.includes(clean) || clean.includes(vi) || vi.includes(clean);
  });

  if (fuzzy) {
    const urls = getAssetCandidateUrls(fuzzy.image);
    const validUrl = urls.find((u) => !u.toLowerCase().endsWith('.svg')) || urls[0] || null;
    return {
      imageUrl: validUrl,
      emoji: fuzzy.emoji || '🔤',
      wordEn: fuzzy.word_en,
      wordVi: fuzzy.word_vi,
    };
  }

  return {
    imageUrl: null,
    emoji: '✨',
    wordEn: sanitizeChildLabel(wordOrLabel),
    wordVi: '',
  };
}
