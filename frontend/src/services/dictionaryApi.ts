/** Dictionary API client — Tra từ lookup + sentence translate */
import { request } from './apiClient';
import type { LookupResponse } from '../types/dictionary';
import type { TranslateResponse } from '../types/notebook';

export type { TranslateResponse } from '../types/notebook';

export const dictionaryApi = {
  async lookup(word: string): Promise<LookupResponse> {
    return request('/api/v1/dictionary/lookup', { method: 'POST', body: { word } }) as Promise<LookupResponse>;
  },
  async translate(text: string, context?: string): Promise<TranslateResponse> {
    return request('/api/v1/dictionary/translate', {
      method: 'POST',
      body: { text, context: context || undefined, target_lang: 'vi' },
    }) as Promise<TranslateResponse>;
  },
};
