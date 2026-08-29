// frontend/src/__tests__/services/dictionaryApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dictionaryApi } from '../../services/dictionaryApi';
import { request } from '../../services/apiClient';
import type { LookupResponse } from '../../types/dictionary';

vi.mock('../../services/apiClient', () => ({ request: vi.fn() }));

const mockLookup: LookupResponse = {
  word: 'elephant', pronunciation: '/ˈel.ə.fənt/', part_of_speech: 'noun',
  definition_en: 'A very large grey animal with a long trunk.',
  translation_vi: 'con voi', example_sentence: 'The elephant drinks water.',
  wiki_summary: 'Elephants are the largest land animals.',
  sources: ['qdrant', 'wikipedia'],
};

describe('dictionaryApi', () => {
  beforeEach(() => vi.mocked(request).mockReset());

  it('posts to /dictionary/lookup with the word', async () => {
    vi.mocked(request).mockResolvedValue(mockLookup);
    await expect(dictionaryApi.lookup('elephant')).resolves.toEqual(mockLookup);
    expect(request).toHaveBeenCalledWith('/api/v1/dictionary/lookup',
      expect.objectContaining({ method: 'POST' }));
  });

  it('posts to /dictionary/translate with target_lang vi', async () => {
    vi.mocked(request).mockResolvedValue({});
    await dictionaryApi.translate('Hello world', 'greeting');
    const [url, init] = vi.mocked(request).mock.calls[0];
    expect(url).toBe('/api/v1/dictionary/translate');
    expect(init?.body).toEqual({ text: 'Hello world', context: 'greeting', target_lang: 'vi' });
  });

  it('omits empty context', async () => {
    vi.mocked(request).mockResolvedValue({});
    await dictionaryApi.translate('Hi');
    expect(vi.mocked(request).mock.calls[0][1]?.body).toEqual({ text: 'Hi', context: undefined, target_lang: 'vi' });
  });
});
