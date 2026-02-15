# Pet Feature Implementation Guide

## 📋 Overview

Implementation guide for building the **3D Pet Companion System** using 18 Kenney blocky-character models with progression-based unlocking, AR rendering, and gamification.

---

## 🎯 Feature Objectives

1. **Pet Selection**: Allow users to choose and customize their learning companion
2. **Progression System**: Unlock pets based on XP, streaks, and achievements
3. **AR Integration**: Render selected pet as 3D companion during AR lessons
4. **Gamification**: Reward engagement with new pet unlocks

---

## 📊 Database Schema

### Pets Collection

**Collection:** `pets`

```javascript
{
  "_id": ObjectId,
  "pet_id": "kenney_character_a",           // Unique identifier
  "name": "Sparky",                         // English name
  "name_vi": "Chú Chó Năng Động",          // Vietnamese name
  "model_url": "https://...kenney/blocky-characters/character-a.glb",
  "thumbnail_url": "https://...kenney/blocky-characters/character-a.glb",
  "category": "character",
  "pack_source": "kenney_blocky-characters",
  "rarity": "common",                       // common | rare | epic | legendary
  "color": "#FF6B6B",                       // Theme color for UI
  "animations": ["idle", "wave"],           // Available animations
  "unlock_condition": {
    "type": "free",                         // free | xp | streak | achievement
    "value": 0                              // Threshold value
  }
}
```

**Indexes:**
```javascript
db.pets.createIndex({ "pet_id": 1 }, { unique: true });
db.pets.createIndex({ "rarity": 1 });
db.pets.createIndex({ "unlock_condition.type": 1 });
```

### Users Collection (Extended)

**Add to existing Users schema:**

```javascript
{
  // ... existing fields
  "active_pet": "kenney_character_a",       // Currently selected pet
  "unlocked_pets": [                        // Array of unlocked pet IDs
    "kenney_character_a",
    "kenney_character_b"
  ],
  "pet_preferences": {
    "show_in_ar": true,                     // Toggle pet in AR mode
    "animation_speed": 1.0,                 // Animation speed multiplier
    "position": "bottom-right"              // UI position preference
  }
}
```

---

## 🔌 Backend API Endpoints

### 1. Get All Pets (Catalog)

**Endpoint:** `GET /api/v1/pets`

**Response:**
```json
{
  "pets": [
    {
      "pet_id": "kenney_character_a",
      "name": "Sparky",
      "name_vi": "Chú Chó Năng Động",
      "model_url": "https://...",
      "rarity": "common",
      "color": "#FF6B6B",
      "unlock_condition": {"type": "free", "value": 0},
      "is_unlocked": true,
      "is_active": true
    }
  ],
  "stats": {
    "total": 18,
    "unlocked": 2,
    "common": 6,
    "rare": 6,
    "epic": 4,
    "legendary": 2
  }
}
```

**Implementation:**
```python
# backend/api/v1/pets.py
from fastapi import APIRouter, Depends
from beanie import Document
from ..models import Pet, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/pets", tags=["pets"])

@router.get("/")
async def get_pets(current_user: User = Depends(get_current_user)):
    pets = await Pet.find_all().to_list()
    
    # Enrich with user unlock status
    user_unlocked = set(current_user.unlocked_pets)
    
    pets_data = []
    for pet in pets:
        can_unlock = check_unlock_condition(pet.unlock_condition, current_user)
        
        pets_data.append({
            **pet.dict(),
            "is_unlocked": pet.pet_id in user_unlocked,
            "is_active": pet.pet_id == current_user.active_pet,
            "can_unlock": can_unlock
        })
    
    return {
        "pets": pets_data,
        "stats": calculate_pet_stats(pets, user_unlocked)
    }


def check_unlock_condition(condition, user):
    """Check if user meets unlock condition."""
    if condition["type"] == "free":
        return True
    elif condition["type"] == "xp":
        return user.total_xp >= condition["value"]
    elif condition["type"] == "streak":
        return user.current_streak >= condition["value"]
    elif condition["type"] == "achievement":
        return len(user.achievements) >= condition["value"]
    return False
```

### 2. Unlock Pet

**Endpoint:** `POST /api/v1/pets/{pet_id}/unlock`

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "message": "Sparky unlocked!",
  "pet": {
    "pet_id": "kenney_character_a",
    "name": "Sparky",
    "rarity": "common"
  }
}
```

**Implementation:**
```python
@router.post("/{pet_id}/unlock")
async def unlock_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get pet
    pet = await Pet.find_one(Pet.pet_id == pet_id)
    if not pet:
        raise HTTPException(404, "Pet not found")
    
    # Check already unlocked
    if pet_id in current_user.unlocked_pets:
        raise HTTPException(400, "Pet already unlocked")
    
    # Check unlock condition
    if not check_unlock_condition(pet.unlock_condition, current_user):
        raise HTTPException(403, "Unlock condition not met")
    
    # Unlock
    current_user.unlocked_pets.append(pet_id)
    await current_user.save()
    
    return {
        "success": True,
        "message": f"{pet.name} unlocked!",
        "pet": pet.dict(exclude={"_id", "model_url", "thumbnail_url"})
    }
```

### 3. Set Active Pet

**Endpoint:** `PUT /api/v1/users/active-pet`

**Request:**
```json
{
  "pet_id": "kenney_character_b"
}
```

**Response:**
```json
{
  "success": true,
  "active_pet": {
    "pet_id": "kenney_character_b",
    "name": "Bubbles",
    "model_url": "https://..."
  }
}
```

**Implementation:**
```python
@router.put("/users/active-pet")
async def set_active_pet(
    request: SetActivePetRequest,
    current_user: User = Depends(get_current_user)
):
    # Verify pet is unlocked
    if request.pet_id not in current_user.unlocked_pets:
        raise HTTPException(403, "Pet not unlocked")
    
    # Update
    current_user.active_pet = request.pet_id
    await current_user.save()
    
    # Get pet details
    pet = await Pet.find_one(Pet.pet_id == request.pet_id)
    
    return {
        "success": True,
        "active_pet": pet.dict()
    }
```

---

## 🎨 Frontend Components

### 1. Pet Selector Modal

**Component:** `components/PetSelector.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

interface Pet {
  pet_id: string;
  name: string;
  name_vi: string;
  model_url: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  is_unlocked: boolean;
  is_active: boolean;
  can_unlock: boolean;
  unlock_condition: {
    type: string;
    value: number;
  };
}

const rarityConfig = {
  common: { gradient: 'from-gray-400 to-gray-600', badge: '🥉' },
  rare: { gradient: 'from-blue-400 to-blue-600', badge: '🥈' },
  epic: { gradient: 'from-purple-400 to-purple-600', badge: '🏵️' },
  legendary: { gradient: 'from-yellow-400 to-yellow-600', badge: '👑' }
};

function Pet3DPreview({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  
  return (
    <primitive 
      object={scene.clone()} 
      scale={2} 
      position={[0, -1, 0]}
    />
  );
}

export default function PetSelector({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  
  useEffect(() => {
    fetchPets();
  }, []);
  
  const fetchPets = async () => {
    const response = await fetch('/api/v1/pets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    setPets(data.pets);
  };
  
  const handleUnlock = async (petId: string) => {
    const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
    });
    
    if (response.ok) {
      fetchPets(); // Refresh
    }
  };
  
  const handleSelectPet = async (petId: string) => {
    const response = await fetch('/api/v1/users/active-pet', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pet_id: petId })
    });
    
    if (response.ok) {
      fetchPets();
      onClose();
    }
  };
  
  const filteredPets = pets.filter(pet => {
    if (filter === 'unlocked') return pet.is_unlocked;
    if (filter === 'locked') return !pet.is_unlocked;
    return true;
  });
  
  return (
    <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-6xl">
        <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
        
        {/* Filter Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <a 
            className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Pets
          </a>
          <a 
            className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
            onClick={() => setFilter('unlocked')}
          >
            Unlocked
          </a>
          <a 
            className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
            onClick={() => setFilter('locked')}
          >
            Locked
          </a>
        </div>
        
        {/* Pet Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPets.map(pet => (
            <PetCard
              key={pet.pet_id}
              pet={pet}
              onUnlock={handleUnlock}
              onSelect={handleSelectPet}
              onPreview={setSelectedPet}
            />
          ))}
        </div>
        
        {/* 3D Preview Panel */}
        {selectedPet && (
          <div className="mt-6 p-4 bg-base-200 rounded-lg">
            <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
            <div className="h-64">
              <Canvas>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} />
                <Pet3DPreview url={selectedPet.model_url} />
                <OrbitControls />
              </Canvas>
            </div>
          </div>
        )}
        
        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PetCard({ pet, onUnlock, onSelect, onPreview }: {
  pet: Pet;
  onUnlock: (id: string) => void;
  onSelect: (id: string) => void;
  onPreview: (pet: Pet) => void;
}) {
  const config = rarityConfig[pet.rarity];
  
  return (
    <div 
      className={`card bg-gradient-to-br ${config.gradient} shadow-xl cursor-pointer
                  ${pet.is_active ? 'ring-4 ring-success' : ''}
                  ${!pet.is_unlocked ? 'opacity-50' : ''}`}
      onClick={() => onPreview(pet)}
    >
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <h3 className="card-title text-white text-sm">{pet.name}</h3>
          <span className="text-2xl">{config.badge}</span>
        </div>
        
        <p className="text-white text-xs opacity-80">{pet.name_vi}</p>
        
        {pet.is_unlocked ? (
          pet.is_active ? (
            <div className="badge badge-success">Active ✓</div>
          ) : (
            <button 
              className="btn btn-sm btn-primary mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(pet.pet_id);
              }}
            >
              Select
            </button>
          )
        ) : pet.can_unlock ? (
          <button 
            className="btn btn-sm btn-warning mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onUnlock(pet.pet_id);
            }}
          >
            Unlock
          </button>
        ) : (
          <div className="text-xs text-white mt-2">
            🔒 Unlock at {pet.unlock_condition.value} {pet.unlock_condition.type}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. AR Pet Companion

**Component:** `components/ARPetCompanion.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Entity } from 'aframe-react';

interface ARPetCompanionProps {
  petId: string;
  position?: [number, number, number];
  scale?: number;
}

export default function ARPetCompanion({ 
  petId, 
  position = [0.5, 0, -1],
  scale = 0.3
}: ARPetCompanionProps) {
  const [petModel, setPetModel] = useState<string>('');
  
  useEffect(() => {
    fetchActivePet();
  }, [petId]);
  
  const fetchActivePet = async () => {
    const response = await fetch('/api/v1/pets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const activePet = data.pets.find(p => p.is_active);
    
    if (activePet) {
      setPetModel(activePet.model_url);
    }
  };
  
  if (!petModel) return null;
  
  return (
    <Entity
      gltf-model={`url(${petModel})`}
      position={position.join(' ')}
      scale={`${scale} ${scale} ${scale}`}
      animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
    />
  );
}
```

### 3. Pet Achievement Notification

**Component:** `components/PetUnlockNotification.tsx`

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export default function PetUnlockNotification({ 
  pet, 
  onClose 
}: { 
  pet: {name: string; rarity: string; model_url: string}; 
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div className="card w-96 bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-white text-3xl">🎉 New Pet Unlocked!</h2>
          
          <div className="my-4">
            <img 
              src={pet.model_url.replace('.glb', '_thumb.png')} 
              alt={pet.name}
              className="w-32 h-32 rounded-full"
            />
          </div>
          
          <h3 className="text-2xl font-bold text-white">{pet.name}</h3>
          <div className="badge badge-lg badge-warning">{pet.rarity.toUpperCase()}</div>
          
          <p className="text-white mt-4">
            Your new companion is ready to join you on your learning journey!
          </p>
          
          <button className="btn btn-primary mt-4" onClick={onClose}>
            Meet {pet.name}!
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 🔗 Integration Points

### 1. Dashboard Integration

Add pet selector button to dashboard:

```tsx
// pages/Dashboard.tsx
import PetSelector from '@/components/PetSelector';

export default function Dashboard() {
  const [showPetSelector, setShowPetSelector] = useState(false);
  
  return (
    <div>
      {/* ... existing dashboard */}
      
      <button 
        className="btn btn-circle btn-lg fixed bottom-4 right-4"
        onClick={() => setShowPetSelector(true)}
      >
        🐾
      </button>
      
      <PetSelector 
        isOpen={showPetSelector}
        onClose={() => setShowPetSelector(false)}
      />
    </div>
  );
}
```

### 2. AR Viewer Integration

Add pet to AR scenes:

```tsx
// pages/LearnAR.tsx
import ARPetCompanion from '@/components/ARPetCompanion';

export default function LearnAR() {
  const { user } = useAuth();
  
  return (
    <a-scene>
      {/* ... existing AR content */}
      
      {user.active_pet && (
        <ARPetCompanion petId={user.active_pet} />
      )}
    </a-scene>
  );
}
```

### 3. XP/Progress Hook

Trigger unlock checks on XP gain:

```tsx
// hooks/useGamification.ts
export function useGamification() {
  const checkPetUnlocks = async (newXP: number) => {
    const response = await fetch('/api/v1/pets');
    const { pets } = await response.json();
    
    const newlyUnlockable = pets.filter(pet => 
      !pet.is_unlocked && 
      pet.can_unlock &&
      pet.unlock_condition.type === 'xp' &&
      pet.unlock_condition.value <= newXP
    );
    
    if (newlyUnlockable.length > 0) {
      showPetUnlockNotification(newlyUnlockable[0]);
    }
  };
  
  return { checkPetUnlocks };
}
```

---

## ✅ Implementation Checklist

### Phase 1: Database & Backend
- [ ] Create pets collection indexes
- [ ] Add `active_pet` and `unlocked_pets` to Users schema
- [ ] Implement `GET /api/v1/pets` endpoint
- [ ] Implement `POST /api/v1/pets/{id}/unlock` endpoint
- [ ] Implement `PUT /api/v1/users/active-pet` endpoint
- [ ] Add unlock condition validation logic
- [ ] Test all endpoints with Postman

### Phase 2: Frontend Components
- [ ] Create `PetSelector.tsx` component
- [ ] Create `PetCard.tsx` component  
- [ ] Create `Pet3DPreview.tsx` component
- [ ] Create `ARPetCompanion.tsx` component
- [ ] Create `PetUnlockNotification.tsx` component
- [ ] Add pet selector to Dashboard
- [ ] Test responsive design

### Phase 3: AR Integration
- [ ] Load pet model in AR scene
- [ ] Position pet companion correctly
- [ ] Add idle animations
- [ ] Test on mobile devices
- [ ] Optimize performance

### Phase 4: Gamification
- [ ] Integrate with XP system
- [ ] Add unlock notifications
- [ ] Track unlock achievements
- [ ] Add analytics events

### Phase 5: Polish & Testing
- [ ] Add loading states
- [ ] Handle errors gracefully
- [ ] Add Vietnamese translations
- [ ] Write unit tests
- [ ] Conduct user testing

---

## 🎯 Success Metrics

**Engagement:**
- % of users who select a pet (target: >70%)
- Average time to first pet unlock (target: <10 minutes)
- Number of pets unlocked per user (target: 3+)

**Retention:**
- 7-day retention increase (target: +15%)
- Daily active users increase (target: +20%)

**Performance:**
- AR scene load time with pet (target: <3s)
- Frame rate in AR mode (target: >30fps)

---

*Feature Status: READY FOR IMPLEMENTATION*
*Estimated Development Time: 2 weeks*
*Priority: HIGH*
