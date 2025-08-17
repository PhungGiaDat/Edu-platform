// Type declarations for mind-ar library
declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      filterMinCF?: number;
      filterBeta?: number;
      missTolerance?: number;
      warmupTolerance?: number;
    });
    
    renderer: any;
    scene: any;
    camera: any;
    video: HTMLVideoElement;
    
    addAnchor(targetIndex: number): {
      group: any;
      onTargetFound?: () => void;
      onTargetLost?: () => void;
    };
    
    start(): Promise<void>;
    stop(): void;
  }
}

declare module 'mind-ar/dist/mindar-image-aframe.prod.js' {
  // A-Frame integration - side effects only
}

declare module 'aframe' {
  // A-Frame - side effects only
}
