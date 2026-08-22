# Web Course Assets Integration Plan

## Status
- ✅ New clay-v1 assets ready in mobile repo
- ❌ Web course not using them
- ❌ `/pets` white screen issue

## New Assets Available
```
mobile/rn/assets/prototypes/cat-lesson/clay-v1-vertical-slice/derivatives/
├── bird-vocabulary-clay-v1-512.png
├── cat-champion-clay-v1-512.png
├── cat-vocabulary-clay-v1-512.png
├── dog-vocabulary-clay-v1-512.png
├── lexi-cheer-clay-v1-512.png
└── lexi-neutral-clay-v1-512.png
```

## Tasks

### 1. Fix `/pets` White Screen
**Root cause:** PetViewer3D loading failure (Three.js/WebGL)
**Fix:** Add proper error boundary and fallback UI

### 2. Integrate Clay-v1 Assets into AnimalsAdventure Course
**Current state:**
- AnimalsAdventure uses fallback data with empty `images: []`
- New assets available but not linked

**Changes needed:**
1. Copy derivatives to frontend public assets
2. Update AnimalsAdventure vocabulary images
3. Update AnimalsLessonPlayer to use new images

### 3. Copy Assets to Frontend
```bash
cp mobile/rn/assets/prototypes/cat-lesson/clay-v1-vertical-slice/derivatives/*.png \
   frontend/public/assets/animals/clay-v1/
```

## Implementation

### Task 1: Fix `/pets`
- Check PetsPage error handling
- Add fallback for PetViewer3D failures
- Add console logging for debugging

### Task 2: Copy and Link Assets
- Create `frontend/public/assets/animals/clay-v1/`
- Copy all 6 derivative images
- Update AnimalsAdventure vocabulary to use:
  - `cat-vocabulary-clay-v1-512.png` for Cat lesson
  - `dog-vocabulary-clay-v1-512.png` for Dog lesson
  - `bird-vocabulary-clay-v1-512.png` for Bird lesson
  - (and so on for Fish, Rabbit)
- Update AnimalsLessonPlayer to display images from this path
