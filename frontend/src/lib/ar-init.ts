// src/lib/ar-init.ts
// A-Frame and AR.js initialization helper
// These libraries are loaded via CDN in index.html because they're designed as global scripts

// Wait for A-Frame and AR.js to be available
export const waitForARJS = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (typeof window !== 'undefined' && 
          (window as any).AFRAME && 
          (window as any).AFRAME.components['arjs']) {
        console.log('🚀 A-Frame version:', (window as any).AFRAME?.version);
        console.log('🎯 AR.js ready');
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
};

// Verify AR.js is loaded
export const isARJSReady = (): boolean => {
  return typeof window !== 'undefined' && 
         !!(window as any).AFRAME && 
         !!(window as any).AFRAME.components?.['arjs'];
};

export {};
