declare module 'react-swipeable' {
  import { CSSProperties, ReactNode, Ref } from 'react';

  export interface SwipeableHandlers {
    ref: Ref<any>;
  }

  export interface SwipeCallback {
    (
      event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
      data: SwipeData
    ): void;
  }

  export interface SwipeData {
    first: boolean;
    fingers: number;
    event: MouseEvent | TouchEvent;
    direction: 'Left' | 'Right' | 'Up' | 'Down';
    velocity: number;
    delta: { x: number; y: number };
    absX: number;
    absY: number;
  }

  export interface SwipeableOptions {
    delta?: number;
    preventScrollDirection?: 'x' | 'y' | 'both' | 'none';
    trackMouse?: boolean;
    trackTouch?: boolean;
    rotationAngle?: number;
    swipeAngle?: number;
    onSwipeStart?: SwipeCallback;
    onSwiping?: SwipeCallback;
    onSwipedLeft?: SwipeCallback;
    onSwipedRight?: SwipeCallback;
    onSwipedUp?: SwipeCallback;
    onSwipedDown?: SwipeCallback;
    onSwiped?: SwipeCallback;
    onTap?: SwipeCallback;
  }

  export function useSwipeable(options: SwipeableOptions): SwipeableHandlers;
}
