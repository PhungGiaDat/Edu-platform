// src/lib/ar-init.ts
// Initialize A-Frame and AR.js from npm packages

// A-Frame must be imported BEFORE AR.js
// Note: A-Frame sets itself on window.AFRAME
import 'aframe';

// Import AR.js NFT module (ESM version)
// This extends A-Frame with AR.js components
import '@ar-js-org/ar.js/aframe/build/aframe-ar-nft.js';

// Verify initialization
if (typeof window !== 'undefined') {
  console.log('🚀 A-Frame version:', (window as any).AFRAME?.version);
  console.log('🎯 AR.js loaded from npm package');
}

export {};
