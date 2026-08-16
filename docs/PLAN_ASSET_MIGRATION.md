# 📋 Asset Migration Plan: Local → Supabase Storage

## 🎯 Objective
Migrate all AR assets (GLB models, mind files, 2D images, flashcards, audio) from local static files to Supabase Storage buckets, then update MongoDB with CDN URLs.

---

## 📊 Current State Analysis

### Assets Inventory
| Category | Location | Count | Total Size |
|----------|----------|-------|------------|
| 3D Models (.glb) | `backend/static/assets/models/` | 13 main + 803 in packs | ~50MB |
| Mind Files (.mind) | `backend/static/assets/target/` | 3 | ~1.1MB |
| 2D Fallback Images | `frontend-web/public/assets/model2D/` | 12 | ~500KB |
| Flashcard Images | `frontend-web/public/assets/flashcards/` | 13 | ~2MB |
| Audio Files | TBD | TBD | TBD |

### Database State
- **flashcards**: 13 documents (referencing local paths)
- **ar_objects**: 13 documents (referencing local GLB/mind/2D paths)
- **ar_combinations**: 9 documents (referencing combo mind files)
- **pets**: ❌ Does not exist (needs creation)

---

## 🏗️ Architecture Decision

### Supabase Storage Structure
```
edu-platform-assets/
├── models/           # 3D GLB files
│   ├── animals/
│   ├── food/
│   ├── vehicles/
│   ├── nature/
│   └── pets/
├── mind-files/       # MindAR target files
├── images/
│   ├── flashcards/   # Printable card images
│   └── model2d/      # 2D fallback images
└── audio/            # Pronunciation audio
```

### URL Pattern
```
https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
```

---

## 📝 Implementation Tasks

### Phase 1: Supabase Setup
- [ ] Create storage bucket `edu-platform-assets`
- [ ] Configure public access policies
- [ ] Enable CDN caching

### Phase 2: Asset Upload
- [ ] Upload main GLB models (13 files)
- [ ] Upload mind files (3 files)
- [ ] Upload 2D images (12 files)
- [ ] Upload flashcard images (13 files)
- [ ] Upload pet models from kenney_blocky-characters

### Phase 3: Database Updates
- [ ] Update `ar_objects.model_3d_url` → Supabase URLs
- [ ] Update `ar_objects.nft_base_url` → Supabase URLs
- [ ] Update `ar_objects.image_2d_url` → Supabase URLs
- [ ] Update `flashcards.image_url` → Supabase URLs
- [ ] Update `flashcards.audio_url` → Supabase URLs
- [ ] Create `pets` collection with character models

### Phase 4: Pet System Design
```javascript
// pets collection schema
{
  pet_id: String,        // Unique identifier
  name: String,          // Display name (e.g., "Blocky Bear")
  name_vi: String,       // Vietnamese name
  model_url: String,     // Supabase GLB URL
  thumbnail_url: String, // Preview image
  category: String,      // "starter" | "unlockable" | "premium"
  unlock_condition: {
    type: String,        // "xp" | "streak" | "achievement"
    value: Number        // Required value to unlock
  },
  animations: [String],  // Available animations
  rarity: String,        // "common" | "rare" | "epic" | "legendary"
  created_at: Date
}
```

### Phase 5: Documentation
- [ ] API documentation for frontend
- [ ] Pet feature implementation guide
- [ ] Multi-flashcard mind file usage

---

## 🔧 Agents Required

| Agent | Task |
|-------|------|
| `database-architect` | Design pets schema, update existing schemas |
| `backend-specialist` | Create upload scripts, API endpoints |
| `documentation-writer` | Generate API docs and frontend guide |
| `devops-engineer` | Configure Supabase storage policies |

---

## ✅ Success Criteria
1. All assets accessible via Supabase CDN URLs
2. MongoDB documents updated with new URLs
3. Frontend can load assets from Supabase
4. pets collection created with 10+ pet characters
5. Documentation complete for frontend team

---

*Plan Created: 2026-02-04*
*Status: PENDING APPROVAL*
