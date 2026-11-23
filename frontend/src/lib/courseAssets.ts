import type { AssetReference } from '@/types/course';

const unique = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.filter((item): item is string => Boolean(item))));

const toBucketUrl = (bucket: string, path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `/${bucket}/${path}`;
};

const swapExtension = (url: string, fromExt: string, toExt: string) =>
  url.toLowerCase().endsWith(fromExt) ? `${url.slice(0, -fromExt.length)}${toExt}` : null;

export const resolveStoredMediaUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  if (value.startsWith('supabase://')) {
    const withoutScheme = value.slice('supabase://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    if (slashIndex === -1) return `/${withoutScheme}`;
    const bucket = withoutScheme.slice(0, slashIndex);
    const objectPath = withoutScheme.slice(slashIndex + 1);
    return `/${bucket}/${objectPath}`;
  }
  return value;
};

export const getAssetCandidateUrls = (asset?: AssetReference | null) => {
  if (!asset?.path) return [];

  const baseUrl = toBucketUrl(asset.bucket || 'learnar-assets', asset.path);

  if (asset.type === 'video') {
    return unique([
      swapExtension(baseUrl, '.mp4', '.gif'),
      swapExtension(baseUrl, '.mp4', '.webm'),
      baseUrl,
    ]);
  }

  if (asset.type === 'image' || asset.type === 'sticker') {
    return unique([
      swapExtension(baseUrl, '.svg', '.png'),
      swapExtension(baseUrl, '.svg', '.webp'),
      baseUrl,
    ]);
  }

  return unique([baseUrl]);
};
