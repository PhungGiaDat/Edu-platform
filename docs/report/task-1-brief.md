# Task 1: Create Combo Database

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src`

## Task Overview
Create the combo database for the Dual-Display AR Combo System. This includes:
- `lib/combo/combo-db.json` - JSON data file with 5 animal+food combos
- `lib/combo/types.ts` - TypeScript interfaces
- `lib/combo/index.ts` - Helper functions

## Global Constraints
- MindAR .mind file tracking (image targets, not NFT)
- Combo = 1 animal + 1 food
- 5 animal flashcards: elephant, dog, cat, giraffe, hippo
- 5 food flashcards: banana, bone, fish, leaves, watermelon
- 4 combos: elephant-banana, dog-bone, cat-fish, giraffe-leaves, hippo-watermelon

## Files to Create

### 1. `frontend-web/src/lib/combo/combo-db.json`
```json
{
  "combos": [
    {
      "combo_id": "elephant-banana",
      "name": "Elephant Eating Banana",
      "required_tags": ["elephant", "banana"],
      "model_url": "https://example.com/models/elephant_banana.glb",
      "image_url": "https://example.com/images/elephant_banana_combo.png",
      "animation_clip": "eating",
      "category": "animals",
      "difficulty": "easy"
    },
    {
      "combo_id": "dog-bone",
      "name": "Dog Chewing Bone",
      "required_tags": ["dog", "bone"],
      "model_url": "https://example.com/models/dog_bone.glb",
      "image_url": "https://example.com/images/dog_bone_combo.png",
      "animation_clip": "chewing",
      "category": "animals",
      "difficulty": "easy"
    },
    {
      "combo_id": "cat-fish",
      "name": "Cat Eating Fish",
      "required_tags": ["cat", "fish"],
      "model_url": "https://example.com/models/cat_fish.glb",
      "image_url": "https://example.com/images/cat_fish_combo.png",
      "animation_clip": "eating",
      "category": "animals",
      "difficulty": "easy"
    },
    {
      "combo_id": "giraffe-leaves",
      "name": "Giraffe Eating Leaves",
      "required_tags": ["giraffe", "leaves"],
      "model_url": "https://example.com/models/giraffe_leaves.glb",
      "image_url": "https://example.com/images/giraffe_leaves_combo.png",
      "animation_clip": "eating",
      "category": "animals",
      "difficulty": "medium"
    },
    {
      "combo_id": "hippo-watermelon",
      "name": "Hippo Eating Watermelon",
      "required_tags": ["hippo", "watermelon"],
      "model_url": "https://example.com/models/hippo_watermelon.glb",
      "image_url": "https://example.com/images/hippo_watermelon_combo.png",
      "animation_clip": "eating",
      "category": "animals",
      "difficulty": "hard"
    }
  ]
}
```

### 2. `frontend-web/src/lib/combo/types.ts`
```typescript
export interface ComboDefinition {
  combo_id: string;
  name: string;
  required_tags: string[];
  model_url: string;
  image_url: string;
  animation_clip: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ComboResult {
  found: boolean;
  combo?: ComboDefinition;
  missing_tags?: string[];
}
```

### 3. `frontend-web/src/lib/combo/index.ts`
```typescript
import comboData from './combo-db.json';
import type { ComboDefinition, ComboResult } from './types';

export const COMBO_DB: ComboDefinition[] = comboData.combos;

export function getComboByTags(tags: string[]): ComboResult {
  const sortedTags = [...tags].sort();
  
  for (const combo of COMBO_DB) {
    const sortedRequired = [...combo.required_tags].sort();
    if (sortedTags.length === sortedRequired.length &&
        sortedTags.every((tag, i) => tag === sortedRequired[i])) {
      return { found: true, combo };
    }
  }
  
  return { found: false };
}

export function getCombosForTag(tag: string): ComboDefinition[] {
  return COMBO_DB.filter(combo => combo.required_tags.includes(tag));
}
```

## Steps
1. Create directory `frontend-web/src/lib/combo/`
2. Create `combo-db.json` with the 5 combos
3. Create `types.ts` with interfaces
4. Create `index.ts` with helper functions
5. Verify TypeScript compiles without errors

## Output
- Status: DONE when all files created and TypeScript compiles
- Report file: `report/task-1-report.md`
