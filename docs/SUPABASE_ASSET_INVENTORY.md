# 📦 Supabase Storage - Complete Asset Inventory

## Bucket: `AR_models`
**Base URL:** `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/`

---

## 📊 Summary

| Category | Files | Description |
|----------|-------|-------------|
| **models/** | 31 | 3D GLB models (animals, food, vehicles, pets) |
| **mind-files/** | 3 | MindAR tracking files |
| **images/** | 25 | General images and quiz questions |
| **assets/** | 21 | Backend static assets (flashcards, model2D, targets) |
| **frontend/** | 55 | Frontend public assets |
| **Total** | **135 files** | |

---

## 🗂️ Directory Structure

```
AR_models/
├── models/                      # 3D GLB files
│   ├── elephant.glb
│   ├── palm_tree.glb
│   ├── apple.glb
│   ├── banana.glb
│   ├── cake.glb
│   ├── cake-birthday.glb
│   ├── tree_oak.glb
│   ├── flower_redA.glb
│   ├── mushroom_red.glb
│   ├── cactus_tall.glb
│   ├── vehicle-racer.glb
│   ├── vehicle-suv.glb
│   ├── vehicle-monster-truck.glb
│   └── pets/
│       ├── character-a.glb
│       ├── character-b.glb
│       └── ... (18 pet models)
│
├── mind-files/                  # MindAR target files
│   ├── elephant_targets.mind
│   ├── jungle_targets.mind
│   └── combo_targets.mind
│
├── images/                      # General images
│   ├── elephent.jpg
│   ├── table.jpg
│   ├── tiger.jpg
│   ├── flashcards/             # Card images (from first upload)
│   └── question/
│       └── elephant/
│           ├── question1.jpg
│           └── question2.jpg
│
├── assets/                      # Backend static (mirrored)
│   ├── flashcards/
│   │   ├── elephant_card.png
│   │   └── jungle_card.png
│   ├── model2D/
│   │   ├── Elephant.jpg
│   │   ├── Palm.jpg
│   │   └── jungle_combo.jpg
│   ├── models/
│   │   ├── apple.glb
│   │   ├── banana.glb
│   │   └── ... (13 models)
│   └── target/
│       ├── elephant_targets.mind
│       ├── jungle_targets.mind
│       └── combo_targets.mind
│
└── frontend/                    # Frontend public assets
    ├── flashcards/
    │   ├── apple01_card.png
    │   ├── banana01_card.png
    │   ├── birthday01_card.png
    │   └── ... (19 card images)
    ├── model2D/
    │   ├── apple.jpg
    │   ├── banana.jpg
    │   └── ... (15 fallback images)
    ├── models/
    │   ├── buddy.glb
    │   ├── elephant.glb
    │   └── ... (15 models)
    └── target/
        ├── elephant_nft/
        ├── elephant_targets.mind
        ├── jungle_targets.mind
        └── combo_targets.mind
```

---

## 🔗 URL Examples

### 3D Models
```
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/models/elephant.glb
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/models/pets/character-a.glb
```

### Mind Files
```
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/elephant_targets.mind
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/combo_targets.mind
```

### Flashcard Images
```
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/frontend/flashcards/apple01_card.png
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/flashcards/elephant_card.png
```

### 2D Fallback Images
```
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/frontend/model2D/apple.jpg
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/model2D/Elephant.jpg
```

---

## 🔄 URL Mapping for Frontend

When loading assets, use this base URL:
```typescript
const SUPABASE_STORAGE = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models';

// Examples
const elephantModel = `${SUPABASE_STORAGE}/models/elephant.glb`;
const mindFile = `${SUPABASE_STORAGE}/mind-files/elephant_targets.mind`;
const flashcard = `${SUPABASE_STORAGE}/frontend/flashcards/apple01_card.png`;
const petModel = `${SUPABASE_STORAGE}/models/pets/character-a.glb`;
```

---

*Generated: 2026-02-04*
