import comboData from './combo-db.json';
import type { ComboDefinition, ComboResult } from './types';

export const COMBO_DB: ComboDefinition[] = comboData.combos as ComboDefinition[];

export function getComboByTags(tags: string[]): ComboResult {
  const sortedTags = [...tags].sort();
  
  for (const combo of COMBO_DB) {
    const sortedRequired = [...combo.required_tags].sort();
    if (sortedTags.length === sortedRequired.length &&
        sortedTags.every((tag, i) => tag === sortedRequired[i])) {
      return { found: true, combo };
    }
  }
  
  return { found: false };
}

export function getCombosForTag(tag: string): ComboDefinition[] {
  return COMBO_DB.filter(combo => combo.required_tags.includes(tag));
}
