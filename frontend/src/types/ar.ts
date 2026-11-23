// src/types/ar.ts

export type FlashcardData = {
  qr_id: string;
  word: string;
  translation: { [key: string]: string };
  ar_tag: string;
  // Thêm các trường khác của flashcard nếu cần (ví dụ: audio_url)
};

export type ARTarget = {
  ar_tag: string;
  nft_base_url: string;
  image_2d_url?: string;
  model_3d_url: string;
  position?: string;
  rotation?: string;
  scale?: string;
};

export type ARCombo = {
  combo_id: string;
  required_tags: string[];
  image_2d_url?: string;
  model_3d_url: string;
  center_transform?: { position?: string; rotation?: string; scale?: string; };
};

export type ARExperienceResponse = {
  flashcard: FlashcardData;
  target: ARTarget;
  related_combos: ARCombo[];
};
