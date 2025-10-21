// src/components/aframe/AFrameComponents.tsx

import React, { forwardRef } from 'react';

type AFrameComponentProps = { [key: string]: any; children?: React.ReactNode };

export const Scene = forwardRef<any, AFrameComponentProps>(({ children, ...props }, ref) => (
  // @ts-ignore
  <a-scene ref={ref} {...props}>{children}</a-scene>
));
Scene.displayName = 'Scene';

export const Entity = forwardRef<any, AFrameComponentProps>(({ children, ...props }, ref) => (
  // @ts-ignore
  <a-entity ref={ref} {...props}>{children}</a-entity>
));
Entity.displayName = 'Entity';

export const Camera = forwardRef<any, AFrameComponentProps>(({ children, ...props }, ref) => (
  // @ts-ignore
  <a-camera ref={ref} {...props}>{children}</a-camera>
));
Camera.displayName = 'Camera';

export const Cursor = forwardRef<any, Omit<AFrameComponentProps, 'children'>>((props, ref) => (
  // @ts-ignore
  <a-cursor ref={ref} {...props} />
));
Cursor.displayName = 'Cursor';

export const Plane = forwardRef<any, Omit<AFrameComponentProps, 'children'>>((props, ref) => (
  // @ts-ignore
  <a-plane ref={ref} {...props} />
));
Plane.displayName = 'Plane';

// 🔥 NEW: Image component
export const Image = forwardRef<any, Omit<AFrameComponentProps, 'children'>>((props, ref) => (
  // @ts-ignore
  <a-image ref={ref} {...props} />
));
Image.displayName = 'Image';

export const GltfModel = forwardRef<any, AFrameComponentProps>((props, ref) => (
  // @ts-ignore
  <a-entity ref={ref} {...props} />
));
GltfModel.displayName = 'GltfModel';