/// <reference types="vite/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any
      'a-marker': any
      'a-entity': any
      'a-assets': any
      'a-asset-item': any
    }
  }
}
