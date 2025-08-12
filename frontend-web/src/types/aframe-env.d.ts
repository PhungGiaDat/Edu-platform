import 'aframe';
import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        embedded?: boolean;
        arjs?: string;
      }, HTMLElement>;
      'a-marker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        preset?: string;
      }, HTMLElement>;
      'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'gltf-model'?: string;
        scale?: string;
        position?: string;
      }, HTMLElement>;
    }
  }
}
