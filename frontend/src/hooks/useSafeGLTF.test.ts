import { describe, expect, it } from 'vitest';
import { isMissingColormapUrl } from './useSafeGLTF';

describe('missing pet colormap redirect', () => {
  it('recognizes the missing Supabase and local GLB texture paths', () => {
    const remoteModel = new URL('https://example.supabase.co/storage/v1/object/public/AR_models/pets/models/animal-cat.glb');
    const remoteTexture = new URL('Textures/colormap.png', remoteModel);
    const localModel = new URL('http://localhost:5173/assets/models/apple.glb');
    const localTexture = new URL('Textures/colormap.png', localModel);

    expect(isMissingColormapUrl(remoteTexture, remoteModel)).toBe(true);
    expect(isMissingColormapUrl(localTexture, localModel)).toBe(true);
    expect(isMissingColormapUrl(new URL('textures/other.png', remoteModel), remoteModel)).toBe(false);
  });
});
