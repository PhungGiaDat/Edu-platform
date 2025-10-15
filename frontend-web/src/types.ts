// src/types.ts

export type ARTarget = {
  tag: string;
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
  center_transform?: { position?: string; rotation?: string; scale?: string };
};

export type AppState = 'SCANNING' | 'LOADING_DATA' | 'AR_VIEW' | 'ERROR';
