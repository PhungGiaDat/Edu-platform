# Pet 3D Models - Complete Setup Guide

## ✅ What We Accomplished

### 1. Fixed Critical Issues
- ✅ **Texture Loading Errors**: Added Three.js LoadingManager with fallback materials
- ✅ **UI Redesign**: Replaced carousel with dropdown (single-pet focus, 66% less memory)
- ✅ **Performance**: Only loads 1 model at a time instead of 3
- ✅ **Type Safety**: Added 'purchase' to UnlockCondition type

### 2. Created Test Models
- ✅ Generated 15 colored cube GLB models (896 bytes each)
- ✅ Uploaded all to Supabase: `AR_models/pets/test-models/`
- ✅ Updated MongoDB with new URL for `blocky_beta`

## 📦 Uploaded Test Models

All models are live at: `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/pets/test-models/`

| Model | Color | Size | URL |
|-------|-------|------|-----|
| character-b.glb | Blue | 896 B | [Link](https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/pets/test-models/character-b.glb) |
| character-f.glb | Red | 896 B | [Link](https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/pets/test-models/character-f.glb) |
| ... | ... | ... | ... |
| *(15 total models)* | | | |

## 🛠️ Scripts Created

### 1. `generate-test-models.py`
Creates simple colored cube GLB files for testing.

```bash
cd scripts && python generate-test-models.py
```

### 2. `simple-upload.py`
Uploads models to Supabase and generates MongoDB update script.

```bash
cd scripts && python simple-upload.py
```

### 3. `update-mongodb.py`
Updates MongoDB with new model URLs.

```bash
cd scripts && python update-mongodb.py
```

## 🔄 How to Replace with Real Kenney Models

### Step 1: Download Kenney's Blocky Characters

1. Visit: https://kenney.nl/assets/blocky-characters
2. Click "Download" button
3. Extract the ZIP file

### Step 2: Copy Models

```bash
# After extracting Kenney pack:
cp path/to/kenney/Models/GLB\ format/character-*.glb scripts/temp_pet_optimization/downloaded/
```

### Step 3: Upload

```bash
cd scripts
python simple-upload.py
```

This will:
- Upload all GLB files to Supabase
- Generate MongoDB update script
- Create upload report JSON

### Step 4: Update Database

```bash
cd scripts
python update-mongodb.py
```

## 📊 Current Status

### Working
- ✅ Frontend with texture error handling deployed
- ✅ Dropdown UI with single-pet focus deployed  
- ✅ Test model for `blocky_beta` uploaded and working
- ✅ Upload pipeline ready for real models

### To Do (Manual Steps for Production)
1. **Download Kenney models** (manual - website doesn't support programmatic download)
2. **Copy to `temp_pet_optimization/downloaded/`**
3. **Run `simple-upload.py`** to upload real models
4. **Run `update-mongodb.py`** to update all pet URLs

## 🎯 Database Pet IDs

Current pets in production database:
```
blocky_beta, blocky_foxtrot, blocky_delta, blocky_echo, 
blocky_golf, blocky_hotel, blocky_india, blocky_juliet,
blocky_alpha, blocky_charlie, kenney_character_a, 
kenney_character_b, kenney_character_c, ...
(28 total pets)
```

## 📝 Generated Files

```
scripts/
├── temp_pet_optimization/
│   ├── downloaded/                     # Test cube models
│   │   ├── character-b.glb (896 B)
│   │   ├── character-f.glb (896 B)
│   │   └── ... (15 total)
│   ├── upload_report.json             # Upload results
│   └── update_mongodb.js              # MongoDB update script
├── generate-test-models.py            # Creates test GLB cubes
├── simple-upload.py                    # Uploads to Supabase
├── update-mongodb.py                   # Updates MongoDB
└── upload-pet-models-pipeline.py      # Full pipeline (with optimization)
```

## 🚀 Testing the New Model

Visit your app and select the "Beta" pet. It should now load the blue cube test model from the new Supabase URL.

## 💡 Notes

- **Test models are simple cubes** - perfect for testing the pipeline
- **Real Kenney models** will be 100-200KB each (vs 896 B for test cubes)
- **Optimization** with gltf-transform can reduce real models by 60-80%
- **Texture issues** are now handled gracefully with fallback colors

## 📂 Next Steps

1. **Manual**: Download Kenney pack from their website
2. **Replace**: Put real GLBs in `temp_pet_optimization/downloaded/`
3. **Upload**: Run `python scripts/simple-upload.py`
4. **Update DB**: Run `python scripts/update-mongodb.py`
5. **Test**: Check all pets in your app

---

**Last Updated**: 2026-03-25  
**Status**: Test pipeline working, ready for real models
