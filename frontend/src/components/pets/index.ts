/**
 * Pet Components - Barrel Export
 * 
 * This module exports all pet-related UI components for the AR Flashcard App.
 * Components follow kid-friendly design patterns with haptic feedback,
 * sound effects, and engaging animations.
 */

// PetCard - Individual pet display card with rarity styling
export { PetCard, rarityConfig } from './PetCard';
export type { PetCardProps } from './PetCard';

// PetViewer3D - 3D model viewer using React Three Fiber
export { PetViewer3D, PetViewer3DCompact, preloadPetModel } from './PetViewer3D';
export type { PetViewer3DProps } from './PetViewer3D';

// CodexPetSprite - Codex-style atlas sprite player for Lexi
export { CodexPetSprite } from './CodexPetSprite';
export type { CodexPetSpriteProps, CodexPetAnimationState } from './CodexPetSprite';

// PetGrid - Responsive grid with filtering and selection
export { PetGrid } from './PetGrid';
export type { PetGridProps } from './PetGrid';

// PetCarousel - Filmstrip-style carousel with center-focused design
export { PetCarousel } from './PetCarousel';
export type { PetCarouselProps } from './PetCarousel';

// PetUnlockModal - Celebration modal for newly unlocked pets
export { PetUnlockModal } from './PetUnlockModal';
export type { PetUnlockModalProps } from './PetUnlockModal';

// PetSelector - Main modal combining grid, preview, and unlock flow
export { PetSelector } from './PetSelector';
export type { PetSelectorProps } from './PetSelector';
