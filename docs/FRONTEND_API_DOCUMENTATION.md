# 📚 Frontend API Documentation

## AR Flashcard Platform - Asset & Pet System

**Version:** 2.0.0  
**Last Updated:** 2026-02-04  
**Base API URL:** `https://your-backend.com/api/v1`  
**Supabase Storage URL:** `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models`

---

## 🗂️ Table of Contents

1. [Supabase Storage URLs](#supabase-storage-urls)
2. [API Endpoints](#api-endpoints)
3. [Pet System](#pet-system)
4. [AR Object Integration](#ar-object-integration)
5. [Multi-Flashcard (Combo) System](#multi-flashcard-combo-system)
6. [Code Examples](#code-examples)

---

## 📦 Supabase Storage URLs

All assets are now hosted on Supabase Storage CDN for fast global delivery.

### URL Pattern
```
https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/{path}
```

### Available Assets

#### 3D Models (GLB)
| Model | URL Path | Size |
|-------|----------|------|
| Elephant | `models/elephant.glb` | 21MB |
| Palm Tree | `models/palm_tree.glb` | 14KB |
| Apple | `models/apple.glb` | 14KB |
| Banana | `models/banana.glb` | 12KB |
| Cake | `models/cake.glb` | 73KB |
| Birthday Cake | `models/cake-birthday.glb` | 115KB |
| Oak Tree | `models/tree_oak.glb` | 15KB |
| Flower | `models/flower_redA.glb` | 7KB |
| Mushroom | `models/mushroom_red.glb` | 6KB |
| Cactus | `models/cactus_tall.glb` | 10KB |
| Race Car | `models/vehicle-racer f.glb` | 104KB |
| SUV | `models/vehicle-suv.glb` | 107KB |
| Monster Truck | `models/vehicle-monster-truck.glb` | 122KB |

#### Mind Files (MindAR Tracking)
| File | URL Path | Purpose |
|------|----------|---------|
| Elephant Target | `mind-files/elephant_targets.mind` | Single card tracking |
| Jungle Target | `mind-files/jungle_targets.mind` | Single card tracking |
| Combo Target | `mind-files/combo_targets.mind` | Multi-card tracking |

#### Pet Models
| Pet | URL Path |
|-----|----------|
| Character A-R | `models/pets/character-{a-r}.glb` |

---

## 🔌 API Endpoints

### Get AR Object by Tag
```http
GET /api/v1/ar/objects/{ar_tag}
```

**Response:**
```json
{
  "ar_tag": "animal_elephant_01",
  "model_3d_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/models/elephant.glb",
  "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/elephant_targets.mind",
  "image_2d_url": "/assets/model2D/Elephant.jpg",
  "scale": "0.25 0.25 0.25",
  "position": "0 0 0",
  "rotation": "90 -90 90",
  "animation_type": "idle"
}
```

### Get Flashcard by QR ID
```http
GET /api/v1/flashcards/{qr_id}
```

**Response:**
```json
{
  "qr_id": "ele123",
  "word": "elephant",
  "translation": {
    "vi": "con voi",
    "en": "elephant"
  },
  "ar_tag": "animal_elephant_01",
  "image_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcards/elephant_card.png",
  "audio_url": "/audio/elephant.mp3",
  "category": "animal",
  "difficulty": "medium"
}
```

### Get All Pets
```http
GET /api/v1/pets
```

**Response:**
```json
{
  "pets": [
    {
      "pet_id": "blocky_alpha",
      "name": "Alpha",
      "name_vi": "Alpha",
      "model_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/models/pets/character-a.glb",
      "category": "starter",
      "rarity": "common",
      "color": "#FF6B6B",
      "animations": ["idle", "wave"],
      "unlock_condition": {
        "type": "free",
        "value": 0
      }
    }
  ]
}
```

### Get User's Active Pet
```http
GET /api/v1/users/{user_id}/pet
```

### Update User's Active Pet
```http
PUT /api/v1/users/{user_id}/pet
Content-Type: application/json

{
  "pet_id": "blocky_beta"
}
```

---

## 🐾 Pet System

### Pet Schema
```typescript
interface Pet {
  pet_id: string;          // Unique identifier
  name: string;            // Display name
  name_vi: string;         // Vietnamese name
  model_url: string;       // Supabase GLB URL
  thumbnail_url: string;   // Preview image
  category: 'starter' | 'unlockable' | 'premium';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;           // Primary color hex
  animations: string[];    // Available animations
  unlock_condition: {
    type: 'free' | 'xp' | 'streak' | 'achievement' | 'purchase';
    value: number;
  };
}
```

### Available Pets (10)

| Pet | Rarity | Unlock Condition |
|-----|--------|------------------|
| Alpha | Common | Free (starter) |
| Beta | Common | 100 XP |
| Charlie | Rare | 250 XP |
| Delta | Rare | 7-day streak |
| Echo | Epic | 500 XP |
| Foxtrot | Epic | 10 achievements |
| Golf | Epic | 750 XP |
| Hotel | Legendary | 14-day streak |
| India | Legendary | 1000 XP |
| Juliet | Legendary | Premium purchase |

### Pet Component Implementation

```tsx
// components/Pet3D.tsx
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface Pet3DProps {
  modelUrl: string;
  animation?: string;
  scale?: number;
}

export const Pet3D: React.FC<Pet3DProps> = ({ 
  modelUrl, 
  animation = 'idle',
  scale = 1 
}) => {
  const { scene } = useGLTF(modelUrl);
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Idle animation - gentle bob
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      // Slow rotation
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <primitive 
      ref={meshRef}
      object={scene.clone()} 
      scale={[scale, scale, scale]}
    />
  );
};
```

---

## 🎯 AR Object Integration

### Loading 3D Model in AR Viewer

```typescript
// services/ARAssetService.ts
const SUPABASE_BASE = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models';

export const loadARModel = async (arTag: string) => {
  // Fetch AR object data from API
  const response = await fetch(`/api/v1/ar/objects/${arTag}`);
  const arObject = await response.json();
  
  return {
    modelUrl: arObject.model_3d_url,  // Already full Supabase URL
    mindUrl: arObject.nft_base_url,   // Already full Supabase URL
    scale: arObject.scale,
    position: arObject.position,
    rotation: arObject.rotation
  };
};
```

### MindAR A-Frame Integration

```html
<!-- ar-viewer.html -->
<a-scene 
  mindar-image="imageTargetSrc: ${mindUrl};"
  color-space="sRGB"
  renderer="colorManagement: true"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false"
>
  <a-assets>
    <a-asset-item id="model" src="${modelUrl}"></a-asset-item>
  </a-assets>
  
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  
  <a-entity mindar-image-target="targetIndex: 0">
    <a-gltf-model 
      src="#model" 
      position="${position}"
      rotation="${rotation}"
      scale="${scale}"
    ></a-gltf-model>
  </a-entity>
</a-scene>
```

---

## 🎲 Multi-Flashcard (Combo) System

### How It Works

1. **Combo Mind File**: Contains multiple image targets in one file
2. **Target Index**: Each card has a unique targetIndex (0, 1, 2...)
3. **Detection**: When multiple targets are visible, combo triggers

### Combo Schema
```typescript
interface ARCombination {
  combo_id: string;
  combo_name: string;
  description: string;
  required_tags: string[];     // ["animal_elephant_01", "tree_palm_02"]
  combo_mind_url: string;      // Multi-target mind file
  model_3d_url: string;        // Special combo model
  reward_points: number;
  center_transform: {
    position: string;
    rotation: string;
    scale: string;
  };
}
```

### Implementing Multi-Card Detection

```typescript
// hooks/useMultiCardDetection.ts
import { useEffect, useState } from 'react';

export const useMultiCardDetection = (comboMindUrl: string) => {
  const [detectedTargets, setDetectedTargets] = useState<number[]>([]);
  const [isComboActive, setIsComboActive] = useState(false);
  
  useEffect(() => {
    // Listen for MindAR target events
    const handleTargetFound = (e: CustomEvent) => {
      const targetIndex = e.detail.targetIndex;
      setDetectedTargets(prev => [...new Set([...prev, targetIndex])]);
    };
    
    const handleTargetLost = (e: CustomEvent) => {
      const targetIndex = e.detail.targetIndex;
      setDetectedTargets(prev => prev.filter(t => t !== targetIndex));
    };
    
    document.addEventListener('targetFound', handleTargetFound as EventListener);
    document.addEventListener('targetLost', handleTargetLost as EventListener);
    
    return () => {
      document.removeEventListener('targetFound', handleTargetFound as EventListener);
      document.removeEventListener('targetLost', handleTargetLost as EventListener);
    };
  }, []);
  
  useEffect(() => {
    // Check if combo is complete (both targets visible)
    setIsComboActive(detectedTargets.length >= 2);
  }, [detectedTargets]);
  
  return { detectedTargets, isComboActive };
};
```

### Mind File Target Indices

| Target Index | Image | AR Tag |
|--------------|-------|--------|
| 0 | elephant_card.png | animal_elephant_01 |
| 1 | jungle_card.png | tree_palm_02 |

**Important**: The order of images when generating the combo.mind file determines the target indices!

---

## 💻 Code Examples

### Fetching and Displaying Pet

```tsx
// pages/PetSelection.tsx
import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Pet3D } from '../components/Pet3D';

export const PetSelection = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  
  useEffect(() => {
    fetch('/api/v1/pets')
      .then(res => res.json())
      .then(data => setPets(data.pets));
  }, []);
  
  return (
    <div className="pet-selection">
      <div className="pet-preview">
        {selectedPet && (
          <Canvas>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} />
            <Pet3D modelUrl={selectedPet.model_url} scale={2} />
          </Canvas>
        )}
      </div>
      
      <div className="pet-grid">
        {pets.map(pet => (
          <button 
            key={pet.pet_id}
            onClick={() => setSelectedPet(pet)}
            className={`pet-card ${pet.rarity}`}
          >
            <span className="pet-name">{pet.name}</span>
            <span className="pet-rarity">{pet.rarity}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### AR Viewer with Supabase Assets

```tsx
// pages/ARViewer.tsx
import { useEffect, useRef } from 'react';

interface ARViewerProps {
  arTag: string;
}

export const ARViewer: React.FC<ARViewerProps> = ({ arTag }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadAR = async () => {
      // Fetch AR object data
      const res = await fetch(`/api/v1/ar/objects/${arTag}`);
      const arObject = await res.json();
      
      // Create A-Frame scene dynamically
      const scene = document.createElement('a-scene');
      scene.setAttribute('mindar-image', `imageTargetSrc: ${arObject.nft_base_url}`);
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
      
      scene.innerHTML = `
        <a-assets>
          <a-asset-item id="model" src="${arObject.model_3d_url}"></a-asset-item>
        </a-assets>
        
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        
        <a-entity mindar-image-target="targetIndex: 0">
          <a-gltf-model 
            src="#model" 
            position="${arObject.position}"
            rotation="${arObject.rotation}"
            scale="${arObject.scale}"
            animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
          ></a-gltf-model>
        </a-entity>
      `;
      
      containerRef.current?.appendChild(scene);
    };
    
    loadAR();
  }, [arTag]);
  
  return <div ref={containerRef} className="ar-container" />;
};
```

---

## 🐛 Troubleshooting

### Common Issues

1. **CORS Error with Supabase**
   - Supabase Storage is configured for public access
   - Ensure bucket policy allows anonymous reads

2. **Mind file not loading**
   - Check URL is correct: `mind-files/elephant_targets.mind`
   - Verify file was uploaded successfully

3. **GLB model not appearing**
   - Check browser console for loading errors
   - Verify model URL in network tab
   - Try loading model in https://gltf-viewer.donmccurdy.com

4. **Multi-card combo not triggering**
   - Ensure both cards are clearly visible
   - Check target indices match the combo configuration
   - Verify combo mind file contains both images

---

## 📊 Database Summary

| Collection | Documents | Description |
|------------|-----------|-------------|
| flashcards | 13 | Vocabulary cards with translations |
| ar_objects | 13 | 3D model configurations |
| ar_combinations | 9 | Multi-card combo definitions |
| pets | 10 | Unlockable 3D pet characters |

---

*Documentation generated: 2026-02-04*
