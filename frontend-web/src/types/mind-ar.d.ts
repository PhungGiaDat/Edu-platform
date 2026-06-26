// Type declarations for mind-ar library
export interface MindARThreeOptions {
  container: HTMLElement;
  imageTargetSrc: string;
  maxTrack?: number;
  filterMinCF?: number;
  filterBeta?: number;
  missTolerance?: number;
  warmupTolerance?: number;
}

export interface MindARAnchor {
  group: unknown;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

export interface MindARThree {
  renderer: unknown;
  scene: unknown;
  camera: unknown;
  video: HTMLVideoElement;
  addAnchor(targetIndex: number): MindARAnchor;
  start(): Promise<void>;
  stop(): void;
}
