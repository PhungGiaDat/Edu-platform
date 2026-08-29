/** Tra từ word-lookup types (rich definition card) */
export interface LookupResponse {
  word: string;
  pronunciation?: string;      // IPA
  part_of_speech?: string;
  definition_en?: string;
  translation_vi: string;
  example_sentence?: string;
  wiki_summary?: string;
  sources?: string[];
}
