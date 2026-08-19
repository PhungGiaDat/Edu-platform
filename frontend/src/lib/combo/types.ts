export interface ComboDefinition {
  combo_id: string;
  name: string;
  required_tags: string[];
  model_url: string;
  image_url: string;
  animation_clip: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ComboResult {
  found: boolean;
  combo?: ComboDefinition;
  missing_tags?: string[];
}
