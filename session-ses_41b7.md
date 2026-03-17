# Plan Mode system reminder for AR flashcards

**Session ID:** ses_41b757f5bffeGvcCbgpy9rcpBS
**Created:** 1/22/2026, 2:10:40 PM
**Updated:** 2/15/2026, 11:47:04 PM

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 47.0s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `pets`, `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Functions: `fetchPets`, `handleUnlock`, `handleSelectPet`
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

8. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

9. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.8s)

I have clear next steps. Let me continue by creating the `PetSelector.tsx` component - the main modal that combines all pet components together.

Let me first review the spec example and the existing components to ensure proper integration:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.9s)

Now let me also check the PetUnlockModal and PetCard to understand the full integration:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Gamification\\RewardCelebration.tsx",
  "limit": 80
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Gamification\RewardCelebration.tsx</path>
<type>file</type>
<content>1: // src/components/Gamification/RewardCelebration.tsx
2: // Kid-friendly celebration overlay for rewards, level-ups, and stickers
3: 
4: import React, { useEffect, useState, useCallback } from 'react';
5: import { HapticService } from '../../services/HapticService';
6: import { SoundEffectService } from '../../services/SoundEffectService';
7: import { eventBus } from '../../runtime/EventBus';
8: 
9: export type CelebrationType = 
10:     | 'level_up' 
11:     | 'sticker_earned' 
12:     | 'badge_earned' 
13:     | 'pet_evolved' 
14:     | 'streak_milestone';
15: 
16: interface CelebrationData {
17:     type: CelebrationType;
18:     title: string;
19:     subtitle?: string;
20:     emoji: string;
21:     details?: {
22:         name?: string;
23:         rarity?: string;
24:         level?: number;
25:         stage?: string;
26:         imageUrl?: string;
27:     };
28: }
29: 
30: interface RewardCelebrationProps {
31:     /** If controlled externally */
32:     celebration?: CelebrationData | null;
33:     onClose?: () => void;
34:     /** Auto-listen to EventBus events */
35:     autoListen?: boolean;
36: }
37: 
38: // Celebration configs
39: const CELEBRATION_CONFIGS: Record<CelebrationType, { bg: string; confetti: string[] }> = {
40:     level_up: {
41:         bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
42:         confetti: ['🌟', '⭐', '✨', '🎉', '🚀'],
43:     },
44:     sticker_earned: {
45:         bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
46:         confetti: ['🎨', '✨', '🌈', '⭐', '💫'],
47:     },
48:     badge_earned: {
49:         bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
50:         confetti: ['🏆', '🎖️', '🏅', '⭐', '✨'],
51:     },
52:     pet_evolved: {
53:         bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
54:         confetti: ['🐾', '✨', '💫', '🌟', '🎉'],
55:     },
56:     streak_milestone: {
57:         bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
58:         confetti: ['🔥', '💪', '⚡', '🌟', '🎯'],
59:     },
60: };
61: 
62: const RARITY_COLORS: Record<string, string> = {
63:     common: '#9ca3af',
64:     rare: '#3b82f6',
65:     epic: '#8b5cf6',
66:     legendary: '#f59e0b',
67: };
68: 
69: export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
70:     celebration: externalCelebration,
71:     onClose,
72:     autoListen = true,
73: }) => {
74:     const [celebration, setCelebration] = useState<CelebrationData | null>(externalCelebration || null);
75:     const [isVisible, setIsVisible] = useState(false);
76:     const [confettiPieces, setConfettiPieces] = useState<{ id: number; emoji: string; left: string; delay: string }[]>([]);
77: 
78:     // Generate confetti
79:     const generateConfetti = useCallback((type: CelebrationType) => {
80:         const config = CELEBRATION_CONFIGS[type];

(File has more lines. Use 'offset' parameter to read beyond line 80)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 46.4s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `pets`, `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Functions: `fetchPets`, `handleUnlock`, `handleSelectPet`
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

8. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

9. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 6.6s)

I have clear next steps. Let me create `PetSelector.tsx` - the main modal component that combines all pet components.

First, let me quickly review the spec example and the existing components to ensure proper integration:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.0s)

Now let me also check the PetUnlockModal to understand the full integration:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 46.4s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `pets`, `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

8. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

9. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.4s)

I'll continue with creating the `PetSelector.tsx` component. Let me first review the spec example code and the existing components to ensure I follow the correct patterns.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 7.2s)

Now let me also check the PetUnlockModal to understand how it's implemented, and check the RewardCelebration for modal styling patterns:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Gamification\\RewardCelebration.tsx",
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Gamification\RewardCelebration.tsx</path>
<type>file</type>
<content>1: // src/components/Gamification/RewardCelebration.tsx
2: // Kid-friendly celebration overlay for rewards, level-ups, and stickers
3: 
4: import React, { useEffect, useState, useCallback } from 'react';
5: import { HapticService } from '../../services/HapticService';
6: import { SoundEffectService } from '../../services/SoundEffectService';
7: import { eventBus } from '../../runtime/EventBus';
8: 
9: export type CelebrationType = 
10:     | 'level_up' 
11:     | 'sticker_earned' 
12:     | 'badge_earned' 
13:     | 'pet_evolved' 
14:     | 'streak_milestone';
15: 
16: interface CelebrationData {
17:     type: CelebrationType;
18:     title: string;
19:     subtitle?: string;
20:     emoji: string;
21:     details?: {
22:         name?: string;
23:         rarity?: string;
24:         level?: number;
25:         stage?: string;
26:         imageUrl?: string;
27:     };
28: }
29: 
30: interface RewardCelebrationProps {
31:     /** If controlled externally */
32:     celebration?: CelebrationData | null;
33:     onClose?: () => void;
34:     /** Auto-listen to EventBus events */
35:     autoListen?: boolean;
36: }
37: 
38: // Celebration configs
39: const CELEBRATION_CONFIGS: Record<CelebrationType, { bg: string; confetti: string[] }> = {
40:     level_up: {
41:         bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
42:         confetti: ['🌟', '⭐', '✨', '🎉', '🚀'],
43:     },
44:     sticker_earned: {
45:         bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
46:         confetti: ['🎨', '✨', '🌈', '⭐', '💫'],
47:     },
48:     badge_earned: {
49:         bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
50:         confetti: ['🏆', '🎖️', '🏅', '⭐', '✨'],
51:     },
52:     pet_evolved: {
53:         bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
54:         confetti: ['🐾', '✨', '💫', '🌟', '🎉'],
55:     },
56:     streak_milestone: {
57:         bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
58:         confetti: ['🔥', '💪', '⚡', '🌟', '🎯'],
59:     },
60: };
61: 
62: const RARITY_COLORS: Record<string, string> = {
63:     common: '#9ca3af',
64:     rare: '#3b82f6',
65:     epic: '#8b5cf6',
66:     legendary: '#f59e0b',
67: };
68: 
69: export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
70:     celebration: externalCelebration,
71:     onClose,
72:     autoListen = true,
73: }) => {
74:     const [celebration, setCelebration] = useState<CelebrationData | null>(externalCelebration || null);
75:     const [isVisible, setIsVisible] = useState(false);
76:     const [confettiPieces, setConfettiPieces] = useState<{ id: number; emoji: string; left: string; delay: string }[]>([]);
77: 
78:     // Generate confetti
79:     const generateConfetti = useCallback((type: CelebrationType) => {
80:         const config = CELEBRATION_CONFIGS[type];
81:         const pieces: { id: number; emoji: string; left: string; delay: string }[] = [];
82:         
83:         for (let i = 0; i < 30; i++) {
84:             pieces.push({
85:                 id: i,
86:                 emoji: config.confetti[Math.floor(Math.random() * config.confetti.length)],
87:                 left: `${Math.random() * 100}%`,
88:                 delay: `${Math.random() * 2}s`,
89:             });
90:         }
91:         
92:         setConfettiPieces(pieces);
93:     }, []);
94: 
95:     // Show celebration
96:     const showCelebration = useCallback((data: CelebrationData) => {
97:         setCelebration(data);
98:         setIsVisible(true);
99:         generateConfetti(data.type);
100:         

(File has more lines. Use 'offset' parameter to read beyond line 100)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 46.3s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `pets`, `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

8. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

9. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.6s)

I have clear next steps. Let me create the `PetSelector.tsx` component and then the `index.ts` barrel export file.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.4s)

Now I have all the context I need. Let me create the `PetSelector.tsx` component and then the `index.ts` barrel export.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create PetSelector.tsx - main modal combining all pet components",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create index.ts barrel export file for pets components",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create PetSelector.tsx - main modal combining all pet components",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create index.ts barrel export file for pets components",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 48.5s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `pets`, `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

8. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

9. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.0s)

I have clear next steps. Let me continue with creating `PetSelector.tsx` - the main modal that combines all pet components.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create PetSelector.tsx - main modal combining 3D preview + pet grid",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create index.ts barrel export file for pet components",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 3 complete - all Pet UI components done",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create PetSelector.tsx - main modal combining 3D preview + pet grid",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create index.ts barrel export file for pet components",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3 complete - all Pet UI components done",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 6.0s)

Let me first review the spec example code and the existing components to ensure I build this correctly:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.6s)

Now let me check the PetUnlockModal to understand how to integrate it:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 46.2s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

8. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

9. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 9.1s)

I have clear next steps. Let me continue by creating the `PetSelector.tsx` component - the main modal that combines all pet components.

First, let me quickly review the spec example code and the existing components to ensure I follow the patterns correctly:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.6s)

Now let me also quickly check the `PetUnlockModal.tsx` to understand its interface:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx",
  "limit": 60
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);

(File has more lines. Use 'offset' parameter to read beyond line 60)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 47.9s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

8. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

9. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.5s)

I'll continue with creating `PetSelector.tsx` - the main modal that combines all pet components. Let me first read the spec example code for reference, then create the component.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 6.2s)

Now let me also check the existing components for reference patterns:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Gamification\\RewardCelebration.tsx",
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Gamification\RewardCelebration.tsx</path>
<type>file</type>
<content>1: // src/components/Gamification/RewardCelebration.tsx
2: // Kid-friendly celebration overlay for rewards, level-ups, and stickers
3: 
4: import React, { useEffect, useState, useCallback } from 'react';
5: import { HapticService } from '../../services/HapticService';
6: import { SoundEffectService } from '../../services/SoundEffectService';
7: import { eventBus } from '../../runtime/EventBus';
8: 
9: export type CelebrationType = 
10:     | 'level_up' 
11:     | 'sticker_earned' 
12:     | 'badge_earned' 
13:     | 'pet_evolved' 
14:     | 'streak_milestone';
15: 
16: interface CelebrationData {
17:     type: CelebrationType;
18:     title: string;
19:     subtitle?: string;
20:     emoji: string;
21:     details?: {
22:         name?: string;
23:         rarity?: string;
24:         level?: number;
25:         stage?: string;
26:         imageUrl?: string;
27:     };
28: }
29: 
30: interface RewardCelebrationProps {
31:     /** If controlled externally */
32:     celebration?: CelebrationData | null;
33:     onClose?: () => void;
34:     /** Auto-listen to EventBus events */
35:     autoListen?: boolean;
36: }
37: 
38: // Celebration configs
39: const CELEBRATION_CONFIGS: Record<CelebrationType, { bg: string; confetti: string[] }> = {
40:     level_up: {
41:         bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
42:         confetti: ['🌟', '⭐', '✨', '🎉', '🚀'],
43:     },
44:     sticker_earned: {
45:         bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
46:         confetti: ['🎨', '✨', '🌈', '⭐', '💫'],
47:     },
48:     badge_earned: {
49:         bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
50:         confetti: ['🏆', '🎖️', '🏅', '⭐', '✨'],
51:     },
52:     pet_evolved: {
53:         bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
54:         confetti: ['🐾', '✨', '💫', '🌟', '🎉'],
55:     },
56:     streak_milestone: {
57:         bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
58:         confetti: ['🔥', '💪', '⚡', '🌟', '🎯'],
59:     },
60: };
61: 
62: const RARITY_COLORS: Record<string, string> = {
63:     common: '#9ca3af',
64:     rare: '#3b82f6',
65:     epic: '#8b5cf6',
66:     legendary: '#f59e0b',
67: };
68: 
69: export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
70:     celebration: externalCelebration,
71:     onClose,
72:     autoListen = true,
73: }) => {
74:     const [celebration, setCelebration] = useState<CelebrationData | null>(externalCelebration || null);
75:     const [isVisible, setIsVisible] = useState(false);
76:     const [confettiPieces, setConfettiPieces] = useState<{ id: number; emoji: string; left: string; delay: string }[]>([]);
77: 
78:     // Generate confetti
79:     const generateConfetti = useCallback((type: CelebrationType) => {
80:         const config = CELEBRATION_CONFIGS[type];
81:         const pieces: { id: number; emoji: string; left: string; delay: string }[] = [];
82:         
83:         for (let i = 0; i < 30; i++) {
84:             pieces.push({
85:                 id: i,
86:                 emoji: config.confetti[Math.floor(Math.random() * config.confetti.length)],
87:                 left: `${Math.random() * 100}%`,
88:                 delay: `${Math.random() * 2}s`,
89:             });
90:         }
91:         
92:         setConfettiPieces(pieces);
93:     }, []);
94: 
95:     // Show celebration
96:     const showCelebration = useCallback((data: CelebrationData) => {
97:         setCelebration(data);
98:         setIsVisible(true);
99:         generateConfetti(data.type);
100:         

(File has more lines. Use 'offset' parameter to read beyond line 100)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 47.5s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Patterns to Follow:**

   **RewardCelebration.tsx Pattern:**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - EventBus integration for listening to events
   - `HapticService.levelUp()` and `SoundEffectService.play('levelUp')` for feedback
   - Rounded corners (rounded-3xl), shadows, white borders (4px solid #fff)
   - Auto-dismiss with setTimeout
   - Confetti generation pattern with falling emoji animation

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   import { eventBus } from '@/runtime/EventBus';
   ```

4. **usePets Hook API** (fully implemented in `frontend-web/src/hooks/usePets.ts`):
   ```typescript
   const {
       pets, activePet, stats, isLoading, error, recentlyUnlocked,
       fetchPets, unlockPet, setActivePet, clearActivePet,
       getPetById, getUnlockedPets, getUnlockablePets, getUnlockProgress
   } = usePets(userId);
   ```

5. **Pet Interface (from usePets.ts):**
   ```typescript
   interface Pet {
       pet_id: string; name: string; name_vi: string; model_url: string;
       thumbnail_url: string | null; category: string; pack_source: string;
       rarity: 'common' | 'rare' | 'epic' | 'legendary'; color: string;
       animations: string[]; unlock_condition: UnlockCondition;
       is_unlocked: boolean; is_active: boolean; can_unlock: boolean;
   }
   ```

6. **Created Component Exports:**
   - `PetCard.tsx`: exports `PetCard`, `PetCardProps`, `rarityConfig`
   - `PetViewer3D.tsx`: exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`, `PetViewer3DProps`, `PetViewer3DCompactProps`
   - `PetGrid.tsx`: exports `PetGrid`, `PetGridProps` (has built-in filter tabs)
   - `PetUnlockModal.tsx`: exports `PetUnlockModal`, `PetUnlockModalProps`

7. **PetGrid already has filter tabs built-in** - no need to duplicate in PetSelector

8. **PetViewer3D (full version)** should be used for the preview panel (not compact version)

9. **Spec Example Code (lines 298-415)** shows PetSelector implementation with:
   - Modal structure with filter tabs + grid + 3D preview panel below
   - Props: `isOpen: boolean`, `onClose: () => void`
   - State: `selectedPet`, `filter` ('all' | 'unlocked' | 'locked')
   - Layout: Filter tabs at top, grid in middle, 3D preview panel at bottom when pet selected

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook with all exports

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Rarity gradient, thumbnail, lock/unlock status, progress bar, active indicator, shimmer effect for legendary. Exports `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | useGLTF for GLB models, Canvas, OrbitControls, Float animation, Suspense loading, Environment lighting, animation support, error handling, loading states. Exports `PetViewer3D`, `PetViewer3DCompact`, and `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Filter tabs (all/unlocked/locked), responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview using PetViewer3DCompact, rarity-based styling, "Set as My Pet" button, auto-dismiss, sparkle animations, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button
   - PetGrid component (already has built-in filter tabs)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop, show `PetUnlockModal` for recently unlocked
7. Handle set active flow → call `onSetActive` prop
8. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
   }
   ```
9. Responsive layout (stacked on mobile, side-by-side on tablet+)
10. Use spec example code (lines 298-415) as reference for structure

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec with component examples (lines 258-472 for UI)
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files (Use patterns from these)
```
frontend-web/src/
├── hooks/usePets.ts                              # ✅ Pet interface & hook API (IMPORT Pet type from here)
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
├── runtime/EventBus.ts                           # Event bus singleton
├── components/Gamification/
│   ├── Pet3D.tsx                                 # R3F Canvas, Float, animations pattern
│   └── RewardCelebration.tsx                     # Celebration modal, confetti, kid-friendly styling
```

### Frontend - Files Created/To Create
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ CREATED - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ CREATED - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ CREATED - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ CREATED - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 6.7s)

I have clear next steps. Let me continue with creating `PetSelector.tsx` - the main modal that combines all pet components.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create PetSelector.tsx - main modal combining 3D preview + pet grid",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create index.ts barrel export file for pets components",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 3 Complete - All Pet UI Components done",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create PetSelector.tsx - main modal combining 3D preview + pet grid",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create index.ts barrel export file for pets components",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3 Complete - All Pet UI Components done",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 6.5s)

Let me first check the existing components to ensure I follow the correct patterns and imports:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {
101:         HapticService.tap();
102:         SoundEffectService.play('click');
103:         setActiveFilter(filter);
104:     };
105: 
106:     // Get counts for badges
107:     const counts = useMemo(() => ({
108:         all: pets.length,
109:         unlocked: pets.filter(p => p.is_unlocked).length,
110:         locked: pets.filter(p => !p.is_unlocked).length,
111:     }), [pets]);
112: 
113:     // Empty state component
114:     const EmptyState = ({ filter }: { filter: FilterTab }) => {
115:         const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
116:             all: {
117:                 title: 'No Pets Available',
118:                 subtitle: 'Check back soon for new pets!',
119:                 emoji: '🎁',
120:             },
121:             unlocked: {
122:                 title: 'No Pets Yet',
123:                 subtitle: 'Unlock your first pet by earning XP!',
124:                 emoji: '🌟',
125:             },
126:             locked: {
127:                 title: 'All Unlocked!',
128:                 subtitle: "Amazing! You've unlocked every pet!",
129:                 emoji: '🏆',
130:             },
131:         };
132: 
133:         const { title, subtitle, emoji } = emptyMessages[filter];
134: 
135:         return (
136:             <div 
137:                 className="flex flex-col items-center justify-center py-12 px-4"
138:                 style={{
139:                     background: 'rgba(255,255,255,0.1)',
140:                     borderRadius: '24px',
141:                     border: '2px dashed rgba(255,255,255,0.3)',
142:                 }}
143:             >
144:                 <div 
145:                     className="text-6xl mb-4"
146:                     style={{ animation: 'bounce 2s infinite' }}
147:                 >
148:                     {emoji}
149:                 </div>
150:                 <h3 
151:                     className="text-xl font-bold text-white mb-2"
152:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
153:                 >
154:                     {title}
155:                 </h3>
156:                 <p 
157:                     className="text-white/70 text-center"
158:                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
159:                 >
160:                     {subtitle}
161:                 </p>
162:             </div>
163:         );
164:     };
165: 
166:     return (
167:         <div className={`pet-grid-container ${className}`}>
168:             {/* Filter Tabs */}
169:             {showFilters && (
170:                 <div 
171:                     className="flex gap-2 mb-4 p-1 rounded-2xl"
172:                     style={{
173:                         background: 'rgba(255,255,255,0.1)',
174:                         backdropFilter: 'blur(10px)',
175:                     }}
176:                 >
177:                     {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
178:                         const isActive = activeFilter === filter;
179:                         const { label, emoji } = filterConfig[filter];
180:                         const count = counts[filter];
181: 
182:                         return (
183:                             <button
184:                                 key={filter}
185:                                 className={`
186:                                     flex-1 py-3 px-4 rounded-xl font-bold
187:                                     transition-all duration-200
188:                                     flex items-center justify-center gap-2
189:                                     ${isActive ? 'scale-105' : 'hover:scale-102'}
190:                                 `}
191:                                 style={{
192:                                     background: isActive
193:                                         ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
194:                                         : 'transparent',
195:                                     color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
196:                                     boxShadow: isActive
197:                                         ? '0 4px 16px rgba(139, 92, 246, 0.4)'
198:                                         : 'none',
199:                                 }}
200:                                 onClick={() => handleFilterClick(filter)}
201:                             >
202:                                 <span className="text-lg">{emoji}</span>
203:                                 <span className="hidden sm:inline text-sm">{label}</span>
204:                                 <span 
205:                                     className="text-xs px-2 py-0.5 rounded-full"
206:                                     style={{
207:                                         background: isActive
208:                                             ? 'rgba(255,255,255,0.2)'
209:                                             : 'rgba(255,255,255,0.1)',
210:                                     }}
211:                                 >
212:                                     {count}
213:                                 </span>
214:                             </button>
215:                         );
216:                     })}
217:                 </div>
218:             )}
219: 
220:             {/* Pet Grid */}
221:             {filteredPets.length > 0 ? (
222:                 <div 
223:                     className={`
224:                         grid gap-4
225:                         grid-cols-2 
226:                         md:grid-cols-3 
227:                         lg:grid-cols-4
228:                         ${compact ? 'gap-3' : 'gap-4'}
229:                     `}
230:                 >
231:                     {filteredPets.map((pet) => (
232:                         <PetCard
233:                             key={pet.pet_id}
234:                             pet={pet}
235:                             unlockProgress={calculateProgress(pet)}
236:                             isSelected={selectedPetId === pet.pet_id}
237:                             onPreview={onPreview}
238:                             onSelect={onSelect}
239:                             onUnlock={onUnlock}
240:                             compact={compact}
241:                         />
242:                     ))}
243:                 </div>
244:             ) : (
245:                 <EmptyState filter={activeFilter} />
246:             )}
247: 
248:             {/* Stats Summary (when showing all) */}
249:             {activeFilter === 'all' && pets.length > 0 && (
250:                 <div 
251:                     className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
252:                     style={{
253:                         background: 'rgba(255,255,255,0.1)',
254:                         backdropFilter: 'blur(10px)',
255:                     }}
256:                 >
257:                     <div className="text-center">
258:                         <div className="text-2xl font-bold text-white">
259:                             {counts.unlocked}
260:                         </div>
261:                         <div className="text-xs text-white/60">Unlocked</div>
262:                     </div>
263:                     <div 
264:                         className="w-px h-8"
265:                         style={{ background: 'rgba(255,255,255,0.2)' }}
266:                     />
267:                     <div className="text-center">
268:                         <div className="text-2xl font-bold text-white">
269:                             {counts.all}
270:                         </div>
271:                         <div className="text-xs text-white/60">Total</div>
272:                     </div>
273:                     <div 
274:                         className="w-px h-8"
275:                         style={{ background: 'rgba(255,255,255,0.2)' }}
276:                     />
277:                     <div className="text-center">
278:                         <div 
279:                             className="text-2xl font-bold"
280:                             style={{
281:                                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
282:                                 WebkitBackgroundClip: 'text',
283:                                 WebkitTextFillColor: 'transparent',
284:                             }}
285:                         >
286:                             {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
287:                         </div>
288:                         <div className="text-xs text-white/60">Complete</div>
289:                     </div>
290:                 </div>
291:             )}
292: 
293:             {/* Animations */}
294:             <style>{`
295:                 @keyframes bounce {
296:                     0%, 100% { transform: translateY(0); }
297:                     50% { transform: translateY(-10px); }
298:                 }
299:                 
300:                 .hover\\:scale-102:hover {
301:                     transform: scale(1.02);
302:                 }
303:             `}</style>
304:         </div>
305:     );
306: };
307: 
308: export default PetGrid;
309: 

(End of file - total 309 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();
81:         };
82:     }, [animations, clonedScene, enableAnimation, onLoad]);
83: 
84:     // Update animation mixer
85:     useFrame((_, delta) => {
86:         mixerRef.current?.update(delta);
87: 
88:         // Add subtle breathing animation if no built-in animations
89:         if (groupRef.current && (!animations || animations.length === 0)) {
90:             const breathe = Math.sin(Date.now() * 0.002) * 0.02;
91:             groupRef.current.scale.setScalar(scale * (1 + breathe));
92:         }
93:     });
94: 
95:     return (
96:         <group ref={groupRef}>
97:             <Center>
98:                 <primitive 
99:                     object={clonedScene} 
100:                     scale={scale}
101:                     position={[0, 0, 0]}
102:                     castShadow
103:                     receiveShadow
104:                 />
105:             </Center>
106:         </group>
107:     );
108: }
109: 
110: // ========== Loading Fallback Component ==========
111: 
112: function LoadingFallback() {
113:     const meshRef = useRef<THREE.Mesh>(null);
114: 
115:     useFrame((state) => {
116:         if (meshRef.current) {
117:             meshRef.current.rotation.y = state.clock.elapsedTime * 2;
118:             meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
119:         }
120:     });
121: 
122:     return (
123:         <mesh ref={meshRef}>
124:             <boxGeometry args={[0.5, 0.5, 0.5]} />
125:             <meshStandardMaterial 
126:                 color="#60a5fa" 
127:                 wireframe 
128:             />
129:         </mesh>
130:     );
131: }
132: 
133: // ========== Loading Overlay Component ==========
134: 
135: const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity = 'common' }) => {
136:     const config = rarityConfig[rarity];
137:     
138:     return (
139:         <div 
140:             className="absolute inset-0 flex items-center justify-center"
141:             style={{
142:                 background: 'rgba(0,0,0,0.3)',
143:                 backdropFilter: 'blur(4px)',
144:             }}
145:         >
146:             <div className="text-center">
147:                 <div 
148:                     className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
149:                     style={{
150:                         border: '4px solid rgba(255,255,255,0.2)',
151:                         borderTopColor: 'white',
152:                     }}
153:                 />
154:                 <p 
155:                     className="text-white font-medium text-sm"
156:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
157:                 >
158:                     Loading Pet...
159:                 </p>
160:             </div>
161:         </div>
162:     );
163: };
164: 
165: // ========== Error Display Component ==========
166: 
167: const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
168:     <div 
169:         className="absolute inset-0 flex items-center justify-center p-4"
170:         style={{
171:             background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
172:         }}
173:     >
174:         <div className="text-center text-white">
175:             <div className="text-4xl mb-2">😿</div>
176:             <p className="font-bold mb-1">Oops!</p>
177:             <p className="text-xs opacity-80">{message}</p>
178:         </div>
179:     </div>
180: );
181: 
182: // ========== Main Component ==========
183: 
184: export const PetViewer3D: React.FC<PetViewer3DProps> = ({
185:     pet,
186:     height = '200px',
187:     enableControls = true,
188:     autoRotate = true,
189:     autoRotateSpeed = 2,
190:     showLoading = true,
191:     onLoad,
192:     onError,
193:     background = 'gradient',
194:     backgroundColor,
195:     disableFloat = false,
196:     scale = 2,
197: }) => {
198:     const [isLoading, setIsLoading] = useState(true);
199:     const [error, setError] = useState<string | null>(null);
200:     const config = rarityConfig[pet.rarity];
201: 
202:     // Handle model load complete
203:     const handleLoad = () => {
204:         setIsLoading(false);
205:         onLoad?.();
206:     };
207: 
208:     // Handle model load error
209:     const handleError = (err: Error) => {
210:         setIsLoading(false);
211:         setError(err.message || 'Failed to load pet model');
212:         onError?.(err);
213:     };
214: 
215:     // Determine background style
216:     const getBackgroundStyle = (): React.CSSProperties => {
217:         switch (background) {
218:             case 'transparent':
219:                 return { background: 'transparent' };
220:             case 'solid':
221:                 return { background: backgroundColor || '#1a1a2e' };
222:             case 'gradient':
223:             default:
224:                 return { 
225:                     background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
226:                 };
227:         }
228:     };
229: 
230:     // Check if model URL is valid
231:     if (!pet.model_url) {
232:         return (
233:             <div 
234:                 className="relative rounded-2xl overflow-hidden"
235:                 style={{ 
236:                     height: typeof height === 'number' ? `${height}px` : height,
237:                     ...getBackgroundStyle(),
238:                 }}
239:             >
240:                 <ErrorDisplay message="No model available" />
241:             </div>
242:         );
243:     }
244: 
245:     return (
246:         <div 
247:             className="relative rounded-2xl overflow-hidden"
248:             style={{ 
249:                 height: typeof height === 'number' ? `${height}px` : height,
250:                 border: '3px solid rgba(255,255,255,0.2)',
251:                 boxShadow: `0 8px 32px ${config.glow}`,
252:                 ...getBackgroundStyle(),
253:             }}
254:         >
255:             {/* Loading Overlay */}
256:             {showLoading && isLoading && !error && (
257:                 <LoadingOverlay rarity={pet.rarity} />
258:             )}
259: 
260:             {/* Error Display */}
261:             {error && <ErrorDisplay message={error} />}
262: 
263:             {/* 3D Canvas */}
264:             <Canvas
265:                 camera={{ 
266:                     position: [0, 0.5, 4], 
267:                     fov: 45,
268:                     near: 0.1,
269:                     far: 100,
270:                 }}
271:                 style={{ background: 'transparent' }}
272:                 gl={{ 
273:                     alpha: true, 
274:                     antialias: true,
275:                     powerPreference: 'high-performance',
276:                 }}
277:                 shadows
278:                 onCreated={({ gl }) => {
279:                     gl.setClearColor(0x000000, 0);
280:                 }}
281:             >
282:                 {/* Lighting Setup */}
283:                 <ambientLight intensity={0.6} />
284:                 <directionalLight 
285:                     position={[5, 5, 5]} 
286:                     intensity={0.8}
287:                     castShadow
288:                     shadow-mapSize={[1024, 1024]}
289:                 />
290:                 <directionalLight 
291:                     position={[-5, 3, -5]} 
292:                     intensity={0.4}
293:                 />
294:                 <pointLight 
295:                     position={[0, 4, 0]} 
296:                     intensity={0.3} 
297:                     color="#fff" 
298:                 />
299:                 {/* Colored rim light based on rarity */}
300:                 <pointLight 
301:                     position={[-3, 2, 3]} 
302:                     intensity={0.3} 
303:                     color={config.glow}
304:                 />
305: 
306:                 {/* Environment for better reflections */}
307:                 <Environment preset="city" />
308: 
309:                 {/* Float wrapper for bobbing animation */}
310:                 {disableFloat ? (
311:                     <Suspense fallback={<LoadingFallback />}>
312:                         <Pet3DModel 
313:                             url={pet.model_url}
314:                             scale={scale}
315:                             onLoad={handleLoad}
316:                         />
317:                     </Suspense>
318:                 ) : (
319:                     <Float
320:                         speed={2}
321:                         rotationIntensity={0.2}
322:                         floatIntensity={0.5}
323:                     >
324:                         <Suspense fallback={<LoadingFallback />}>
325:                             <Pet3DModel 
326:                                 url={pet.model_url}
327:                                 scale={scale}
328:                                 onLoad={handleLoad}
329:                             />
330:                         </Suspense>
331:                     </Float>
332:                 )}
333: 
334:                 {/* Orbit Controls for interaction */}
335:                 {enableControls && (
336:                     <OrbitControls
337:                         enablePan={false}
338:                         enableZoom={true}
339:                         minDistance={2}
340:                         maxDistance={8}
341:                         minPolarAngle={Math.PI / 4}
342:                         maxPolarAngle={Math.PI / 1.5}
343:                         autoRotate={autoRotate}
344:                         autoRotateSpeed={autoRotateSpeed}
345:                     />
346:                 )}
347:             </Canvas>
348: 
349:             {/* Pet Name Label */}
350:             <div 
351:                 className="absolute bottom-2 left-2 right-2 text-center"
352:                 style={{ pointerEvents: 'none' }}
353:             >
354:                 <p 
355:                     className="text-white font-bold text-sm"
356:                     style={{ 
357:                         textShadow: '0 2px 8px rgba(0,0,0,0.5)',
358:                         background: 'rgba(0,0,0,0.3)',
359:                         padding: '4px 8px',
360:                         borderRadius: '8px',
361:                         display: 'inline-block',
362:                     }}
363:                 >
364:                     {pet.name}
365:                 </p>
366:             </div>
367: 
368:             {/* Rarity Badge */}
369:             <div 
370:                 className="absolute top-2 right-2 text-2xl"
371:                 style={{ 
372:                     filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
373:                     pointerEvents: 'none',
374:                 }}
375:             >
376:                 {config.badge}
377:             </div>
378:         </div>
379:     );
380: };
381: 
382: // ========== Compact Preview Version ==========
383: 
384: export interface PetViewer3DCompactProps {
385:     /** Model URL to load */
386:     modelUrl: string;
387:     /** Size of the viewer (square) */
388:     size?: number;
389:     /** Scale multiplier for the model */
390:     scale?: number;
391: }
392: 
393: /**
394:  * Compact version for use in thumbnails or small previews
395:  * No controls, simple lighting, minimal UI
396:  */
397: export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
398:     modelUrl,
399:     size = 100,
400:     scale = 1.5,
401: }) => {
402:     if (!modelUrl) {
403:         return (
404:             <div 
405:                 className="flex items-center justify-center bg-gray-200 rounded-lg"
406:                 style={{ width: size, height: size }}
407:             >
408:                 <span className="text-2xl">🐾</span>
409:             </div>
410:         );
411:     }
412: 
413:     return (
414:         <div 
415:             className="rounded-lg overflow-hidden"
416:             style={{ 
417:                 width: size, 
418:                 height: size,
419:                 background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
420:             }}
421:         >
422:             <Canvas
423:                 camera={{ position: [0, 0.3, 3], fov: 50 }}
424:                 style={{ background: 'transparent' }}
425:                 gl={{ alpha: true, antialias: true }}
426:             >
427:                 <ambientLight intensity={0.8} />
428:                 <directionalLight position={[3, 3, 3]} intensity={0.6} />
429:                 
430:                 <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
431:                     <Suspense fallback={null}>
432:                         <Pet3DModel 
433:                             url={modelUrl}
434:                             scale={scale}
435:                             enableAnimation={false}
436:                         />
437:                     </Suspense>
438:                 </Float>
439:             </Canvas>
440:         </div>
441:     );
442: };
443: 
444: // Preload helper for better UX
445: export const preloadPetModel = (url: string) => {
446:     useGLTF.preload(url);
447: };
448: 
449: export default PetViewer3D;
450: 

(End of file - total 450 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.6s)

Now let me check the spec for the PetSelector example code:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 290,
  "limit": 150
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>290:     <primitive 
291:       object={scene.clone()} 
292:       scale={2} 
293:       position={[0, -1, 0]}
294:     />
295:   );
296: }
297: 
298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {
418:   pet: Pet;
419:   onUnlock: (id: string) => void;
420:   onSelect: (id: string) => void;
421:   onPreview: (pet: Pet) => void;
422: }) {
423:   const config = rarityConfig[pet.rarity];
424:   
425:   return (
426:     <div 
427:       className={`card bg-gradient-to-br ${config.gradient} shadow-xl cursor-pointer
428:                   ${pet.is_active ? 'ring-4 ring-success' : ''}
429:                   ${!pet.is_unlocked ? 'opacity-50' : ''}`}
430:       onClick={() => onPreview(pet)}
431:     >
432:       <div className="card-body p-4">
433:         <div className="flex justify-between items-start">
434:           <h3 className="card-title text-white text-sm">{pet.name}</h3>
435:           <span className="text-2xl">{config.badge}</span>
436:         </div>
437:         
438:         <p className="text-white text-xs opacity-80">{pet.name_vi}</p>
439:         

(File has more lines. Use 'offset' parameter to read beyond line 439)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 38.8s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Component Patterns (from PetUnlockModal, PetGrid, PetViewer3D):**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - `HapticService.tap()` / `HapticService.success()` and `SoundEffectService.play('click')` for feedback
   - Rounded corners (rounded-3xl), glassmorphism backgrounds (rgba + backdrop-filter)
   - White borders (4px solid #fff), glowing shadows

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   ```

4. **Component APIs (confirmed from reading files):**

   **PetGrid Props:**
   ```typescript
   interface PetGridProps {
       pets: Pet[];
       selectedPetId?: string;
       userXP?: number;
       userStreak?: number;
       onPreview?: (pet: Pet) => void;
       onSelect?: (petId: string) => void;
       onUnlock?: (petId: string) => void;
       compact?: boolean;
       showFilters?: boolean;  // default true - has built-in filter tabs
       className?: string;
   }
   ```

   **PetViewer3D Props (full version):**
   ```typescript
   interface PetViewer3DProps {
       pet: Pet;
       height?: string | number;
       enableControls?: boolean;
       autoRotate?: boolean;
       autoRotateSpeed?: number;
       showLoading?: boolean;
       onLoad?: () => void;
       onError?: (error: Error) => void;
       background?: 'transparent' | 'gradient' | 'solid';
       backgroundColor?: string;
       disableFloat?: boolean;
       scale?: number;
   }
   ```

   **PetUnlockModal Props:**
   ```typescript
   interface PetUnlockModalProps {
       pet: Pet;
       isOpen: boolean;
       onClose: () => void;
       onSetActive?: (petId: string) => void;
       autoDismissMs?: number;
   }
   ```

5. **Spec Example Code (lines 298-415)** shows PetSelector structure:
   - Modal with title "🐾 Choose Your Companion"
   - Filter tabs + Pet grid + 3D preview panel below when pet selected
   - Close button in modal-action area

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook

### ✅ Phase 3: Pet UI Components (IN PROGRESS)

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Exports `PetCard`, `PetCardProps`, `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | Exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Built-in filter tabs, responsive grid, empty states, stats summary |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview, haptic/sound feedback |
| `PetSelector.tsx` | 📋 **CREATE NOW** | Main modal combining 3D preview + pet grid |
| `index.ts` | 📋 PENDING | Barrel export file |

## Next Action

**Create `PetSelector.tsx`** - the main modal that combines all pet components:

1. Import `Pet` type from `@/hooks/usePets`
2. Import `PetGrid`, `PetViewer3D`, `PetUnlockModal`, `rarityConfig` from sibling components
3. Modal with slide-up animation (kid-friendly)
4. Layout structure:
   - Header with title "🐾 Choose Your Companion" and close button (X)
   - PetGrid component (already has built-in filter tabs via `showFilters` prop)
   - 3D preview area below grid (shown when a pet is selected) using `PetViewer3D` (full version, not compact)
5. Handle pet selection → preview in 3D viewer
6. Handle unlock flow → call `onUnlock` prop
7. Handle set active flow → call `onSetActive` prop
8. Handle recently unlocked → show `PetUnlockModal` overlay
9. Props interface:
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
       onUnlockModalClose?: () => void;
   }
   ```
10. Use glassmorphism background, white border, kid-friendly styling
11. Scrollable grid area with max-height
12. Responsive layout

After `PetSelector.tsx`, create `index.ts` barrel export file.

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - lines 298-415 for PetSelector example
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files
```
frontend-web/src/
├── hooks/usePets.ts                              # Pet interface & hook API
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
```

### Frontend - Pet Components (Working Directory)
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ DONE - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ DONE - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ DONE - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ DONE - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # 📋 CREATE NOW - main modal combining all components
└── index.ts                                      # 📋 PENDING - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 8.0s)

I have clear next steps from the continuation summary. Let me proceed with creating the `PetSelector.tsx` component.

First, let me quickly review the existing components to ensure I follow the exact patterns:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx",
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }

(File has more lines. Use 'offset' parameter to read beyond line 100)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetGrid.tsx",
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetGrid.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetGrid.tsx
3:  * 
4:  * Grid display of pet cards with:
5:  * - Filter tabs (All / Unlocked / Locked)
6:  * - Responsive grid layout
7:  * - Empty states for each filter
8:  * - Kid-friendly styling matching app theme
9:  */
10: 
11: import React, { useState, useMemo } from 'react';
12: import { Pet } from '@/hooks/usePets';
13: import { PetCard } from './PetCard';
14: import { HapticService } from '@/services/HapticService';
15: import { SoundEffectService } from '@/services/SoundEffectService';
16: 
17: // ========== Types ==========
18: 
19: type FilterTab = 'all' | 'unlocked' | 'locked';
20: 
21: export interface PetGridProps {
22:     /** Array of all pets */
23:     pets: Pet[];
24:     /** Currently selected pet ID for preview */
25:     selectedPetId?: string;
26:     /** User's current XP for progress calculation */
27:     userXP?: number;
28:     /** User's current streak for progress calculation */
29:     userStreak?: number;
30:     /** Called when user clicks to preview a pet in 3D */
31:     onPreview?: (pet: Pet) => void;
32:     /** Called when user clicks to select a pet as active */
33:     onSelect?: (petId: string) => void;
34:     /** Called when user clicks to unlock a pet */
35:     onUnlock?: (petId: string) => void;
36:     /** Use compact card mode */
37:     compact?: boolean;
38:     /** Show filter tabs */
39:     showFilters?: boolean;
40:     /** Custom class name */
41:     className?: string;
42: }
43: 
44: // ========== Filter Tab Config ==========
45: 
46: const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
47:     all: { label: 'All Pets', emoji: '🐾' },
48:     unlocked: { label: 'My Pets', emoji: '✨' },
49:     locked: { label: 'Locked', emoji: '🔒' },
50: };
51: 
52: // ========== Component ==========
53: 
54: export const PetGrid: React.FC<PetGridProps> = ({
55:     pets,
56:     selectedPetId,
57:     userXP = 0,
58:     userStreak = 0,
59:     onPreview,
60:     onSelect,
61:     onUnlock,
62:     compact = false,
63:     showFilters = true,
64:     className = '',
65: }) => {
66:     const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
67: 
68:     // Filter pets based on active tab
69:     const filteredPets = useMemo(() => {
70:         switch (activeFilter) {
71:             case 'unlocked':
72:                 return pets.filter(p => p.is_unlocked);
73:             case 'locked':
74:                 return pets.filter(p => !p.is_unlocked);
75:             case 'all':
76:             default:
77:                 return pets;
78:         }
79:     }, [pets, activeFilter]);
80: 
81:     // Calculate unlock progress for a pet
82:     const calculateProgress = (pet: Pet): number => {
83:         if (pet.is_unlocked) return 100;
84:         if (pet.unlock_condition.type === 'free') return 100;
85: 
86:         const { type, value } = pet.unlock_condition;
87:         switch (type) {
88:             case 'xp':
89:                 return Math.min(100, Math.round((userXP / value) * 100));
90:             case 'streak':
91:                 return Math.min(100, Math.round((userStreak / value) * 100));
92:             case 'achievement':
93:                 return pet.can_unlock ? 100 : 0;
94:             default:
95:                 return 0;
96:         }
97:     };
98: 
99:     // Handle filter tab click
100:     const handleFilterClick = (filter: FilterTab) => {

(File has more lines. Use 'offset' parameter to read beyond line 100)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 298,
  "limit": 120
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>298: export default function PetSelector({ 
299:   isOpen, 
300:   onClose 
301: }: { 
302:   isOpen: boolean; 
303:   onClose: () => void;
304: }) {
305:   const [pets, setPets] = useState<Pet[]>([]);
306:   const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
307:   const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
308:   
309:   useEffect(() => {
310:     fetchPets();
311:   }, []);
312:   
313:   const fetchPets = async () => {
314:     const response = await fetch('/api/v1/pets', {
315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
316:     });
317:     const data = await response.json();
318:     setPets(data.pets);
319:   };
320:   
321:   const handleUnlock = async (petId: string) => {
322:     const response = await fetch(`/api/v1/pets/${petId}/unlock`, {
323:       method: 'POST',
324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
325:     });
326:     
327:     if (response.ok) {
328:       fetchPets(); // Refresh
329:     }
330:   };
331:   
332:   const handleSelectPet = async (petId: string) => {
333:     const response = await fetch('/api/v1/users/active-pet', {
334:       method: 'PUT',
335:       headers: {
336:         'Authorization': `Bearer ${localStorage.getItem('token')}`,
337:         'Content-Type': 'application/json'
338:       },
339:       body: JSON.stringify({ pet_id: petId })
340:     });
341:     
342:     if (response.ok) {
343:       fetchPets();
344:       onClose();
345:     }
346:   };
347:   
348:   const filteredPets = pets.filter(pet => {
349:     if (filter === 'unlocked') return pet.is_unlocked;
350:     if (filter === 'locked') return !pet.is_unlocked;
351:     return true;
352:   });
353:   
354:   return (
355:     <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
356:       <div className="modal-box max-w-6xl">
357:         <h2 className="text-3xl font-bold mb-4">🐾 Choose Your Companion</h2>
358:         
359:         {/* Filter Tabs */}
360:         <div className="tabs tabs-boxed mb-4">
361:           <a 
362:             className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
363:             onClick={() => setFilter('all')}
364:           >
365:             All Pets
366:           </a>
367:           <a 
368:             className={`tab ${filter === 'unlocked' ? 'tab-active' : ''}`}
369:             onClick={() => setFilter('unlocked')}
370:           >
371:             Unlocked
372:           </a>
373:           <a 
374:             className={`tab ${filter === 'locked' ? 'tab-active' : ''}`}
375:             onClick={() => setFilter('locked')}
376:           >
377:             Locked
378:           </a>
379:         </div>
380:         
381:         {/* Pet Grid */}
382:         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
383:           {filteredPets.map(pet => (
384:             <PetCard
385:               key={pet.pet_id}
386:               pet={pet}
387:               onUnlock={handleUnlock}
388:               onSelect={handleSelectPet}
389:               onPreview={setSelectedPet}
390:             />
391:           ))}
392:         </div>
393:         
394:         {/* 3D Preview Panel */}
395:         {selectedPet && (
396:           <div className="mt-6 p-4 bg-base-200 rounded-lg">
397:             <h3 className="text-xl font-bold mb-2">{selectedPet.name}</h3>
398:             <div className="h-64">
399:               <Canvas>
400:                 <ambientLight intensity={0.5} />
401:                 <spotLight position={[10, 10, 10]} angle={0.15} />
402:                 <Pet3DPreview url={selectedPet.model_url} />
403:                 <OrbitControls />
404:               </Canvas>
405:             </div>
406:           </div>
407:         )}
408:         
409:         <div className="modal-action">
410:           <button className="btn" onClick={onClose}>Close</button>
411:         </div>
412:       </div>
413:     </div>
414:   );
415: }
416: 
417: function PetCard({ pet, onUnlock, onSelect, onPreview }: {

(File has more lines. Use 'offset' parameter to read beyond line 417)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 6.2s)

Good, I have the context I need. Let me also check the full PetViewer3D component's exports to ensure I use the correct version:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetViewer3D.tsx",
  "limit": 80
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetViewer3D.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetViewer3D.tsx
3:  * 
4:  * 3D Pet Model Viewer component using React Three Fiber
5:  * Loads GLB/GLTF models from Supabase URLs and renders them with:
6:  * - Float animation for kid-friendly bobbing effect
7:  * - OrbitControls for user interaction (rotate, zoom)
8:  * - Proper lighting setup
9:  * - Suspense loading state
10:  * - Support for model animations (if available)
11:  * 
12:  * Following patterns from Pet3D.tsx and spec Pet3DPreview example
13:  */
14: 
15: import React, { Suspense, useRef, useEffect, useState } from 'react';
16: import { Canvas, useFrame } from '@react-three/fiber';
17: import { OrbitControls, Float, useGLTF, Environment, Center } from '@react-three/drei';
18: import * as THREE from 'three';
19: import { rarityConfig } from './PetCard';
20: import type { Pet } from '@/hooks/usePets';
21: 
22: // ========== Props Interfaces ==========
23: 
24: export interface PetViewer3DProps {
25:     /** The pet to display */
26:     pet: Pet;
27:     /** Height of the viewer container */
28:     height?: string | number;
29:     /** Enable orbit controls for interaction */
30:     enableControls?: boolean;
31:     /** Enable auto-rotation */
32:     autoRotate?: boolean;
33:     /** Auto-rotation speed */
34:     autoRotateSpeed?: number;
35:     /** Show loading indicator */
36:     showLoading?: boolean;
37:     /** Called when model finishes loading */
38:     onLoad?: () => void;
39:     /** Called on loading error */
40:     onError?: (error: Error) => void;
41:     /** Background style - 'transparent' | 'gradient' | 'solid' */
42:     background?: 'transparent' | 'gradient' | 'solid';
43:     /** Custom background color (for 'solid' mode) */
44:     backgroundColor?: string;
45:     /** Disable float animation */
46:     disableFloat?: boolean;
47:     /** Scale multiplier for the model */
48:     scale?: number;
49: }
50: 
51: interface Pet3DModelProps {
52:     url: string;
53:     scale: number;
54:     enableAnimation?: boolean;
55:     onLoad?: () => void;
56: }
57: 
58: // ========== 3D Model Component ==========
59: 
60: function Pet3DModel({ url, scale, enableAnimation = true, onLoad }: Pet3DModelProps) {
61:     const groupRef = useRef<THREE.Group>(null);
62:     const { scene, animations } = useGLTF(url);
63:     const mixerRef = useRef<THREE.AnimationMixer | null>(null);
64: 
65:     // Clone the scene to avoid issues with multiple instances
66:     const clonedScene = React.useMemo(() => scene.clone(), [scene]);
67: 
68:     // Set up animations if available
69:     useEffect(() => {
70:         if (animations && animations.length > 0 && enableAnimation) {
71:             mixerRef.current = new THREE.AnimationMixer(clonedScene);
72:             const action = mixerRef.current.clipAction(animations[0]);
73:             action.play();
74:         }
75: 
76:         // Notify parent that model is loaded
77:         onLoad?.();
78: 
79:         return () => {
80:             mixerRef.current?.stopAllAction();

(File has more lines. Use 'offset' parameter to read beyond line 80)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.9s)

Now I have all the context I need. Let me create the `PetSelector.tsx` component:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create PetSelector.tsx - main modal combining all pet components",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create index.ts barrel export file for pet components",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create PetSelector.tsx - main modal combining all pet components",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create index.ts barrel export file for pet components",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 63.0s)

**Tool: write**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetSelector.tsx",
  "content": "/**\n * PetSelector.tsx\n * \n * Main modal for browsing, previewing, and selecting pets\n * Features:\n * - Full PetGrid with built-in filter tabs\n * - 3D preview panel when a pet is selected\n * - Pet unlock flow integration\n * - Set as active pet functionality\n * - Kid-friendly styling with slide-up animation\n * - Haptic and sound feedback\n * - PetUnlockModal overlay for recently unlocked pets\n */\n\nimport React, { useState, useEffect, useCallback } from 'react';\nimport { Pet } from '@/hooks/usePets';\nimport { PetGrid } from './PetGrid';\nimport { PetViewer3D } from './PetViewer3D';\nimport { PetUnlockModal } from './PetUnlockModal';\nimport { rarityConfig } from './PetCard';\nimport { HapticService } from '@/services/HapticService';\nimport { SoundEffectService } from '@/services/SoundEffectService';\n\n// ========== Props Interface ==========\n\nexport interface PetSelectorProps {\n    /** Whether the modal is open */\n    isOpen: boolean;\n    /** Called when modal should close */\n    onClose: () => void;\n    /** Array of all available pets */\n    pets: Pet[];\n    /** User's current XP for unlock progress */\n    userXP?: number;\n    /** User's current streak for unlock progress */\n    userStreak?: number;\n    /** Called when user unlocks a pet */\n    onUnlock?: (petId: string) => void;\n    /** Called when user sets a pet as active */\n    onSetActive?: (petId: string) => void;\n    /** Recently unlocked pet to show celebration modal */\n    recentlyUnlockedPet?: Pet | null;\n    /** Called when unlock celebration modal closes */\n    onUnlockModalClose?: () => void;\n}\n\n// ========== Component ==========\n\nexport const PetSelector: React.FC<PetSelectorProps> = ({\n    isOpen,\n    onClose,\n    pets,\n    userXP = 0,\n    userStreak = 0,\n    onUnlock,\n    onSetActive,\n    recentlyUnlockedPet,\n    onUnlockModalClose,\n}) => {\n    const [isVisible, setIsVisible] = useState(false);\n    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);\n    const [isModelLoading, setIsModelLoading] = useState(false);\n\n    // Handle modal visibility animation\n    useEffect(() => {\n        if (isOpen) {\n            // Small delay for slide-up animation\n            requestAnimationFrame(() => {\n                setIsVisible(true);\n            });\n            HapticService.tap();\n            SoundEffectService.play('click');\n        } else {\n            setIsVisible(false);\n            // Clear selection when modal closes\n            setSelectedPet(null);\n        }\n    }, [isOpen]);\n\n    // Handle close with animation\n    const handleClose = useCallback(() => {\n        setIsVisible(false);\n        HapticService.tap();\n        SoundEffectService.play('click');\n        \n        // Delay actual close for animation\n        setTimeout(() => {\n            onClose();\n        }, 250);\n    }, [onClose]);\n\n    // Handle pet preview selection\n    const handlePreview = useCallback((pet: Pet) => {\n        setSelectedPet(pet);\n        setIsModelLoading(true);\n        HapticService.tap();\n        SoundEffectService.play('click');\n    }, []);\n\n    // Handle pet unlock\n    const handleUnlock = useCallback((petId: string) => {\n        HapticService.success();\n        SoundEffectService.play('click');\n        onUnlock?.(petId);\n    }, [onUnlock]);\n\n    // Handle set as active pet\n    const handleSetActive = useCallback((petId: string) => {\n        HapticService.success();\n        SoundEffectService.play('success');\n        onSetActive?.(petId);\n    }, [onSetActive]);\n\n    // Handle set active from preview panel\n    const handleSetActiveFromPreview = useCallback(() => {\n        if (selectedPet?.is_unlocked) {\n            handleSetActive(selectedPet.pet_id);\n        }\n    }, [selectedPet, handleSetActive]);\n\n    // Handle model load complete\n    const handleModelLoad = useCallback(() => {\n        setIsModelLoading(false);\n    }, []);\n\n    // Handle unlock modal close\n    const handleUnlockModalClose = useCallback(() => {\n        onUnlockModalClose?.();\n    }, [onUnlockModalClose]);\n\n    // Handle set active from unlock modal\n    const handleSetActiveFromUnlockModal = useCallback((petId: string) => {\n        handleSetActive(petId);\n        onUnlockModalClose?.();\n    }, [handleSetActive, onUnlockModalClose]);\n\n    // Don't render if not open\n    if (!isOpen) return null;\n\n    // Get selected pet's rarity config for styling\n    const selectedRarityConfig = selectedPet ? rarityConfig[selectedPet.rarity] : null;\n\n    return (\n        <>\n            {/* Backdrop */}\n            <div\n                className=\"fixed inset-0 z-50\"\n                style={{\n                    backgroundColor: `rgba(0, 0, 0, ${isVisible ? 0.6 : 0})`,\n                    backdropFilter: isVisible ? 'blur(8px)' : 'none',\n                    transition: 'all 0.3s ease-out',\n                }}\n                onClick={handleClose}\n            />\n\n            {/* Modal Container */}\n            <div\n                className=\"fixed inset-x-0 bottom-0 z-50 flex justify-center items-end pointer-events-none\"\n                style={{ padding: '16px' }}\n            >\n                <div\n                    className=\"pointer-events-auto w-full max-w-4xl\"\n                    style={{\n                        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',\n                        opacity: isVisible ? 1 : 0,\n                        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',\n                    }}\n                    onClick={(e) => e.stopPropagation()}\n                >\n                    {/* Modal Content */}\n                    <div\n                        className=\"rounded-3xl overflow-hidden\"\n                        style={{\n                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95))',\n                            border: '4px solid #fff',\n                            boxShadow: '0 -8px 40px rgba(139, 92, 246, 0.3), 0 4px 20px rgba(0, 0, 0, 0.15)',\n                            maxHeight: '85vh',\n                            display: 'flex',\n                            flexDirection: 'column',\n                        }}\n                    >\n                        {/* Header */}\n                        <div\n                            className=\"flex items-center justify-between px-6 py-4\"\n                            style={{\n                                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',\n                                borderBottom: '3px solid rgba(255, 255, 255, 0.3)',\n                            }}\n                        >\n                            <h2 className=\"text-2xl md:text-3xl font-bold text-white drop-shadow-lg\">\n                                Choose Your Companion\n                            </h2>\n                            <button\n                                onClick={handleClose}\n                                className=\"w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 hover:scale-110\"\n                                style={{\n                                    border: '2px solid rgba(255, 255, 255, 0.5)',\n                                }}\n                            >\n                                <span className=\"text-white text-2xl font-bold leading-none\">×</span>\n                            </button>\n                        </div>\n\n                        {/* Scrollable Content */}\n                        <div\n                            className=\"flex-1 overflow-y-auto\"\n                            style={{\n                                maxHeight: 'calc(85vh - 80px)',\n                                padding: '20px',\n                            }}\n                        >\n                            {/* Pet Grid with built-in filters */}\n                            <PetGrid\n                                pets={pets}\n                                selectedPetId={selectedPet?.pet_id}\n                                userXP={userXP}\n                                userStreak={userStreak}\n                                onPreview={handlePreview}\n                                onSelect={handleSetActive}\n                                onUnlock={handleUnlock}\n                                showFilters={true}\n                                compact={false}\n                            />\n\n                            {/* 3D Preview Panel - shown when a pet is selected */}\n                            {selectedPet && (\n                                <div\n                                    className=\"mt-6 rounded-2xl overflow-hidden\"\n                                    style={{\n                                        background: selectedRarityConfig\n                                            ? `linear-gradient(145deg, ${selectedRarityConfig.gradient[0]}15, ${selectedRarityConfig.gradient[1]}15)`\n                                            : 'linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',\n                                        border: `3px solid ${selectedRarityConfig?.gradient[0] || '#8B5CF6'}40`,\n                                        boxShadow: `0 4px 20px ${selectedRarityConfig?.gradient[0] || '#8B5CF6'}20`,\n                                    }}\n                                >\n                                    {/* Preview Header */}\n                                    <div\n                                        className=\"flex items-center justify-between px-5 py-3\"\n                                        style={{\n                                            background: selectedRarityConfig\n                                                ? `linear-gradient(135deg, ${selectedRarityConfig.gradient[0]}, ${selectedRarityConfig.gradient[1]})`\n                                                : 'linear-gradient(135deg, #8B5CF6, #EC4899)',\n                                            borderBottom: '2px solid rgba(255, 255, 255, 0.3)',\n                                        }}\n                                    >\n                                        <div className=\"flex items-center gap-3\">\n                                            <span className=\"text-2xl\">{selectedPet.emoji}</span>\n                                            <div>\n                                                <h3 className=\"text-xl font-bold text-white drop-shadow\">\n                                                    {selectedPet.name}\n                                                </h3>\n                                                <div className=\"flex items-center gap-2\">\n                                                    <span\n                                                        className=\"text-xs font-semibold px-2 py-0.5 rounded-full\"\n                                                        style={{\n                                                            background: 'rgba(255, 255, 255, 0.25)',\n                                                            color: 'white',\n                                                        }}\n                                                    >\n                                                        {selectedRarityConfig?.label || selectedPet.rarity}\n                                                    </span>\n                                                    {selectedPet.is_unlocked && (\n                                                        <span className=\"text-xs text-white/80\">Unlocked</span>\n                                                    )}\n                                                </div>\n                                            </div>\n                                        </div>\n\n                                        {/* Set as Active Button */}\n                                        {selectedPet.is_unlocked && (\n                                            <button\n                                                onClick={handleSetActiveFromPreview}\n                                                className=\"px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95\"\n                                                style={{\n                                                    background: 'linear-gradient(135deg, #10B981, #059669)',\n                                                    color: 'white',\n                                                    border: '2px solid rgba(255, 255, 255, 0.4)',\n                                                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',\n                                                }}\n                                            >\n                                                Set as Active\n                                            </button>\n                                        )}\n                                    </div>\n\n                                    {/* 3D Viewer */}\n                                    <div className=\"relative\" style={{ height: '280px' }}>\n                                        <PetViewer3D\n                                            pet={selectedPet}\n                                            height=\"100%\"\n                                            enableControls={true}\n                                            autoRotate={true}\n                                            autoRotateSpeed={1.5}\n                                            showLoading={true}\n                                            onLoad={handleModelLoad}\n                                            background=\"transparent\"\n                                        />\n\n                                        {/* Loading overlay */}\n                                        {isModelLoading && (\n                                            <div\n                                                className=\"absolute inset-0 flex items-center justify-center\"\n                                                style={{\n                                                    background: 'rgba(255, 255, 255, 0.7)',\n                                                    backdropFilter: 'blur(4px)',\n                                                }}\n                                            >\n                                                <div className=\"text-center\">\n                                                    <div\n                                                        className=\"w-12 h-12 rounded-full border-4 border-t-purple-500 border-r-pink-500 border-b-amber-500 border-l-transparent animate-spin mx-auto mb-2\"\n                                                    />\n                                                    <p className=\"text-gray-600 font-medium\">Loading 3D Model...</p>\n                                                </div>\n                                            </div>\n                                        )}\n                                    </div>\n\n                                    {/* Pet Description */}\n                                    <div className=\"px-5 py-4\" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>\n                                        <p className=\"text-gray-700 text-sm leading-relaxed\">\n                                            {selectedPet.description || `Meet ${selectedPet.name}, your adorable ${selectedPet.rarity} companion!`}\n                                        </p>\n                                        \n                                        {/* Personality traits if available */}\n                                        {selectedPet.personality_traits && selectedPet.personality_traits.length > 0 && (\n                                            <div className=\"flex flex-wrap gap-2 mt-3\">\n                                                {selectedPet.personality_traits.map((trait, index) => (\n                                                    <span\n                                                        key={index}\n                                                        className=\"px-3 py-1 rounded-full text-xs font-medium\"\n                                                        style={{\n                                                            background: `${selectedRarityConfig?.gradient[0] || '#8B5CF6'}20`,\n                                                            color: selectedRarityConfig?.gradient[0] || '#8B5CF6',\n                                                            border: `1px solid ${selectedRarityConfig?.gradient[0] || '#8B5CF6'}40`,\n                                                        }}\n                                                    >\n                                                        {trait}\n                                                    </span>\n                                                ))}\n                                            </div>\n                                        )}\n                                    </div>\n                                </div>\n                            )}\n\n                            {/* Empty state when no pet selected */}\n                            {!selectedPet && pets.length > 0 && (\n                                <div\n                                    className=\"mt-6 rounded-2xl p-8 text-center\"\n                                    style={{\n                                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.05), rgba(236, 72, 153, 0.05))',\n                                        border: '2px dashed rgba(139, 92, 246, 0.3)',\n                                    }}\n                                >\n                                    <span className=\"text-5xl mb-3 block animate-bounce\">\n                                        👆\n                                    </span>\n                                    <p className=\"text-gray-500 font-medium\">\n                                        Tap on a pet to preview in 3D!\n                                    </p>\n                                </div>\n                            )}\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            {/* Pet Unlock Celebration Modal */}\n            {recentlyUnlockedPet && (\n                <PetUnlockModal\n                    pet={recentlyUnlockedPet}\n                    isOpen={true}\n                    onClose={handleUnlockModalClose}\n                    onSetActive={handleSetActiveFromUnlockModal}\n                />\n            )}\n\n            {/* Keyframes for animations */}\n            <style>{`\n                @keyframes bounce {\n                    0%, 100% {\n                        transform: translateY(0);\n                    }\n                    50% {\n                        transform: translateY(-10px);\n                    }\n                }\n                \n                .animate-bounce {\n                    animation: bounce 1.5s ease-in-out infinite;\n                }\n                \n                @keyframes spin {\n                    from {\n                        transform: rotate(0deg);\n                    }\n                    to {\n                        transform: rotate(360deg);\n                    }\n                }\n                \n                .animate-spin {\n                    animation: spin 1s linear infinite;\n                }\n            `}</style>\n        </>\n    );\n};\n\nexport default PetSelector;\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 34.3s)

# Continuation Summary: AR Flashcard App - Pet UI Components Implementation

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models with:
- Pet selection UI components
- Progression-based unlocking
- 3D model rendering with React Three Fiber
- Gamification integration

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Existing Component Patterns (from PetUnlockModal, PetGrid, PetViewer3D):**
   - Uses inline styles with gradients + Tailwind classes
   - Kid-friendly animations via `<style>` tags with `@keyframes`
   - `HapticService.tap()` / `HapticService.success()` and `SoundEffectService.play('click')` for feedback
   - Rounded corners (rounded-3xl), glassmorphism backgrounds (rgba + backdrop-filter)
   - White borders (4px solid #fff), glowing shadows

3. **Service Imports:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   ```

4. **Component APIs (confirmed from reading files):**

   **PetGrid Props:**
   ```typescript
   interface PetGridProps {
       pets: Pet[];
       selectedPetId?: string;
       userXP?: number;
       userStreak?: number;
       onPreview?: (pet: Pet) => void;
       onSelect?: (petId: string) => void;
       onUnlock?: (petId: string) => void;
       compact?: boolean;
       showFilters?: boolean;  // default true - has built-in filter tabs
       className?: string;
   }
   ```

   **PetViewer3D Props (full version):**
   ```typescript
   interface PetViewer3DProps {
       pet: Pet;
       height?: string | number;
       enableControls?: boolean;
       autoRotate?: boolean;
       autoRotateSpeed?: number;
       showLoading?: boolean;
       onLoad?: () => void;
       onError?: (error: Error) => void;
       background?: 'transparent' | 'gradient' | 'solid';
       backgroundColor?: string;
       disableFloat?: boolean;
       scale?: number;
   }
   ```

   **PetUnlockModal Props:**
   ```typescript
   interface PetUnlockModalProps {
       pet: Pet;
       isOpen: boolean;
       onClose: () => void;
       onSetActive?: (petId: string) => void;
       autoDismissMs?: number;
   }
   ```

   **PetSelector Props (just created):**
   ```typescript
   interface PetSelectorProps {
       isOpen: boolean;
       onClose: () => void;
       pets: Pet[];
       userXP?: number;
       userStreak?: number;
       onUnlock?: (petId: string) => void;
       onSetActive?: (petId: string) => void;
       recentlyUnlockedPet?: Pet | null;
       onUnlockModalClose?: () => void;
   }
   ```

## Accomplished

### ✅ Phase 1: Backend API Complete
- `backend/models/pet.py` - Pet Document + all schemas
- `backend/models/user_mongo.py` - Added pet fields
- `backend/api/pets.py` - Full Pet API router

### ✅ Phase 2: Frontend Hook Complete
- `frontend-web/src/hooks/usePets.ts` - Full pet management hook

### ✅ Phase 3: Pet UI Components Complete

| Component | Status | Description |
|-----------|--------|-------------|
| `PetCard.tsx` | ✅ **DONE** | Exports `PetCard`, `PetCardProps`, `rarityConfig` |
| `PetViewer3D.tsx` | ✅ **DONE** | Exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel` |
| `PetGrid.tsx` | ✅ **DONE** | Built-in filter tabs, responsive grid, empty states |
| `PetUnlockModal.tsx` | ✅ **DONE** | Celebration modal with confetti, 3D preview |
| `PetSelector.tsx` | ✅ **DONE** | Main modal with 3D preview + pet grid + unlock modal overlay |
| `index.ts` | 📋 **CREATE NOW** | Barrel export file |

## Next Action

**Create `index.ts`** - barrel export file for all pet components:

```typescript
// Export all pet components and types
export { PetCard, rarityConfig } from './PetCard';
export type { PetCardProps } from './PetCard';

export { PetViewer3D, PetViewer3DCompact, preloadPetModel } from './PetViewer3D';
export type { PetViewer3DProps } from './PetViewer3D';

export { PetGrid } from './PetGrid';
export type { PetGridProps } from './PetGrid';

export { PetUnlockModal } from './PetUnlockModal';
export type { PetUnlockModalProps } from './PetUnlockModal';

export { PetSelector } from './PetSelector';
export type { PetSelectorProps } from './PetSelector';
```

After creating `index.ts`, Phase 3 (Pet UI Components) is **COMPLETE**.

Then proceed to **Phase 4: Integration** (per spec):
- Add pet display to main app header/dashboard
- Integrate with gamification system (XP triggers unlock checks)
- Add pet selector button to UI

## Relevant Files / Directories

### Spec & Config (READ THESE)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Reference Files
```
frontend-web/src/
├── hooks/usePets.ts                              # Pet interface & hook API
├── services/HapticService.ts                     # Haptic feedback service
├── services/SoundEffectService.ts                # Sound effects service
```

### Frontend - Pet Components (Working Directory)
```
frontend-web/src/components/pets/
├── PetCard.tsx                                   # ✅ DONE - exports rarityConfig, PetCard, PetCardProps
├── PetViewer3D.tsx                               # ✅ DONE - exports PetViewer3D, PetViewer3DCompact, preloadPetModel
├── PetGrid.tsx                                   # ✅ DONE - filter tabs, responsive grid, empty states
├── PetUnlockModal.tsx                            # ✅ DONE - celebration modal with confetti, 3D preview
├── PetSelector.tsx                               # ✅ DONE - main modal combining all components
└── index.ts                                      # 📋 CREATE NOW - barrel exports
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 5.9s)

I'll continue with the next step - creating the `index.ts` barrel export file to complete Phase 3.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets</path>
<type>directory</type>
<entries>
PetCard.tsx
PetGrid.tsx
PetSelector.tsx
PetUnlockModal.tsx
PetViewer3D.tsx

(5 entries)
</entries>
```

---

## Assistant (Build · claude-opus-4.5 · 8.8s)

Good, all 5 components are in place. Let me create the barrel export file:

**Tool: write**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\index.ts",
  "content": "/**\n * Pet Components - Barrel Export\n * \n * This module exports all pet-related UI components for the AR Flashcard App.\n * Components follow kid-friendly design patterns with haptic feedback,\n * sound effects, and engaging animations.\n */\n\n// PetCard - Individual pet display card with rarity styling\nexport { PetCard, rarityConfig } from './PetCard';\nexport type { PetCardProps } from './PetCard';\n\n// PetViewer3D - 3D model viewer using React Three Fiber\nexport { PetViewer3D, PetViewer3DCompact, preloadPetModel } from './PetViewer3D';\nexport type { PetViewer3DProps } from './PetViewer3D';\n\n// PetGrid - Responsive grid with filtering and selection\nexport { PetGrid } from './PetGrid';\nexport type { PetGridProps } from './PetGrid';\n\n// PetUnlockModal - Celebration modal for newly unlocked pets\nexport { PetUnlockModal } from './PetUnlockModal';\nexport type { PetUnlockModalProps } from './PetUnlockModal';\n\n// PetSelector - Main modal combining grid, preview, and unlock flow\nexport { PetSelector } from './PetSelector';\nexport type { PetSelectorProps } from './PetSelector';\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 17.8s)

Now let me verify the exports compile correctly by checking if there are any TypeScript errors:

**Tool: bash**

**Input:**
```json
{
  "command": "cd \"E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\" && npx tsc --noEmit src/components/pets/index.ts 2>&1 | head -30",
  "description": "Type-check the barrel export file"
}
```

**Output:**
```
src/components/pets/index.ts(10,39): error TS6142: Module './PetCard' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetCard.tsx', but '--jsx' is not set.
src/components/pets/index.ts(11,35): error TS6142: Module './PetCard' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetCard.tsx', but '--jsx' is not set.
src/components/pets/index.ts(14,66): error TS6142: Module './PetViewer3D' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetViewer3D.tsx', but '--jsx' is not set.
src/components/pets/index.ts(15,39): error TS6142: Module './PetViewer3D' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetViewer3D.tsx', but '--jsx' is not set.
src/components/pets/index.ts(18,25): error TS6142: Module './PetGrid' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetGrid.tsx', but '--jsx' is not set.
src/components/pets/index.ts(19,35): error TS6142: Module './PetGrid' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetGrid.tsx', but '--jsx' is not set.
src/components/pets/index.ts(22,32): error TS6142: Module './PetUnlockModal' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetUnlockModal.tsx', but '--jsx' is not set.
src/components/pets/index.ts(23,42): error TS6142: Module './PetUnlockModal' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetUnlockModal.tsx', but '--jsx' is not set.
src/components/pets/index.ts(26,29): error TS6142: Module './PetSelector' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetSelector.tsx', but '--jsx' is not set.
src/components/pets/index.ts(27,39): error TS6142: Module './PetSelector' was resolved to 'E:/Daniel Project/Graduted Project/Edu-platform/frontend-web/src/components/pets/PetSelector.tsx', but '--jsx' is not set.

```

---

## Assistant (Build · claude-opus-4.5 · 8.2s)

These errors are just from running `tsc` directly without the project config. Let me run it properly with the tsconfig:

**Tool: bash**

**Input:**
```json
{
  "command": "cd \"E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\" && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E \"pets/\" | head -20",
  "description": "Type-check pet components with full tsconfig"
}
```

---

## Assistant (Build · claude-opus-4.5 · 9.5s)

No errors for pet components. **Phase 3 is complete!**

Now let me update the task list and proceed to **Phase 4: Integration**:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Phase 1: Backend API",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Phase 2: Frontend Hook (usePets.ts)",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Phase 3: Pet UI Components (PetCard, PetViewer3D, PetGrid, PetUnlockModal, PetSelector, index.ts)",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Phase 4: Integration - Add pet display to dashboard/header",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Phase 4: Integration - Add PetSelector button to UI",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 4: Integration - Connect with gamification (XP triggers unlock checks)",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Phase 1: Backend API",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 2: Frontend Hook (usePets.ts)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 3: Pet UI Components (PetCard, PetViewer3D, PetGrid, PetUnlockModal, PetSelector, index.ts)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 4: Integration - Add pet display to dashboard/header",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Phase 4: Integration - Add PetSelector button to UI",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 4: Integration - Connect with gamification (XP triggers unlock checks)",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 6.0s)

Let me check the implementation guide for Phase 4 specifics and explore the existing dashboard/header components:

**Tool: grep**

**Input:**
```json
{
  "pattern": "Phase 4|Integration|dashboard|header",
  "path": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs",
  "include": "*.md"
}
```

**Output:**
```
Found 16 matches
E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md:
  Line 13: 3. **AR Integration**: Render selected pet as 3D companion during AR lessons
  Line 315:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  Line 324:       headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
  Line 335:       headers: {
  Line 502:       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  Line 579: ## 🔗 Integration Points
  Line 581: ### 1. Dashboard Integration
  Line 583: Add pet selector button to dashboard:
  Line 594:       {/* ... existing dashboard */}
  Line 612: ### 2. AR Viewer Integration
  Line 684: ### Phase 3: AR Integration
  Line 691: ### Phase 4: Gamification

E:\Daniel Project\Graduted Project\Edu-platform\docs\FRONTEND_API_DOCUMENTATION.md:
  Line 17: 4. [AR Object Integration](#ar-object-integration)
  Line 230: ## 🎯 AR Object Integration
  Line 253: ### MindAR A-Frame Integration

E:\Daniel Project\Graduted Project\Edu-platform\docs\PLAN_ASSET_MIGRATION.md:
  Line 74: ### Phase 4: Pet System Design
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend-web/src/**/*{Dashboard,Header,Layout,Nav}*.tsx"
}
```

**Output:**
```
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\pages\ProgressDashboard.tsx
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Navbar.tsx
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Layout.tsx
```

---

## Assistant (Build · claude-opus-4.5 · 5.9s)

Let me read the integration section from the guide and check the existing Layout/Navbar components:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 575,
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>575: ```
576: 
577: ---
578: 
579: ## 🔗 Integration Points
580: 
581: ### 1. Dashboard Integration
582: 
583: Add pet selector button to dashboard:
584: 
585: ```tsx
586: // pages/Dashboard.tsx
587: import PetSelector from '@/components/PetSelector';
588: 
589: export default function Dashboard() {
590:   const [showPetSelector, setShowPetSelector] = useState(false);
591:   
592:   return (
593:     <div>
594:       {/* ... existing dashboard */}
595:       
596:       <button 
597:         className="btn btn-circle btn-lg fixed bottom-4 right-4"
598:         onClick={() => setShowPetSelector(true)}
599:       >
600:         🐾
601:       </button>
602:       
603:       <PetSelector 
604:         isOpen={showPetSelector}
605:         onClose={() => setShowPetSelector(false)}
606:       />
607:     </div>
608:   );
609: }
610: ```
611: 
612: ### 2. AR Viewer Integration
613: 
614: Add pet to AR scenes:
615: 
616: ```tsx
617: // pages/LearnAR.tsx
618: import ARPetCompanion from '@/components/ARPetCompanion';
619: 
620: export default function LearnAR() {
621:   const { user } = useAuth();
622:   
623:   return (
624:     <a-scene>
625:       {/* ... existing AR content */}
626:       
627:       {user.active_pet && (
628:         <ARPetCompanion petId={user.active_pet} />
629:       )}
630:     </a-scene>
631:   );
632: }
633: ```
634: 
635: ### 3. XP/Progress Hook
636: 
637: Trigger unlock checks on XP gain:
638: 
639: ```tsx
640: // hooks/useGamification.ts
641: export function useGamification() {
642:   const checkPetUnlocks = async (newXP: number) => {
643:     const response = await fetch('/api/v1/pets');
644:     const { pets } = await response.json();
645:     
646:     const newlyUnlockable = pets.filter(pet => 
647:       !pet.is_unlocked && 
648:       pet.can_unlock &&
649:       pet.unlock_condition.type === 'xp' &&
650:       pet.unlock_condition.value <= newXP
651:     );
652:     
653:     if (newlyUnlockable.length > 0) {
654:       showPetUnlockNotification(newlyUnlockable[0]);
655:     }
656:   };
657:   
658:   return { checkPetUnlocks };
659: }
660: ```
661: 
662: ---
663: 
664: ## ✅ Implementation Checklist
665: 
666: ### Phase 1: Database & Backend
667: - [ ] Create pets collection indexes
668: - [ ] Add `active_pet` and `unlocked_pets` to Users schema
669: - [ ] Implement `GET /api/v1/pets` endpoint
670: - [ ] Implement `POST /api/v1/pets/{id}/unlock` endpoint
671: - [ ] Implement `PUT /api/v1/users/active-pet` endpoint
672: - [ ] Add unlock condition validation logic
673: - [ ] Test all endpoints with Postman
674: 

(File has more lines. Use 'offset' parameter to read beyond line 674)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Navbar.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Navbar.tsx</path>
<type>file</type>
<content>1: // components/Navbar.tsx
2: /**
3:  * Kid-Friendly E-Learning Navbar
4:  * - White background with soft shadow
5:  * - Colorful icons with active states
6:  * - XP progress indicator
7:  * - Prominent AR Mode button
8:  */
9: import React, { useState } from 'react';
10: import { Link, useLocation } from "react-router-dom";
11: 
12: // Icon components for cleaner code
13: const HomeIcon = ({ active }: { active: boolean }) => (
14:   <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
15:     <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
16:   </svg>
17: );
18: 
19: const BookIcon = ({ active }: { active: boolean }) => (
20:   <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
21:     <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
22:   </svg>
23: );
24: 
25: const CameraIcon = () => (
26:   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
27:     <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
28:   </svg>
29: );
30: 
31: const UserIcon = ({ active }: { active: boolean }) => (
32:   <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
33:     <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
34:   </svg>
35: );
36: 
37: interface NavItemProps {
38:   to: string;
39:   icon: React.ReactNode;
40:   label: string;
41:   isActive: boolean;
42:   onClick?: () => void;
43: }
44: 
45: const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive, onClick }) => (
46:   <Link
47:     to={to}
48:     onClick={onClick}
49:     className={`
50:       flex flex-col items-center justify-center px-4 py-2 rounded-xl
51:       transition-all duration-200 min-w-[80px]
52:       ${isActive
53:         ? 'bg-amber-50 text-amber-600'
54:         : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
55:       }
56:     `}
57:   >
58:     {icon}
59:     <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-amber-600' : ''}`}>
60:       {label}
61:     </span>
62:   </Link>
63: );
64: 
65: const Navbar: React.FC = () => {
66:   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
67:   const location = useLocation();
68: 
69:   // Mock user data - will be replaced with real data from API
70:   const userXP = 450;
71:   const maxXP = 500;
72:   const xpProgress = (userXP / maxXP) * 100;
73: 
74:   const isActive = (path: string) => location.pathname === path;
75: 
76:   return (
77:     <>
78:       {/* Main Navbar - Kid Friendly Style */}
79:       <nav className="h-16 bg-white text-gray-800 flex items-center px-4 shadow-md flex-shrink-0 relative z-50 border-b border-gray-100">
80:         <div className="w-full max-w-7xl mx-auto">
81:           <div className="flex justify-between items-center h-16">
82: 
83:             {/* Logo/Brand */}
84:             <Link to="/" className="flex items-center gap-2 flex-shrink-0">
85:               <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
86:                 <span className="text-white text-xl">🐰</span>
87:               </div>
88:               <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent hidden sm:block">
89:                 EduPlatform
90:               </span>
91:             </Link>
92: 
93:             {/* Desktop Navigation */}
94:             <div className="hidden md:flex items-center gap-1">
95:               <NavItem
96:                 to="/courses"
97:                 icon={<HomeIcon active={isActive('/courses')} />}
98:                 label="Học tập"
99:                 isActive={isActive('/courses')}
100:               />
101:               <NavItem
102:                 to="/flashcards"
103:                 icon={<BookIcon active={isActive('/flashcards')} />}
104:                 label="Flashcards"
105:                 isActive={isActive('/flashcards')}
106:               />
107: 
108:               {/* AR Mode - Prominent Button */}
109:               <Link
110:                 to="/learn-ar"
111:                 className={`
112:                   flex items-center gap-2 px-5 py-2.5 mx-2 rounded-full
113:                   bg-gradient-to-r from-cyan-400 to-sky-500
114:                   text-white font-bold shadow-lg shadow-cyan-500/30
115:                   hover:shadow-xl hover:scale-105 transition-all duration-200
116:                   ${isActive('/learn-ar') ? 'ring-2 ring-cyan-300 ring-offset-2' : ''}
117:                 `}
118:               >
119:                 <CameraIcon />
120:                 <span>AR Mode</span>
121:               </Link>
122: 
123:               <NavItem
124:                 to="/profile"
125:                 icon={<UserIcon active={isActive('/profile')} />}
126:                 label="Hồ sơ"
127:                 isActive={isActive('/profile')}
128:               />
129:             </div>
130: 
131:             {/* XP Progress (Desktop) */}
132:             <div className="hidden lg:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full">
133:               <div className="text-amber-500 font-bold text-sm">⚡ {userXP} XP</div>
134:               <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
135:                 <div
136:                   className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
137:                   style={{ width: `${xpProgress}%` }}
138:                 />
139:               </div>
140:             </div>
141: 
142:             {/* Mobile menu button */}
143:             <button
144:               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
145:               className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
146:               aria-label="Toggle menu"
147:             >
148:               <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
149:                 {isMobileMenuOpen ? (
150:                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
151:                 ) : (
152:                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
153:                 )}
154:               </svg>
155:             </button>
156:           </div>
157:         </div>
158:       </nav>
159: 
160:       {/* Mobile Navigation Menu */}
161:       {isMobileMenuOpen && (
162:         <div className="md:hidden bg-white border-b border-gray-200 shadow-lg z-40 animate-slideDown">
163:           {/* XP Progress (Mobile) */}
164:           <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
165:             <div className="flex items-center gap-3">
166:               <span className="text-amber-600 font-bold">⚡ {userXP} XP</span>
167:               <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
168:                 <div
169:                   className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
170:                   style={{ width: `${xpProgress}%` }}
171:                 />
172:               </div>
173:             </div>
174:           </div>
175: 
176:           <div className="p-2 space-y-1">
177:             <MobileNavItem
178:               to="/courses"
179:               icon="🏠"
180:               label="Học tập"
181:               isActive={isActive('/courses')}
182:               onClick={() => setIsMobileMenuOpen(false)}
183:             />
184:             <MobileNavItem
185:               to="/flashcards"
186:               icon="📚"
187:               label="Flashcards"
188:               isActive={isActive('/flashcards')}
189:               onClick={() => setIsMobileMenuOpen(false)}
190:             />
191:             <MobileNavItem
192:               to="/learn-ar"
193:               icon="📷"
194:               label="AR Mode"
195:               isActive={isActive('/learn-ar')}
196:               onClick={() => setIsMobileMenuOpen(false)}
197:               highlight
198:             />
199:             <MobileNavItem
200:               to="/profile"
201:               icon="👤"
202:               label="Hồ sơ"
203:               isActive={isActive('/profile')}
204:               onClick={() => setIsMobileMenuOpen(false)}
205:             />
206:           </div>
207:         </div>
208:       )}
209:     </>
210:   );
211: };
212: 
213: // Mobile nav item component
214: const MobileNavItem: React.FC<{
215:   to: string;
216:   icon: string;
217:   label: string;
218:   isActive: boolean;
219:   onClick: () => void;
220:   highlight?: boolean;
221: }> = ({ to, icon, label, isActive, onClick, highlight }) => (
222:   <Link
223:     to={to}
224:     onClick={onClick}
225:     className={`
226:       flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
227:       ${highlight
228:         ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white'
229:         : isActive
230:           ? 'bg-amber-50 text-amber-600'
231:           : 'text-gray-600 hover:bg-gray-50'
232:       }
233:     `}
234:   >
235:     <span className="text-xl">{icon}</span>
236:     <span>{label}</span>
237:   </Link>
238: );
239: 
240: export default Navbar;
241: 
242: 

(End of file - total 242 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Layout.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Layout.tsx</path>
<type>file</type>
<content>1: import React from 'react';
2: import { Sidebar } from './Sidebar';
3: 
4: interface LayoutProps {
5:     children: React.ReactNode;
6: }
7: 
8: export const Layout: React.FC<LayoutProps> = ({ children }) => {
9:     return (
10:         <div className="min-h-screen bg-neutral-50 flex">
11:             <Sidebar />
12:             <main className="flex-1 md:ml-64 pb-20 md:pb-0">
13:                 {children}
14:             </main>
15:         </div>
16:     );
17: };
18: 

(End of file - total 18 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.8s)

I see there's a `Layout.tsx` with a `Sidebar`. Let me also check the ProgressDashboard and look for any existing pages where I should integrate the pet feature:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Sidebar.tsx</path>
<type>file</type>
<content>1: import { Link, useLocation } from 'react-router-dom';
2: 
3: // SVG Icons as components
4: const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
5:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
6:         <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
7:         <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
8:         <path d="M8 7h8" />
9:         <path d="M8 11h6" />
10:     </svg>
11: );
12: 
13: const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
14:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
15:         <path d="M12 2L2 7l10 5 10-5-10-5z" />
16:         <path d="M2 17l10 5 10-5" />
17:         <path d="M2 12l10 5 10-5" />
18:     </svg>
19: );
20: 
21: const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
22:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
23:         <circle cx="12" cy="8" r="5" />
24:         <path d="M20 21a8 8 0 1 0-16 0" />
25:     </svg>
26: );
27: 
28: const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
29:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
30:         <rect x="3" y="5" width="18" height="14" rx="2" />
31:         <path d="M3 10h18" />
32:         <path d="M7 15h4" />
33:     </svg>
34: );
35: 
36: const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
37:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
38:         <path d="M22 10l-10-5L2 10l10 5 10-5z" />
39:         <path d="M6 12v5c3 3 9 3 12 0v-5" />
40:         <path d="M22 10v6" />
41:     </svg>
42: );
43: 
44: const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
45:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
46:         <circle cx="12" cy="12" r="3" />
47:         <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
48:     </svg>
49: );
50: 
51: // Icon mapping for nav items
52: const iconComponents: Record<string, React.FC<{ className?: string }>> = {
53:     'learn': BookIcon,
54:     'ar': CubeARIcon,
55:     'profile': UserIcon,
56:     'flashcards': FlashcardIcon,
57:     'settings': SettingsIcon,
58: };
59: 
60: export const Sidebar: React.FC = () => {
61:     const location = useLocation();
62: 
63:     const navItems = [
64:         { path: '/courses', label: 'Learn', iconKey: 'learn' },
65:         { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
66:         { path: '/profile', label: 'Profile', iconKey: 'profile' },
67:         { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
68:     ];
69: 
70:     return (
71:         <>
72:             {/* Desktop Sidebar (Left) */}
73:             <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
74:                 <div className="p-8 flex items-center gap-3">
75:                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
76:                         <GraduationCapIcon className="w-7 h-7" />
77:                     </div>
78:                     <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
79:                 </div>
80: 
81:                 <nav className="flex-1 px-4 space-y-2">
82:                     {navItems.map((item) => {
83:                         const IconComponent = iconComponents[item.iconKey];
84:                         return (
85:                             <Link
86:                                 key={item.path}
87:                                 to={item.path}
88:                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
89:                                     ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
90:                                     : 'text-neutral-500 hover:bg-neutral-100'
91:                                     }`}
92:                             >
93:                                 <IconComponent className="w-6 h-6" />
94:                                 <span>{item.label}</span>
95:                             </Link>
96:                         );
97:                     })}
98:                 </nav>
99: 
100:                 <div className="p-4 border-t-2 border-neutral-200">
101:                     <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
102:                         <SettingsIcon className="w-6 h-6" />
103:                         <span>Settings</span>
104:                     </button>
105:                 </div>
106:             </aside>
107: 
108:             {/* Mobile Bottom Navigation */}
109:             <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
110:                 <div className="flex justify-around items-center h-16">
111:                     {navItems.map((item) => {
112:                         const IconComponent = iconComponents[item.iconKey];
113:                         return (
114:                             <Link
115:                                 key={item.path}
116:                                 to={item.path}
117:                                 className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
118:                                     ? 'text-primary'
119:                                     : 'text-neutral-400'
120:                                     }`}
121:                             >
122:                                 <IconComponent className="w-6 h-6 mb-1" />
123:                             </Link>
124:                         );
125:                     })}
126:                 </div>
127:             </nav>
128:         </>
129:     );
130: };
131: 

(End of file - total 131 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\pages\\ProgressDashboard.tsx",
  "limit": 80
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\pages\ProgressDashboard.tsx</path>
<type>file</type>
<content>1: // src/pages/ProgressDashboard.tsx
2: // Enhanced progress dashboard for parents with weekly charts and detailed analytics
3: // Parent-friendly design with clear data visualization
4: 
5: import React, { useState } from 'react';
6: import { useProgressReport } from '../hooks/useProgressReport';
7: import { ProgressChart } from '../components/Gamification/ProgressChart';
8: import { WeeklyReport } from '../components/Gamification/WeeklyReport';
9: 
10: type ViewMode = 'overview' | 'detailed';
11: 
12: export const ProgressDashboard: React.FC = () => {
13:     const userId = 'demo-user'; // TODO: get from auth context
14:     const [viewMode, setViewMode] = useState<ViewMode>('overview');
15:     
16:     const {
17:         summary,
18:         weeklyReport,
19:         achievements,
20:         isLoading,
21:         weeklyComparison,
22:         refresh
23:     } = useProgressReport(userId);
24: 
25:     // Transform weekly data for chart
26:     const chartData = weeklyReport?.daily_breakdown.map(day => ({
27:         label: day.day,
28:         value: day.words,
29:         secondary: day.time_mins
30:     })) || [];
31: 
32:     if (isLoading) {
33:         return (
34:             <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
35:                 <div className="text-center">
36:                     <div className="text-5xl animate-bounce mb-4">📊</div>
37:                     <p className="text-indigo-600 font-bold">Loading progress...</p>
38:                 </div>
39:             </div>
40:         );
41:     }
42: 
43:     return (
44:         <div
45:             className="min-h-screen pb-20"
46:             style={{
47:                 background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)'
48:             }}
49:         >
50:             {/* Header */}
51:             <div 
52:                 className="px-4 pt-6 pb-4"
53:                 style={{
54:                     background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
55:                 }}
56:             >
57:                 <div className="flex items-center justify-between mb-4">
58:                     <div>
59:                         <h1 className="text-2xl font-black text-white">Progress Report</h1>
60:                         <p className="text-white/80 text-sm">Track learning journey</p>
61:                     </div>
62:                     <button
63:                         onClick={() => refresh()}
64:                         className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
65:                         style={{ minWidth: 44, minHeight: 44 }}
66:                     >
67:                         <span className="text-xl">🔄</span>
68:                     </button>
69:                 </div>
70:                 
71:                 {/* View Toggle */}
72:                 <div className="flex gap-2">
73:                     <button
74:                         onClick={() => setViewMode('overview')}
75:                         className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
76:                             viewMode === 'overview'
77:                                 ? 'bg-white text-indigo-600'
78:                                 : 'bg-white/20 text-white'
79:                         }`}
80:                         style={{ minHeight: 44 }}

(File has more lines. Use 'offset' parameter to read beyond line 80)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 31.0s)

# Continuation Summary: AR Flashcard App - Pet Feature Integration

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models. **Phases 1-3 are COMPLETE**. Now working on **Phase 4: Integration** - adding pet components to the app's UI.

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **App uses `Sidebar.tsx` component** (in Layout.tsx), NOT Navbar.tsx for main navigation
   - Desktop: Left sidebar with nav items (Learn, AR Practice, Profile, Flashcards, Settings)
   - Mobile: Bottom navigation bar
   - This is where pet selector button should be added

3. **Integration Guide specifies (lines 579-660):**
   - Add floating pet selector button (🐾) to dashboard/main UI
   - Connect `PetSelector` modal
   - Hook into gamification to trigger unlock checks on XP gain

4. **Service Imports for haptic/sound:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   ```

5. **All pet components export from `@/components/pets`:**
   ```typescript
   import { PetSelector, PetCard, PetViewer3D, PetGrid, PetUnlockModal } from '@/components/pets';
   ```

## Accomplished

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend API | ✅ COMPLETE | Pet models, schemas, API router |
| Phase 2: Frontend Hook | ✅ COMPLETE | `usePets.ts` hook |
| Phase 3: Pet UI Components | ✅ COMPLETE | All 5 components + barrel export |
| Phase 4: Integration | 🔄 IN PROGRESS | Need to add to Sidebar/Layout |

### Phase 3 Components (All Complete):
- `PetCard.tsx` - exports `PetCard`, `PetCardProps`, `rarityConfig`
- `PetViewer3D.tsx` - exports `PetViewer3D`, `PetViewer3DCompact`, `preloadPetModel`
- `PetGrid.tsx` - built-in filter tabs, responsive grid
- `PetUnlockModal.tsx` - celebration modal with confetti
- `PetSelector.tsx` - main modal combining all components
- `index.ts` - barrel exports (just created)

## Next Steps (Phase 4: Integration)

1. **Add pet display to Sidebar.tsx** - Show active pet avatar or "🐾" button
2. **Create PetSelectorButton component** - Floating action button to open PetSelector
3. **Add to Layout.tsx** - Include PetSelector modal at app level
4. **Connect with gamification** - Trigger unlock checks when XP changes

### Per the spec (lines 583-609):
```tsx
// Add floating button to open pet selector
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
```

## Relevant Files / Directories

### Spec (READ THIS)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - see lines 579-660 for integration
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Pet Components (Phase 3 Complete)
```
frontend-web/src/components/pets/
├── PetCard.tsx                            # ✅ Individual pet cards
├── PetViewer3D.tsx                        # ✅ 3D model viewer
├── PetGrid.tsx                            # ✅ Grid with filters
├── PetUnlockModal.tsx                     # ✅ Celebration modal
├── PetSelector.tsx                        # ✅ Main selector modal
└── index.ts                               # ✅ Barrel exports
```

### Frontend - Integration Targets (MODIFY THESE)
```
frontend-web/src/
├── components/
│   ├── Layout.tsx                         # 📋 Add PetSelector modal here
│   └── Sidebar.tsx                        # 📋 Add pet button/display here
├── hooks/
│   └── usePets.ts                         # Reference for pet hook API
└── services/
    ├── HapticService.ts                   # Haptic feedback
    └── SoundEffectService.ts              # Sound effects
```

### Frontend - Reference Files
```
frontend-web/src/
├── pages/ProgressDashboard.tsx            # Example of existing page patterns
└── components/Navbar.tsx                  # Alternative nav (not currently used in Layout)
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.8s)

Based on the continuation summary, we're on **Phase 4: Integration**. Let me first check the current state of the files we need to modify to understand how to proceed.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Layout.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Layout.tsx</path>
<type>file</type>
<content>1: import React from 'react';
2: import { Sidebar } from './Sidebar';
3: 
4: interface LayoutProps {
5:     children: React.ReactNode;
6: }
7: 
8: export const Layout: React.FC<LayoutProps> = ({ children }) => {
9:     return (
10:         <div className="min-h-screen bg-neutral-50 flex">
11:             <Sidebar />
12:             <main className="flex-1 md:ml-64 pb-20 md:pb-0">
13:                 {children}
14:             </main>
15:         </div>
16:     );
17: };
18: 

(End of file - total 18 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Sidebar.tsx</path>
<type>file</type>
<content>1: import { Link, useLocation } from 'react-router-dom';
2: 
3: // SVG Icons as components
4: const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
5:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
6:         <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
7:         <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
8:         <path d="M8 7h8" />
9:         <path d="M8 11h6" />
10:     </svg>
11: );
12: 
13: const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
14:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
15:         <path d="M12 2L2 7l10 5 10-5-10-5z" />
16:         <path d="M2 17l10 5 10-5" />
17:         <path d="M2 12l10 5 10-5" />
18:     </svg>
19: );
20: 
21: const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
22:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
23:         <circle cx="12" cy="8" r="5" />
24:         <path d="M20 21a8 8 0 1 0-16 0" />
25:     </svg>
26: );
27: 
28: const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
29:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
30:         <rect x="3" y="5" width="18" height="14" rx="2" />
31:         <path d="M3 10h18" />
32:         <path d="M7 15h4" />
33:     </svg>
34: );
35: 
36: const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
37:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
38:         <path d="M22 10l-10-5L2 10l10 5 10-5z" />
39:         <path d="M6 12v5c3 3 9 3 12 0v-5" />
40:         <path d="M22 10v6" />
41:     </svg>
42: );
43: 
44: const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
45:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
46:         <circle cx="12" cy="12" r="3" />
47:         <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
48:     </svg>
49: );
50: 
51: // Icon mapping for nav items
52: const iconComponents: Record<string, React.FC<{ className?: string }>> = {
53:     'learn': BookIcon,
54:     'ar': CubeARIcon,
55:     'profile': UserIcon,
56:     'flashcards': FlashcardIcon,
57:     'settings': SettingsIcon,
58: };
59: 
60: export const Sidebar: React.FC = () => {
61:     const location = useLocation();
62: 
63:     const navItems = [
64:         { path: '/courses', label: 'Learn', iconKey: 'learn' },
65:         { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
66:         { path: '/profile', label: 'Profile', iconKey: 'profile' },
67:         { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
68:     ];
69: 
70:     return (
71:         <>
72:             {/* Desktop Sidebar (Left) */}
73:             <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
74:                 <div className="p-8 flex items-center gap-3">
75:                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
76:                         <GraduationCapIcon className="w-7 h-7" />
77:                     </div>
78:                     <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
79:                 </div>
80: 
81:                 <nav className="flex-1 px-4 space-y-2">
82:                     {navItems.map((item) => {
83:                         const IconComponent = iconComponents[item.iconKey];
84:                         return (
85:                             <Link
86:                                 key={item.path}
87:                                 to={item.path}
88:                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
89:                                     ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
90:                                     : 'text-neutral-500 hover:bg-neutral-100'
91:                                     }`}
92:                             >
93:                                 <IconComponent className="w-6 h-6" />
94:                                 <span>{item.label}</span>
95:                             </Link>
96:                         );
97:                     })}
98:                 </nav>
99: 
100:                 <div className="p-4 border-t-2 border-neutral-200">
101:                     <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
102:                         <SettingsIcon className="w-6 h-6" />
103:                         <span>Settings</span>
104:                     </button>
105:                 </div>
106:             </aside>
107: 
108:             {/* Mobile Bottom Navigation */}
109:             <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
110:                 <div className="flex justify-around items-center h-16">
111:                     {navItems.map((item) => {
112:                         const IconComponent = iconComponents[item.iconKey];
113:                         return (
114:                             <Link
115:                                 key={item.path}
116:                                 to={item.path}
117:                                 className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
118:                                     ? 'text-primary'
119:                                     : 'text-neutral-400'
120:                                     }`}
121:                             >
122:                                 <IconComponent className="w-6 h-6 mb-1" />
123:                             </Link>
124:                         );
125:                     })}
126:                 </div>
127:             </nav>
128:         </>
129:     );
130: };
131: 

(End of file - total 131 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 579,
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>579: ## 🔗 Integration Points
580: 
581: ### 1. Dashboard Integration
582: 
583: Add pet selector button to dashboard:
584: 
585: ```tsx
586: // pages/Dashboard.tsx
587: import PetSelector from '@/components/PetSelector';
588: 
589: export default function Dashboard() {
590:   const [showPetSelector, setShowPetSelector] = useState(false);
591:   
592:   return (
593:     <div>
594:       {/* ... existing dashboard */}
595:       
596:       <button 
597:         className="btn btn-circle btn-lg fixed bottom-4 right-4"
598:         onClick={() => setShowPetSelector(true)}
599:       >
600:         🐾
601:       </button>
602:       
603:       <PetSelector 
604:         isOpen={showPetSelector}
605:         onClose={() => setShowPetSelector(false)}
606:       />
607:     </div>
608:   );
609: }
610: ```
611: 
612: ### 2. AR Viewer Integration
613: 
614: Add pet to AR scenes:
615: 
616: ```tsx
617: // pages/LearnAR.tsx
618: import ARPetCompanion from '@/components/ARPetCompanion';
619: 
620: export default function LearnAR() {
621:   const { user } = useAuth();
622:   
623:   return (
624:     <a-scene>
625:       {/* ... existing AR content */}
626:       
627:       {user.active_pet && (
628:         <ARPetCompanion petId={user.active_pet} />
629:       )}
630:     </a-scene>
631:   );
632: }
633: ```
634: 
635: ### 3. XP/Progress Hook
636: 
637: Trigger unlock checks on XP gain:
638: 
639: ```tsx
640: // hooks/useGamification.ts
641: export function useGamification() {
642:   const checkPetUnlocks = async (newXP: number) => {
643:     const response = await fetch('/api/v1/pets');
644:     const { pets } = await response.json();
645:     
646:     const newlyUnlockable = pets.filter(pet => 
647:       !pet.is_unlocked && 
648:       pet.can_unlock &&
649:       pet.unlock_condition.type === 'xp' &&
650:       pet.unlock_condition.value <= newXP
651:     );
652:     
653:     if (newlyUnlockable.length > 0) {
654:       showPetUnlockNotification(newlyUnlockable[0]);
655:     }
656:   };
657:   
658:   return { checkPetUnlocks };
659: }
660: ```
661: 
662: ---
663: 
664: ## ✅ Implementation Checklist
665: 
666: ### Phase 1: Database & Backend
667: - [ ] Create pets collection indexes
668: - [ ] Add `active_pet` and `unlocked_pets` to Users schema
669: - [ ] Implement `GET /api/v1/pets` endpoint
670: - [ ] Implement `POST /api/v1/pets/{id}/unlock` endpoint
671: - [ ] Implement `PUT /api/v1/users/active-pet` endpoint
672: - [ ] Add unlock condition validation logic
673: - [ ] Test all endpoints with Postman
674: 
675: ### Phase 2: Frontend Components
676: - [ ] Create `PetSelector.tsx` component
677: - [ ] Create `PetCard.tsx` component  
678: - [ ] Create `Pet3DPreview.tsx` component

(File has more lines. Use 'offset' parameter to read beyond line 678)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 7.0s)

Now I have a clear picture. Let me create a todo list and proceed with the integration:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Add PetIcon SVG component to Sidebar.tsx",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Add Pet button to desktop sidebar navigation",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Add Pet button to mobile bottom navigation",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Update Layout.tsx to include PetSelector modal at app level",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Test the integration works correctly",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add PetIcon SVG component to Sidebar.tsx",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Add Pet button to desktop sidebar navigation",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Add Pet button to mobile bottom navigation",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Update Layout.tsx to include PetSelector modal at app level",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Test the integration works correctly",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 12.5s)

Let me start by updating the Sidebar to include a Pet button. I'll add a PetIcon and include it in the navigation:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Add PetIcon SVG component to Sidebar.tsx",
      "priority": "high",
      "status": "in_progress"
    },
    {
      "content": "Add Pet button to desktop sidebar navigation",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Add Pet button to mobile bottom navigation",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Update Layout.tsx to include PetSelector modal at app level",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Test the integration works correctly",
      "priority": "medium",
      "status": "pending"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add PetIcon SVG component to Sidebar.tsx",
    "priority": "high",
    "status": "in_progress"
  },
  {
    "content": "Add Pet button to desktop sidebar navigation",
    "priority": "high",
    "status": "pending"
  },
  {
    "content": "Add Pet button to mobile bottom navigation",
    "priority": "high",
    "status": "pending"
  },
  {
    "content": "Update Layout.tsx to include PetSelector modal at app level",
    "priority": "high",
    "status": "pending"
  },
  {
    "content": "Test the integration works correctly",
    "priority": "medium",
    "status": "pending"
  }
]
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "oldString": "const SettingsIcon: React.FC<{ className?: string }> = ({ className = \"w-6 h-6\" }) => (\n    <svg className={className} viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\">\n        <circle cx=\"12\" cy=\"12\" r=\"3\" />\n        <path d=\"M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83\" />\n    </svg>\n);\n\n// Icon mapping for nav items",
  "newString": "const SettingsIcon: React.FC<{ className?: string }> = ({ className = \"w-6 h-6\" }) => (\n    <svg className={className} viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\">\n        <circle cx=\"12\" cy=\"12\" r=\"3\" />\n        <path d=\"M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83\" />\n    </svg>\n);\n\nconst PetIcon: React.FC<{ className?: string }> = ({ className = \"w-6 h-6\" }) => (\n    <svg className={className} viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\">\n        {/* Paw print icon */}\n        <ellipse cx=\"12\" cy=\"17\" rx=\"4\" ry=\"3\" />\n        <circle cx=\"7\" cy=\"10\" r=\"2\" />\n        <circle cx=\"17\" cy=\"10\" r=\"2\" />\n        <circle cx=\"9\" cy=\"6\" r=\"1.5\" />\n        <circle cx=\"15\" cy=\"6\" r=\"1.5\" />\n    </svg>\n);\n\n// Icon mapping for nav items"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 8.4s)

Now I need to add the PetIcon to the icon mapping and add a "Pets" item to the navigation. Let me also update the sidebar to include state for the pet selector modal:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Add PetIcon SVG component to Sidebar.tsx",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Add Pet button to desktop sidebar navigation",
      "priority": "high",
      "status": "in_progress"
    },
    {
      "content": "Add Pet button to mobile bottom navigation",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Update Layout.tsx to include PetSelector modal at app level",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Test the integration works correctly",
      "priority": "medium",
      "status": "pending"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add PetIcon SVG component to Sidebar.tsx",
    "priority": "high",
    "status": "completed"
  },
  {
    "content": "Add Pet button to desktop sidebar navigation",
    "priority": "high",
    "status": "in_progress"
  },
  {
    "content": "Add Pet button to mobile bottom navigation",
    "priority": "high",
    "status": "pending"
  },
  {
    "content": "Update Layout.tsx to include PetSelector modal at app level",
    "priority": "high",
    "status": "pending"
  },
  {
    "content": "Test the integration works correctly",
    "priority": "medium",
    "status": "pending"
  }
]
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "oldString": "// Icon mapping for nav items\nconst iconComponents: Record<string, React.FC<{ className?: string }>> = {\n    'learn': BookIcon,\n    'ar': CubeARIcon,\n    'profile': UserIcon,\n    'flashcards': FlashcardIcon,\n    'settings': SettingsIcon,\n};",
  "newString": "// Icon mapping for nav items\nconst iconComponents: Record<string, React.FC<{ className?: string }>> = {\n    'learn': BookIcon,\n    'ar': CubeARIcon,\n    'profile': UserIcon,\n    'flashcards': FlashcardIcon,\n    'settings': SettingsIcon,\n    'pets': PetIcon,\n};"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 7.0s)

Now I need to update the Sidebar to add state for the pet selector and include it in the navigation. The approach will be:
1. Add useState import and PetSelector import
2. Add state for the modal
3. Add a "Pets" button that opens the modal
4. Include the PetSelector modal component

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "newString": "import { useState } from 'react';\nimport { Link, useLocation } from 'react-router-dom';\nimport { PetSelector } from '@/components/pets';",
  "oldString": "import { Link, useLocation } from 'react-router-dom';"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 5.5s)

Now I'll add the state and the Pet button to the desktop sidebar. Let me read the current state of the file to see the exact location:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "offset": 62
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Sidebar.tsx</path>
<type>file</type>
<content>62: );
63: 
64: // Icon mapping for nav items
65: const iconComponents: Record<string, React.FC<{ className?: string }>> = {
66:     'learn': BookIcon,
67:     'ar': CubeARIcon,
68:     'profile': UserIcon,
69:     'flashcards': FlashcardIcon,
70:     'settings': SettingsIcon,
71:     'pets': PetIcon,
72: };
73: 
74: export const Sidebar: React.FC = () => {
75:     const location = useLocation();
76: 
77:     const navItems = [
78:         { path: '/courses', label: 'Learn', iconKey: 'learn' },
79:         { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
80:         { path: '/profile', label: 'Profile', iconKey: 'profile' },
81:         { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
82:     ];
83: 
84:     return (
85:         <>
86:             {/* Desktop Sidebar (Left) */}
87:             <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
88:                 <div className="p-8 flex items-center gap-3">
89:                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
90:                         <GraduationCapIcon className="w-7 h-7" />
91:                     </div>
92:                     <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
93:                 </div>
94: 
95:                 <nav className="flex-1 px-4 space-y-2">
96:                     {navItems.map((item) => {
97:                         const IconComponent = iconComponents[item.iconKey];
98:                         return (
99:                             <Link
100:                                 key={item.path}
101:                                 to={item.path}
102:                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
103:                                     ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
104:                                     : 'text-neutral-500 hover:bg-neutral-100'
105:                                     }`}
106:                             >
107:                                 <IconComponent className="w-6 h-6" />
108:                                 <span>{item.label}</span>
109:                             </Link>
110:                         );
111:                     })}
112:                 </nav>
113: 
114:                 <div className="p-4 border-t-2 border-neutral-200">
115:                     <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
116:                         <SettingsIcon className="w-6 h-6" />
117:                         <span>Settings</span>
118:                     </button>
119:                 </div>
120:             </aside>
121: 
122:             {/* Mobile Bottom Navigation */}
123:             <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
124:                 <div className="flex justify-around items-center h-16">
125:                     {navItems.map((item) => {
126:                         const IconComponent = iconComponents[item.iconKey];
127:                         return (
128:                             <Link
129:                                 key={item.path}
130:                                 to={item.path}
131:                                 className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
132:                                     ? 'text-primary'
133:                                     : 'text-neutral-400'
134:                                     }`}
135:                             >
136:                                 <IconComponent className="w-6 h-6 mb-1" />
137:                             </Link>
138:                         );
139:                     })}
140:                 </div>
141:             </nav>
142:         </>
143:     );
144: };
145: 

(End of file - total 145 lines)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 34.2s)

# Continuation Summary: AR Flashcard App - Pet Feature Integration

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models. **Phases 1-3 are COMPLETE**. Now working on **Phase 4: Integration** - adding pet components to the app's UI.

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **App uses `Sidebar.tsx` component** (in Layout.tsx) for main navigation
   - Desktop: Left sidebar with nav items (Learn, AR Practice, Profile, Flashcards, Settings)
   - Mobile: Bottom navigation bar
   - This is where pet selector button is being added

3. **Integration Guide specifies (lines 579-660):**
   - Add floating pet selector button (🐾) to dashboard/main UI
   - Connect `PetSelector` modal
   - Hook into gamification to trigger unlock checks on XP gain

4. **Service Imports for haptic/sound:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   ```

5. **All pet components export from `@/components/pets`:**
   ```typescript
   import { PetSelector, PetCard, PetViewer3D, PetGrid, PetUnlockModal } from '@/components/pets';
   ```

## Accomplished

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend API | ✅ COMPLETE | Pet models, schemas, API router |
| Phase 2: Frontend Hook | ✅ COMPLETE | `usePets.ts` hook |
| Phase 3: Pet UI Components | ✅ COMPLETE | All 5 components + barrel export |
| Phase 4: Integration | 🔄 IN PROGRESS | Modifying Sidebar.tsx |

### Phase 4 Progress (Current Session):
- ✅ Added `PetIcon` SVG component to Sidebar.tsx
- ✅ Added `'pets': PetIcon` to iconComponents mapping
- ✅ Added imports: `useState` from react, `PetSelector` from `@/components/pets`
- 🔄 **NEXT**: Add state for pet selector modal and Pet button to navigation

### What Still Needs to Be Done in Sidebar.tsx:
1. Add `const [showPetSelector, setShowPetSelector] = useState(false);` state
2. Add Pet button to desktop sidebar (above Settings in the footer area)
3. Add Pet button to mobile bottom navigation
4. Include `<PetSelector isOpen={showPetSelector} onClose={() => setShowPetSelector(false)} />` in the JSX

### Layout.tsx:
- May not need modification if PetSelector is included directly in Sidebar.tsx (current approach)

## Relevant Files / Directories

### Spec (READ THIS)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - see lines 579-660 for integration
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Pet Components (Phase 3 Complete)
```
frontend-web/src/components/pets/
├── PetCard.tsx                            # ✅ Individual pet cards
├── PetViewer3D.tsx                        # ✅ 3D model viewer
├── PetGrid.tsx                            # ✅ Grid with filters
├── PetUnlockModal.tsx                     # ✅ Celebration modal
├── PetSelector.tsx                        # ✅ Main selector modal
└── index.ts                               # ✅ Barrel exports
```

### Frontend - Integration Targets (ACTIVELY MODIFYING)
```
frontend-web/src/components/
├── Sidebar.tsx                            # 🔄 IN PROGRESS - Added PetIcon, imports; need to add button + modal
└── Layout.tsx                             # May need PetSelector if not in Sidebar
```

### Current State of Sidebar.tsx (Key Changes Made):
```typescript
// Line 1-3: Added imports
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PetSelector } from '@/components/pets';

// Lines 51-61: Added PetIcon SVG component (paw print design)

// Lines 64-72: Updated iconComponents to include 'pets': PetIcon
```

### Next Edit Needed for Sidebar.tsx:
Add state and button inside the component. The structure is:
- Line 74: `export const Sidebar: React.FC = () => {`
- Line 75: `const location = useLocation();` ← Add state after this
- Lines 114-119: Settings button in footer ← Add Pet button before this
- Lines 122-141: Mobile nav ← Add Pet button here too
- Line 142: `</>` closing ← Add PetSelector modal before this

---

## User

---

## Assistant (Build · claude-opus-4.5 · 6.8s)

I have clear next steps from the continuation summary. Let me continue with Phase 4 Integration - adding the pet selector state and buttons to the Sidebar.tsx component.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Sidebar.tsx</path>
<type>file</type>
<content>1: import { useState } from 'react';
2: import { Link, useLocation } from 'react-router-dom';
3: import { PetSelector } from '@/components/pets';
4: 
5: // SVG Icons as components
6: const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
7:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
8:         <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
9:         <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
10:         <path d="M8 7h8" />
11:         <path d="M8 11h6" />
12:     </svg>
13: );
14: 
15: const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
16:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
17:         <path d="M12 2L2 7l10 5 10-5-10-5z" />
18:         <path d="M2 17l10 5 10-5" />
19:         <path d="M2 12l10 5 10-5" />
20:     </svg>
21: );
22: 
23: const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
24:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
25:         <circle cx="12" cy="8" r="5" />
26:         <path d="M20 21a8 8 0 1 0-16 0" />
27:     </svg>
28: );
29: 
30: const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
31:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
32:         <rect x="3" y="5" width="18" height="14" rx="2" />
33:         <path d="M3 10h18" />
34:         <path d="M7 15h4" />
35:     </svg>
36: );
37: 
38: const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
39:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
40:         <path d="M22 10l-10-5L2 10l10 5 10-5z" />
41:         <path d="M6 12v5c3 3 9 3 12 0v-5" />
42:         <path d="M22 10v6" />
43:     </svg>
44: );
45: 
46: const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
47:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
48:         <circle cx="12" cy="12" r="3" />
49:         <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
50:     </svg>
51: );
52: 
53: const PetIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
54:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
55:         {/* Paw print icon */}
56:         <ellipse cx="12" cy="17" rx="4" ry="3" />
57:         <circle cx="7" cy="10" r="2" />
58:         <circle cx="17" cy="10" r="2" />
59:         <circle cx="9" cy="6" r="1.5" />
60:         <circle cx="15" cy="6" r="1.5" />
61:     </svg>
62: );
63: 
64: // Icon mapping for nav items
65: const iconComponents: Record<string, React.FC<{ className?: string }>> = {
66:     'learn': BookIcon,
67:     'ar': CubeARIcon,
68:     'profile': UserIcon,
69:     'flashcards': FlashcardIcon,
70:     'settings': SettingsIcon,
71:     'pets': PetIcon,
72: };
73: 
74: export const Sidebar: React.FC = () => {
75:     const location = useLocation();
76: 
77:     const navItems = [
78:         { path: '/courses', label: 'Learn', iconKey: 'learn' },
79:         { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
80:         { path: '/profile', label: 'Profile', iconKey: 'profile' },
81:         { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
82:     ];
83: 
84:     return (
85:         <>
86:             {/* Desktop Sidebar (Left) */}
87:             <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
88:                 <div className="p-8 flex items-center gap-3">
89:                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
90:                         <GraduationCapIcon className="w-7 h-7" />
91:                     </div>
92:                     <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
93:                 </div>
94: 
95:                 <nav className="flex-1 px-4 space-y-2">
96:                     {navItems.map((item) => {
97:                         const IconComponent = iconComponents[item.iconKey];
98:                         return (
99:                             <Link
100:                                 key={item.path}
101:                                 to={item.path}
102:                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
103:                                     ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
104:                                     : 'text-neutral-500 hover:bg-neutral-100'
105:                                     }`}
106:                             >
107:                                 <IconComponent className="w-6 h-6" />
108:                                 <span>{item.label}</span>
109:                             </Link>
110:                         );
111:                     })}
112:                 </nav>
113: 
114:                 <div className="p-4 border-t-2 border-neutral-200">
115:                     <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
116:                         <SettingsIcon className="w-6 h-6" />
117:                         <span>Settings</span>
118:                     </button>
119:                 </div>
120:             </aside>
121: 
122:             {/* Mobile Bottom Navigation */}
123:             <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
124:                 <div className="flex justify-around items-center h-16">
125:                     {navItems.map((item) => {
126:                         const IconComponent = iconComponents[item.iconKey];
127:                         return (
128:                             <Link
129:                                 key={item.path}
130:                                 to={item.path}
131:                                 className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
132:                                     ? 'text-primary'
133:                                     : 'text-neutral-400'
134:                                     }`}
135:                             >
136:                                 <IconComponent className="w-6 h-6 mb-1" />
137:                             </Link>
138:                         );
139:                     })}
140:                 </div>
141:             </nav>
142:         </>
143:     );
144: };
145: 

(End of file - total 145 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 6.8s)

Good, I can see the current state. Now I need to:
1. Add state for the pet selector modal
2. Add Pet button to desktop sidebar (before Settings in the footer area)
3. Add Pet button to mobile bottom navigation
4. Include the PetSelector modal in the JSX

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "oldString": "export const Sidebar: React.FC = () => {\n    const location = useLocation();",
  "newString": "export const Sidebar: React.FC = () => {\n    const location = useLocation();\n    const [showPetSelector, setShowPetSelector] = useState(false);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 7.2s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "oldString": "                <div className=\"p-4 border-t-2 border-neutral-200\">\n                    <button className=\"w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]\">\n                        <SettingsIcon className=\"w-6 h-6\" />\n                        <span>Settings</span>\n                    </button>\n                </div>\n            </aside>",
  "newString": "                <div className=\"p-4 border-t-2 border-neutral-200 space-y-2\">\n                    <button \n                        onClick={() => setShowPetSelector(true)}\n                        className=\"w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-primary-light/10 hover:text-primary rounded-xl font-bold min-h-[48px] transition-all\"\n                    >\n                        <PetIcon className=\"w-6 h-6\" />\n                        <span>My Pet</span>\n                    </button>\n                    <button className=\"w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]\">\n                        <SettingsIcon className=\"w-6 h-6\" />\n                        <span>Settings</span>\n                    </button>\n                </div>\n            </aside>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 9.2s)

Now let me add the Pet button to the mobile bottom navigation:

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "newString": "            {/* Mobile Bottom Navigation */}\n            <nav className=\"md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe\">\n                <div className=\"flex justify-around items-center h-16\">\n                    {navItems.map((item) => {\n                        const IconComponent = iconComponents[item.iconKey];\n                        return (\n                            <Link\n                                key={item.path}\n                                to={item.path}\n                                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path\n                                    ? 'text-primary'\n                                    : 'text-neutral-400'\n                                    }`}\n                            >\n                                <IconComponent className=\"w-6 h-6 mb-1\" />\n                            </Link>\n                        );\n                    })}\n                    {/* Pet Button */}\n                    <button\n                        onClick={() => setShowPetSelector(true)}\n                        className=\"flex flex-col items-center justify-center w-full h-full min-h-[48px] text-neutral-400 hover:text-primary transition-colors\"\n                    >\n                        <PetIcon className=\"w-6 h-6 mb-1\" />\n                    </button>\n                </div>\n            </nav>",
  "oldString": "            {/* Mobile Bottom Navigation */}\n            <nav className=\"md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe\">\n                <div className=\"flex justify-around items-center h-16\">\n                    {navItems.map((item) => {\n                        const IconComponent = iconComponents[item.iconKey];\n                        return (\n                            <Link\n                                key={item.path}\n                                to={item.path}\n                                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path\n                                    ? 'text-primary'\n                                    : 'text-neutral-400'\n                                    }`}\n                            >\n                                <IconComponent className=\"w-6 h-6 mb-1\" />\n                            </Link>\n                        );\n                    })}\n                </div>\n            </nav>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 5.6s)

Now let me add the PetSelector modal before the closing fragment:

**Tool: edit**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx",
  "newString": "            </nav>\n\n            {/* Pet Selector Modal */}\n            <PetSelector \n                isOpen={showPetSelector} \n                onClose={() => setShowPetSelector(false)} \n            />\n        </>\n    );\n};",
  "oldString": "            </nav>\n        </>\n    );\n};"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · claude-opus-4.5 · 4.9s)

Let me verify the final state of the Sidebar.tsx file:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\Sidebar.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\Sidebar.tsx</path>
<type>file</type>
<content>1: import { useState } from 'react';
2: import { Link, useLocation } from 'react-router-dom';
3: import { PetSelector } from '@/components/pets';
4: 
5: // SVG Icons as components
6: const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
7:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
8:         <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
9:         <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
10:         <path d="M8 7h8" />
11:         <path d="M8 11h6" />
12:     </svg>
13: );
14: 
15: const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
16:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
17:         <path d="M12 2L2 7l10 5 10-5-10-5z" />
18:         <path d="M2 17l10 5 10-5" />
19:         <path d="M2 12l10 5 10-5" />
20:     </svg>
21: );
22: 
23: const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
24:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
25:         <circle cx="12" cy="8" r="5" />
26:         <path d="M20 21a8 8 0 1 0-16 0" />
27:     </svg>
28: );
29: 
30: const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
31:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
32:         <rect x="3" y="5" width="18" height="14" rx="2" />
33:         <path d="M3 10h18" />
34:         <path d="M7 15h4" />
35:     </svg>
36: );
37: 
38: const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
39:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
40:         <path d="M22 10l-10-5L2 10l10 5 10-5z" />
41:         <path d="M6 12v5c3 3 9 3 12 0v-5" />
42:         <path d="M22 10v6" />
43:     </svg>
44: );
45: 
46: const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
47:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
48:         <circle cx="12" cy="12" r="3" />
49:         <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
50:     </svg>
51: );
52: 
53: const PetIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
54:     <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
55:         {/* Paw print icon */}
56:         <ellipse cx="12" cy="17" rx="4" ry="3" />
57:         <circle cx="7" cy="10" r="2" />
58:         <circle cx="17" cy="10" r="2" />
59:         <circle cx="9" cy="6" r="1.5" />
60:         <circle cx="15" cy="6" r="1.5" />
61:     </svg>
62: );
63: 
64: // Icon mapping for nav items
65: const iconComponents: Record<string, React.FC<{ className?: string }>> = {
66:     'learn': BookIcon,
67:     'ar': CubeARIcon,
68:     'profile': UserIcon,
69:     'flashcards': FlashcardIcon,
70:     'settings': SettingsIcon,
71:     'pets': PetIcon,
72: };
73: 
74: export const Sidebar: React.FC = () => {
75:     const location = useLocation();
76:     const [showPetSelector, setShowPetSelector] = useState(false);
77: 
78:     const navItems = [
79:         { path: '/courses', label: 'Learn', iconKey: 'learn' },
80:         { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
81:         { path: '/profile', label: 'Profile', iconKey: 'profile' },
82:         { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
83:     ];
84: 
85:     return (
86:         <>
87:             {/* Desktop Sidebar (Left) */}
88:             <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
89:                 <div className="p-8 flex items-center gap-3">
90:                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
91:                         <GraduationCapIcon className="w-7 h-7" />
92:                     </div>
93:                     <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
94:                 </div>
95: 
96:                 <nav className="flex-1 px-4 space-y-2">
97:                     {navItems.map((item) => {
98:                         const IconComponent = iconComponents[item.iconKey];
99:                         return (
100:                             <Link
101:                                 key={item.path}
102:                                 to={item.path}
103:                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
104:                                     ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
105:                                     : 'text-neutral-500 hover:bg-neutral-100'
106:                                     }`}
107:                             >
108:                                 <IconComponent className="w-6 h-6" />
109:                                 <span>{item.label}</span>
110:                             </Link>
111:                         );
112:                     })}
113:                 </nav>
114: 
115:                 <div className="p-4 border-t-2 border-neutral-200 space-y-2">
116:                     <button 
117:                         onClick={() => setShowPetSelector(true)}
118:                         className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-primary-light/10 hover:text-primary rounded-xl font-bold min-h-[48px] transition-all"
119:                     >
120:                         <PetIcon className="w-6 h-6" />
121:                         <span>My Pet</span>
122:                     </button>
123:                     <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
124:                         <SettingsIcon className="w-6 h-6" />
125:                         <span>Settings</span>
126:                     </button>
127:                 </div>
128:             </aside>
129: 
130:             {/* Mobile Bottom Navigation */}
131:             <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
132:                 <div className="flex justify-around items-center h-16">
133:                     {navItems.map((item) => {
134:                         const IconComponent = iconComponents[item.iconKey];
135:                         return (
136:                             <Link
137:                                 key={item.path}
138:                                 to={item.path}
139:                                 className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
140:                                     ? 'text-primary'
141:                                     : 'text-neutral-400'
142:                                     }`}
143:                             >
144:                                 <IconComponent className="w-6 h-6 mb-1" />
145:                             </Link>
146:                         );
147:                     })}
148:                     {/* Pet Button */}
149:                     <button
150:                         onClick={() => setShowPetSelector(true)}
151:                         className="flex flex-col items-center justify-center w-full h-full min-h-[48px] text-neutral-400 hover:text-primary transition-colors"
152:                     >
153:                         <PetIcon className="w-6 h-6 mb-1" />
154:                     </button>
155:                 </div>
156:             </nav>
157: 
158:             {/* Pet Selector Modal */}
159:             <PetSelector 
160:                 isOpen={showPetSelector} 
161:                 onClose={() => setShowPetSelector(false)} 
162:             />
163:         </>
164:     );
165: };
166: 

(End of file - total 166 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 9.2s)

The Sidebar.tsx integration is complete. Now let me run a TypeScript check to make sure everything compiles correctly:

**Tool: bash**

**Input:**
```json
{
  "command": "cd \"E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\" && npx tsc --noEmit 2>&1 | head -50",
  "description": "TypeScript type check for frontend",
  "timeout": 60000
}
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 28.4s)

# Continuation Summary: AR Flashcard App - Pet Feature Integration

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models. **Phases 1-4 are now COMPLETE**. The pet feature UI is fully integrated into the app's sidebar navigation.

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **App uses `Sidebar.tsx` component** (in Layout.tsx) for main navigation
   - Desktop: Left sidebar with nav items (Learn, AR Practice, Profile, Flashcards, Settings)
   - Mobile: Bottom navigation bar
   - Pet selector button successfully added to both

3. **Integration Guide specifies (lines 579-660):**
   - Add floating pet selector button (🐾) to dashboard/main UI ✅ DONE
   - Connect `PetSelector` modal ✅ DONE
   - Hook into gamification to trigger unlock checks on XP gain (Next step)

4. **Service Imports for haptic/sound:**
   ```typescript
   import { HapticService } from '@/services/HapticService';
   import { SoundEffectService } from '@/services/SoundEffectService';
   ```

5. **All pet components export from `@/components/pets`:**
   ```typescript
   import { PetSelector, PetCard, PetViewer3D, PetGrid, PetUnlockModal } from '@/components/pets';
   ```

6. **TypeScript compiles successfully** - no type errors after integration

## Accomplished

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend API | ✅ COMPLETE | Pet models, schemas, API router |
| Phase 2: Frontend Hook | ✅ COMPLETE | `usePets.ts` hook |
| Phase 3: Pet UI Components | ✅ COMPLETE | All 5 components + barrel export |
| Phase 4: Integration | ✅ COMPLETE | Sidebar.tsx fully integrated |

### Phase 4 Completed Items:
- ✅ Added `PetIcon` SVG component (paw print design) to Sidebar.tsx
- ✅ Added `'pets': PetIcon` to iconComponents mapping
- ✅ Added state: `const [showPetSelector, setShowPetSelector] = useState(false);`
- ✅ Added "My Pet" button to desktop sidebar footer (above Settings)
- ✅ Added Pet button to mobile bottom navigation
- ✅ Included `<PetSelector isOpen={showPetSelector} onClose={() => setShowPetSelector(false)} />` modal
- ✅ TypeScript compilation passes with no errors

### What's Next (Per Implementation Guide):
1. **Hook into gamification system** - Trigger pet unlock checks when user gains XP (lines 636-660 of guide)
2. **Testing** - Verify the pet selector opens, 3D models load, and selection persists
3. **Optional enhancements** - Pet animations, idle behaviors, speech bubbles

## Relevant Files / Directories

### Spec (READ THIS)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - see lines 636-660 for gamification hook
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
└── api/pets.py                            # ✅ Full Pet API router
```

### Frontend - Pet Components (Phase 3 Complete)
```
frontend-web/src/components/pets/
├── PetCard.tsx                            # ✅ Individual pet cards
├── PetViewer3D.tsx                        # ✅ 3D model viewer
├── PetGrid.tsx                            # ✅ Grid with filters
├── PetUnlockModal.tsx                     # ✅ Celebration modal
├── PetSelector.tsx                        # ✅ Main selector modal
└── index.ts                               # ✅ Barrel exports
```

### Frontend - Hook
```
frontend-web/src/hooks/usePets.ts          # ✅ Pet data fetching hook
```

### Frontend - Integration (COMPLETED)
```
frontend-web/src/components/Sidebar.tsx    # ✅ COMPLETE - Pet button + modal integrated
```

### Key Code in Sidebar.tsx:
```typescript
// Line 3: Import
import { PetSelector } from '@/components/pets';

// Line 76: State
const [showPetSelector, setShowPetSelector] = useState(false);

// Lines 116-122: Desktop "My Pet" button
// Lines 148-154: Mobile pet button  
// Lines 158-162: PetSelector modal
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.6s)

Based on the continuation summary, **Phases 1-4 are complete**. The next step according to the implementation guide is to **hook into the gamification system** to trigger pet unlock checks when users gain XP.

Let me first check the current state of the gamification system and the implementation guide to understand exactly what needs to be done:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\docs\\PET_FEATURE_IMPLEMENTATION_GUIDE.md",
  "offset": 600,
  "limit": 100
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\docs\PET_FEATURE_IMPLEMENTATION_GUIDE.md</path>
<type>file</type>
<content>600:         🐾
601:       </button>
602:       
603:       <PetSelector 
604:         isOpen={showPetSelector}
605:         onClose={() => setShowPetSelector(false)}
606:       />
607:     </div>
608:   );
609: }
610: ```
611: 
612: ### 2. AR Viewer Integration
613: 
614: Add pet to AR scenes:
615: 
616: ```tsx
617: // pages/LearnAR.tsx
618: import ARPetCompanion from '@/components/ARPetCompanion';
619: 
620: export default function LearnAR() {
621:   const { user } = useAuth();
622:   
623:   return (
624:     <a-scene>
625:       {/* ... existing AR content */}
626:       
627:       {user.active_pet && (
628:         <ARPetCompanion petId={user.active_pet} />
629:       )}
630:     </a-scene>
631:   );
632: }
633: ```
634: 
635: ### 3. XP/Progress Hook
636: 
637: Trigger unlock checks on XP gain:
638: 
639: ```tsx
640: // hooks/useGamification.ts
641: export function useGamification() {
642:   const checkPetUnlocks = async (newXP: number) => {
643:     const response = await fetch('/api/v1/pets');
644:     const { pets } = await response.json();
645:     
646:     const newlyUnlockable = pets.filter(pet => 
647:       !pet.is_unlocked && 
648:       pet.can_unlock &&
649:       pet.unlock_condition.type === 'xp' &&
650:       pet.unlock_condition.value <= newXP
651:     );
652:     
653:     if (newlyUnlockable.length > 0) {
654:       showPetUnlockNotification(newlyUnlockable[0]);
655:     }
656:   };
657:   
658:   return { checkPetUnlocks };
659: }
660: ```
661: 
662: ---
663: 
664: ## ✅ Implementation Checklist
665: 
666: ### Phase 1: Database & Backend
667: - [ ] Create pets collection indexes
668: - [ ] Add `active_pet` and `unlocked_pets` to Users schema
669: - [ ] Implement `GET /api/v1/pets` endpoint
670: - [ ] Implement `POST /api/v1/pets/{id}/unlock` endpoint
671: - [ ] Implement `PUT /api/v1/users/active-pet` endpoint
672: - [ ] Add unlock condition validation logic
673: - [ ] Test all endpoints with Postman
674: 
675: ### Phase 2: Frontend Components
676: - [ ] Create `PetSelector.tsx` component
677: - [ ] Create `PetCard.tsx` component  
678: - [ ] Create `Pet3DPreview.tsx` component
679: - [ ] Create `ARPetCompanion.tsx` component
680: - [ ] Create `PetUnlockNotification.tsx` component
681: - [ ] Add pet selector to Dashboard
682: - [ ] Test responsive design
683: 
684: ### Phase 3: AR Integration
685: - [ ] Load pet model in AR scene
686: - [ ] Position pet companion correctly
687: - [ ] Add idle animations
688: - [ ] Test on mobile devices
689: - [ ] Optimize performance
690: 
691: ### Phase 4: Gamification
692: - [ ] Integrate with XP system
693: - [ ] Add unlock notifications
694: - [ ] Track unlock achievements
695: - [ ] Add analytics events
696: 
697: ### Phase 5: Polish & Testing
698: - [ ] Add loading states
699: - [ ] Handle errors gracefully

(File has more lines. Use 'offset' parameter to read beyond line 699)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend-web/src/**/*gamification*"
}
```

**Output:**
```
No files found
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend-web/src/**/*xp*"
}
```

**Output:**
```
No files found
```

---

## Assistant (Build · claude-opus-4.5 · 6.4s)

Let me search for existing gamification or XP-related code with broader patterns:

**Tool: grep**

**Input:**
```json
{
  "pattern": "xp|XP|experience|gamification",
  "include": "*.ts,*.tsx",
  "path": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src"
}
```

**Output:**
```
No files found
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "xp|XP|experience",
  "include": "*.py",
  "path": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\backend"
}
```

**Output:**
```
Found 141 matches (showing first 100)
E:\Daniel Project\Graduted Project\Edu-platform\backend\api\__init__.py:
  Line 4: Exports all API routers for easy registration

E:\Daniel Project\Graduted Project\Edu-platform\backend\api\pets.py:
  Line 45:     user_xp: int,
  Line 58:         elif condition.type == "xp":
  Line 59:             can_unlock = user_xp >= condition.value
  Line 102:     user_xp = user_stats.get("total_points", 0)
  Line 119:         pet_to_response(pet, user_unlocked, user_active, user_xp, user_streak)
  Line 159:     user_xp = user_stats.get("total_points", 0)
  Line 164:     return pet_to_response(pet, user_unlocked, user_active, user_xp, user_streak)
  Line 178:     Checks if the user meets the unlock requirements (XP, streak, etc.)
  Line 193:     user_xp = user_stats.get("total_points", 0)
  Line 202:             pet=pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)
  Line 212:     elif condition.type == "xp":
  Line 213:         if user_xp >= condition.value:
  Line 216:             reason = f"Need {condition.value} XP (you have {user_xp})"
  Line 247:         pet=pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)
  Line 278:     user_xp = user_stats.get("total_points", 0)
  Line 295:     return pet_to_response(pet, user_unlocked, pet_id, user_xp, user_streak)
  Line 323:     user_xp = user_stats.get("total_points", 0)
  Line 327:     return pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)

E:\Daniel Project\Graduted Project\Edu-platform\backend\models\__init__.py:
  Line 8: from .ar_experience import ARExperienceResponseSchema
  Line 31:     # AR Experience
  Line 32:     "ARExperienceResponseSchema",

E:\Daniel Project\Graduted Project\Edu-platform\backend\models\pet.py:
  Line 16:     type: Literal["free", "xp", "streak", "achievement"] = "free"

E:\Daniel Project\Graduted Project\Edu-platform\backend\api\gamification.py:
  Line 3: Handles HTTP for XP, badges, pets, stickers, and progress reports.
  Line 16: class AddXPRequest(BaseModel):
  Line 70: @router.post("/gamification/add-xp")
  Line 71: async def add_xp(
  Line 72:     request: AddXPRequest,
  Line 75:     """Add XP for completing an action"""
  Line 76:     result = await service.add_xp(request.user_id, request.action, request.metadata)
  Line 78:         raise HTTPException(status_code=400, detail=result.get("error", "Failed to add XP"))
  Line 194:     Includes XP, level, streak, learning stats, pet status.

E:\Daniel Project\Graduted Project\Edu-platform\backend\services\gamification_service.py:
  Line 3: from models.gamification_model import XP_REWARDS, BADGE_DEFINITIONS, calculate_next_level_xp
  Line 21:     async def add_xp(self, user_id: str, action: str, metadata: Dict = None) -> Dict[str, Any]:
  Line 23:         Add XP for completing an action.
  Line 26:         if action not in XP_REWARDS:
  Line 27:             logger.warning(f"Unknown XP action: {action}")
  Line 30:         xp_amount = XP_REWARDS[action]
  Line 34:             "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
  Line 37:         current_xp = user_data.get("total_points", 0)
  Line 39:         xp_to_next = user_data.get("xp_to_next_level", 100)
  Line 41:         # Calculate new XP and level
  Line 42:         new_xp = current_xp + xp_amount
  Line 46:         while new_xp >= xp_to_next:
  Line 47:             new_xp -= xp_to_next
  Line 49:             xp_to_next = calculate_next_level_xp(new_level)
  Line 53:         await self.repo.add_xp(user_id, xp_amount, new_level, xp_to_next)
  Line 74:         logger.info(f"Added {xp_amount} XP for {user_id} ({action})")
  Line 78:             "xp_added": xp_amount,
  Line 79:             "total_xp": new_xp,
  Line 99:         # Award XP for badge
  Line 100:         badge_xp = BADGE_DEFINITIONS[badge_id].get("xp_reward", 0)
  Line 101:         if badge_xp > 0:
  Line 102:             await self.repo.update_points(user_id, badge_xp)
  Line 172:         # Award XP for caring for pet
  Line 173:         await self.repo.update_points(user_id, 5)  # Small XP reward
  Line 175:         # Update pet XP for evolution
  Line 176:         pet_xp = pet.get("xp_earned", 0) + 5
  Line 177:         await self.repo.update_pet_xp(user_id, pet_xp)
  Line 180:         new_stage = self._get_evolution_stage(pet_xp)
  Line 195:             "xp_earned": 5,
  Line 196:             "pet_xp": pet_xp,
  Line 212:             "xp_earned": 0,
  Line 221:         Play with user's pet - increases happiness and awards XP.
  Line 227:         # Award XP for playing
  Line 230:         # Update pet XP for evolution
  Line 231:         pet_xp = pet.get("xp_earned", 0) + 8
  Line 232:         await self.repo.update_pet_xp(user_id, pet_xp)
  Line 235:         new_stage = self._get_evolution_stage(pet_xp)
  Line 246:             "xp_earned": 8,
  Line 247:             "pet_xp": pet_xp,
  Line 261:     def _get_evolution_stage(self, xp: int) -> str:
  Line 262:         """Calculate evolution stage based on XP"""
  Line 263:         if xp >= 2000:
  Line 265:         elif xp >= 500:
  Line 267:         elif xp >= 100:
  Line 337:         # Award XP based on rarity
  Line 338:         xp_rewards = {"common": 10, "rare": 25, "epic": 50, "legendary": 100}
  Line 339:         xp = xp_rewards.get(sticker["rarity"], 10)
  Line 340:         await self.repo.update_points(user_id, xp)
  Line 348:             "xp_earned": xp
  Line 436:                 "total_xp": stats.get("total_points", 0),

E:\Daniel Project\Graduted Project\Edu-platform\backend\api\reports.py:
  Line 28:             "total_xp": 1250,

E:\Daniel Project\Graduted Project\Edu-platform\backend\api\combos.py:
  Line 25:     bonus_xp: int = 100
  Line 48:         bonus_xp=combo.get("bonus_xp", combo.get("reward_xp", 100))

E:\Daniel Project\Graduted Project\Edu-platform\backend\scripts\seed_quiz_game.py:
  Line 37:                 "explanation": "Elephant trong tiếng Việt là 'Con voi'."
  Line 45:                 "explanation": "Đúng, voi là động vật có vú lớn nhất trên cạn.",
  Line 54:                 "explanation": "Elephant được viết là E-L-E-P-H-A-N-T"

E:\Daniel Project\Graduted Project\Edu-platform\backend\settings.py:
  Line 28:     ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

E:\Daniel Project\Graduted Project\Edu-platform\backend\api\ai.py:
  Line 81:     Compares expected word with speech recognition transcript.

E:\Daniel Project\Graduted Project\Edu-platform\backend\repositories\gamification_repository.py:
  Line 29:     async def add_xp(self, user_id: str, xp_amount: int, new_level: int = None, new_xp_to_next: int = None) -> Dict[str, Any]:
  Line 30:         """Add XP with optional level update"""
  Line 32:             "$inc": {"total_points": xp_amount},
  Line 37:         if new_xp_to_next is not None:
  Line 38:             update_doc["$set"]["xp_to_next_level"] = new_xp_to_next

E:\Daniel Project\Graduted Project\Edu-platform\backend\services\ar_service.py:
  Line 2: AR Service - Business logic for AR experience orchestration
  Line 12:     """Service handling AR experience orchestration"""
  Line 24:     async def get_ar_experience(self, qr_id: str) -> Optional[Dict[str, Any]]:
  Line 26:         Get complete AR experience data by QR ID
  Line 29:         Returns ARExperienceResponseSchema format:

(Results truncated: showing 100 of 141 matches (41 hidden). Consider using a more specific path or pattern.)
```

---

## Assistant (Build · claude-opus-4.5 · 6.4s)

There's already a gamification system in place. Let me check the frontend for how XP is currently handled and what hooks exist:

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend-web/src/hooks/*.ts"
}
```

**Output:**
```
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\usePets.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useGamification.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useProgressReport.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useMultiFlashcard.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useSessionTimer.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useGameData.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useQuizData.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useARAudio.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useARStateMachine.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useARInjection.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useArData.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useRuntimeBridge.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useAREvents.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useMarkerState.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useGame.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useQuiz.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useVerificationSocket.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useDisplayMode.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useArQrScanner.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useArjsResizer.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useCameraStream.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useQrScanner.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useAppStateManagement.ts
E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useVerifySocket.ts
```

**Tool: grep**

**Input:**
```json
{
  "include": "*.ts,*.tsx",
  "path": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src",
  "pattern": "add.*xp|addXp|add_xp|gamification"
}
```

**Output:**
```
No files found
```

---

## Assistant (Build · claude-opus-4.5 · 4.5s)

There's already a `useGamification.ts` hook. Let me read it to see what's already implemented:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\hooks\\useGamification.ts"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useGamification.ts</path>
<type>file</type>
<content>1: /**
2:  * useGamification.ts
3:  * 
4:  * React hook for gamification features:
5:  * - XP tracking
6:  * - Badge management  
7:  * - Streak tracking
8:  * - Level progression
9:  * - Virtual Pet
10:  * - Sticker Collection
11:  */
12: 
13: import { useState, useEffect, useCallback } from 'react';
14: import { getApiBase } from '@/config';
15: import { eventBus } from '@/runtime/EventBus';
16: 
17: const API_BASE = getApiBase();
18: 
19: export interface Badge {
20:     id: string;
21:     name: string;
22:     emoji: string;
23:     description?: string;
24:     earned_at?: string;
25: }
26: 
27: export interface VirtualPet {
28:     type: 'bunny' | 'panda' | 'dog' | 'cat';
29:     happiness: number; // 0-100
30:     last_fed: string;
31:     outfit?: string;
32: }
33: 
34: export interface Sticker {
35:     id: string;
36:     name: string;
37:     imageUrl: string;
38:     rarity: 'common' | 'rare' | 'epic' | 'legendary';
39:     earned_at: string;
40: }
41: 
42: export interface UserProgress {
43:     user_id: string;
44:     total_xp: number;
45:     level: number;
46:     xp_to_next_level: number;
47:     stars: number;
48:     current_streak: number;
49:     longest_streak: number;
50:     badges: Badge[];
51:     badge_count: number;
52:     pet?: VirtualPet;
53:     stickers?: Sticker[];
54: }
55: 
56: export interface XPResult {
57:     success: boolean;
58:     xp_added: number;
59:     total_xp: number;
60:     level: number;
61:     level_up: boolean;
62:     streak: number;
63:     badges_earned: string[];
64:     sticker_earned?: string;
65: }
66: 
67: type XPAction =
68:     | 'flashcard_viewed'
69:     | 'flashcard_3d_interaction'
70:     | 'quiz_question_correct'
71:     | 'quiz_completed'
72:     | 'game_completed'
73:     | 'pronunciation_correct'
74:     | 'combo_discovered'
75:     | 'daily_login';
76: 
77: export function useGamification(userId: string | null) {
78:     const [progress, setProgress] = useState<UserProgress | null>(null);
79:     const [isLoading, setIsLoading] = useState(false);
80:     const [error, setError] = useState<string | null>(null);
81:     const [recentXP, setRecentXP] = useState<{ amount: number; action: string } | null>(null);
82:     const [levelUp, setLevelUp] = useState(false);
83:     const [newBadges, setNewBadges] = useState<string[]>([]);
84:     const [newSticker, setNewSticker] = useState<Sticker | null>(null);
85: 
86:     // Fetch user progress
87:     const fetchProgress = useCallback(async () => {
88:         if (!userId) return;
89: 
90:         setIsLoading(true);
91:         try {
92:             const response = await fetch(`${API_BASE}/api/v1/gamification/user/${userId}`);
93:             if (!response.ok) throw new Error('Failed to fetch progress');
94: 
95:             const data = await response.json();
96:             setProgress(data);
97:             setError(null);
98:         } catch (err) {
99:             setError((err as Error).message);
100:             console.error('[useGamification] Fetch error:', err);
101:         } finally {
102:             setIsLoading(false);
103:         }
104:     }, [userId]);
105: 
106:     // Add XP for an action
107:     const addXP = useCallback(async (action: XPAction, metadata?: Record<string, any>): Promise<XPResult | null> => {
108:         if (!userId) return null;
109: 
110:         try {
111:             const response = await fetch(`${API_BASE}/api/v1/gamification/add-xp`, {
112:                 method: 'POST',
113:                 headers: { 'Content-Type': 'application/json' },
114:                 body: JSON.stringify({ user_id: userId, action, metadata })
115:             });
116: 
117:             if (!response.ok) throw new Error('Failed to add XP');
118: 
119:             const result: XPResult = await response.json();
120: 
121:             // Update local state
122:             setRecentXP({ amount: result.xp_added, action });
123: 
124:             if (result.level_up) {
125:                 setLevelUp(true);
126:                 eventBus.emit('LEVEL_UP' as any, { level: result.level });
127:                 setTimeout(() => setLevelUp(false), 3000);
128:             }
129: 
130:             if (result.badges_earned.length > 0) {
131:                 setNewBadges(result.badges_earned);
132:                 eventBus.emit('BADGES_EARNED' as any, { badges: result.badges_earned });
133:                 setTimeout(() => setNewBadges([]), 3000);
134:             }
135: 
136:             // Handle auto-awarded sticker
137:             if (result.sticker_earned) {
138:                 const stickerObj: Sticker = typeof result.sticker_earned === 'string'
139:                     ? { id: result.sticker_earned, name: result.sticker_earned, imageUrl: '', rarity: 'common', earned_at: new Date().toISOString() }
140:                     : result.sticker_earned;
141:                 setNewSticker(stickerObj);
142:                 eventBus.emit('STICKER_COLLECTED' as any, { sticker: stickerObj });
143:                 setTimeout(() => setNewSticker(null), 3000);
144:             }
145: 
146:             // Refresh progress
147:             await fetchProgress();
148: 
149:             return result;
150:         } catch (err) {
151:             console.error('[useGamification] Add XP error:', err);
152:             return null;
153:         }
154:     }, [userId, fetchProgress]);
155: 
156:     // Award a badge manually
157:     const awardBadge = useCallback(async (badgeId: string): Promise<boolean> => {
158:         if (!userId) return false;
159: 
160:         try {
161:             const response = await fetch(`${API_BASE}/api/v1/gamification/award-badge`, {
162:                 method: 'POST',
163:                 headers: { 'Content-Type': 'application/json' },
164:                 body: JSON.stringify({ user_id: userId, badge_id: badgeId })
165:             });
166: 
167:             if (!response.ok) throw new Error('Failed to award badge');
168: 
169:             const result = await response.json();
170: 
171:             if (result.awarded) {
172:                 setNewBadges([badgeId]);
173:                 eventBus.emit('BADGES_EARNED' as any, { badges: [badgeId] });
174:                 await fetchProgress();
175:             }
176: 
177:             return result.awarded;
178:         } catch (err) {
179:             console.error('[useGamification] Award badge error:', err);
180:             return false;
181:         }
182:     }, [userId, fetchProgress]);
183: 
184:     // Get leaderboard
185:     const getLeaderboard = useCallback(async (limit: number = 10) => {
186:         try {
187:             const response = await fetch(`${API_BASE}/api/v1/gamification/leaderboard?limit=${limit}`);
188:             if (!response.ok) throw new Error('Failed to fetch leaderboard');
189:             return await response.json();
190:         } catch (err) {
191:             console.error('[useGamification] Leaderboard error:', err);
192:             return { leaderboard: [] };
193:         }
194:     }, []);
195: 
196:     // Feed virtual pet
197:     const feedPet = useCallback(async (): Promise<{ success: boolean; happiness: number; evolved?: boolean; stage?: string }> => {
198:         if (!userId) return { success: false, happiness: 0 };
199: 
200:         try {
201:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/feed`, {
202:                 method: 'POST',
203:                 headers: { 'Content-Type': 'application/json' },
204:                 body: JSON.stringify({ user_id: userId })
205:             });
206: 
207:             if (!response.ok) throw new Error('Failed to feed pet');
208: 
209:             const result = await response.json();
210: 
211:             // Trigger happy animation in AR
212:             eventBus.emit('AR_COMMAND' as any, {
213:                 type: 'TRIGGER_ANIMATION',
214:                 payload: { clip: 'happy', loop: false }
215:             });
216: 
217:             // Check for evolution
218:             if (result.evolved) {
219:                 eventBus.emit('PET_EVOLVED' as any, { stage: result.stage });
220:             }
221: 
222:             await fetchProgress();
223:             return { success: true, happiness: result.happiness, evolved: result.evolved, stage: result.stage };
224:         } catch (err) {
225:             console.error('[useGamification] Feed pet error:', err);
226:             return { success: false, happiness: 0 };
227:         }
228:     }, [userId, fetchProgress]);
229: 
230:     // Play with virtual pet
231:     const playPet = useCallback(async (): Promise<{ success: boolean; happiness: number; evolved?: boolean; stage?: string }> => {
232:         if (!userId) return { success: false, happiness: 0 };
233: 
234:         try {
235:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/play`, {
236:                 method: 'POST',
237:                 headers: { 'Content-Type': 'application/json' },
238:                 body: JSON.stringify({ user_id: userId })
239:             });
240: 
241:             if (!response.ok) throw new Error('Failed to play with pet');
242: 
243:             const result = await response.json();
244: 
245:             // Trigger play animation in AR
246:             eventBus.emit('AR_COMMAND' as any, {
247:                 type: 'TRIGGER_ANIMATION',
248:                 payload: { clip: 'play', loop: false }
249:             });
250: 
251:             // Check for evolution
252:             if (result.evolved) {
253:                 eventBus.emit('PET_EVOLVED' as any, { stage: result.stage });
254:             }
255: 
256:             await fetchProgress();
257:             return { success: true, happiness: result.happiness, evolved: result.evolved, stage: result.stage };
258:         } catch (err) {
259:             console.error('[useGamification] Play pet error:', err);
260:             return { success: false, happiness: 0 };
261:         }
262:     }, [userId, fetchProgress]);
263: 
264:     // Change pet outfit
265:     const changePetOutfit = useCallback(async (outfit: string): Promise<boolean> => {
266:         if (!userId) return false;
267: 
268:         try {
269:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/outfit`, {
270:                 method: 'POST',
271:                 headers: { 'Content-Type': 'application/json' },
272:                 body: JSON.stringify({ user_id: userId, outfit })
273:             });
274: 
275:             if (!response.ok) throw new Error('Failed to change outfit');
276: 
277:             await fetchProgress();
278:             return true;
279:         } catch (err) {
280:             console.error('[useGamification] Change outfit error:', err);
281:             return false;
282:         }
283:     }, [userId, fetchProgress]);
284: 
285:     // Collect sticker (earned from games/activities)
286:     const collectSticker = useCallback(async (stickerId: string): Promise<boolean> => {
287:         if (!userId) return false;
288: 
289:         try {
290:             const response = await fetch(`${API_BASE}/api/v1/gamification/stickers/collect`, {
291:                 method: 'POST',
292:                 headers: { 'Content-Type': 'application/json' },
293:                 body: JSON.stringify({ user_id: userId, sticker_id: stickerId })
294:             });
295: 
296:             if (!response.ok) throw new Error('Failed to collect sticker');
297: 
298:             const result = await response.json();
299: 
300:             if (result.collected) {
301:                 setNewSticker(result.sticker);
302:                 eventBus.emit('STICKER_COLLECTED' as any, { sticker: result.sticker });
303:                 setTimeout(() => setNewSticker(null), 3000);
304:                 await fetchProgress();
305:             }
306: 
307:             return result.collected;
308:         } catch (err) {
309:             console.error('[useGamification] Collect sticker error:', err);
310:             return false;
311:         }
312:     }, [userId, fetchProgress]);
313: 
314:     // Calculate XP percentage to next level
315:     const xpPercentage = progress
316:         ? Math.round((progress.total_xp / progress.xp_to_next_level) * 100)
317:         : 0;
318: 
319:     // Convenience methods for common actions (memoized to prevent stale closures)
320:     const trackFlashcardView = useCallback(() => addXP('flashcard_viewed'), [addXP]);
321:     const trackQuizComplete = useCallback(() => addXP('quiz_completed'), [addXP]);
322:     const trackGameComplete = useCallback(() => addXP('game_completed'), [addXP]);
323:     const trackPronunciationCorrect = useCallback(() => addXP('pronunciation_correct'), [addXP]);
324:     const trackComboDiscovered = useCallback(() => addXP('combo_discovered'), [addXP]);
325: 
326:     // Auto-fetch on mount
327:     useEffect(() => {
328:         if (userId) {
329:             fetchProgress();
330:         }
331:     }, [userId, fetchProgress]);
332: 
333:     // Listen for EventBus events - include memoized handlers in deps to prevent stale closures
334:     useEffect(() => {
335:         const handlePronunciationResult = (data: any) => {
336:             if (data.isCorrect) {
337:                 trackPronunciationCorrect();
338:             }
339:         };
340: 
341:         const handleComboActivated = () => {
342:             trackComboDiscovered();
343:         };
344: 
345:         eventBus.on('PRONUNCIATION_RESULT', handlePronunciationResult);
346:         eventBus.on('AR_COMBO_ACTIVATED', handleComboActivated);
347: 
348:         return () => {
349:             eventBus.off('PRONUNCIATION_RESULT', handlePronunciationResult);
350:             eventBus.off('AR_COMBO_ACTIVATED', handleComboActivated);
351:         };
352:     }, [trackPronunciationCorrect, trackComboDiscovered]);
353: 
354:     return {
355:         // State
356:         progress,
357:         isLoading,
358:         error,
359:         recentXP,
360:         levelUp,
361:         newBadges,
362:         newSticker,
363:         xpPercentage,
364: 
365:         // Pet & Stickers
366:         pet: progress?.pet,
367:         stickers: progress?.stickers || [],
368: 
369:         // Actions
370:         addXP,
371:         awardBadge,
372:         fetchProgress,
373:         getLeaderboard,
374:         feedPet,
375:         playPet,
376:         changePetOutfit,
377:         collectSticker,
378: 
379:         // Convenience
380:         trackFlashcardView,
381:         trackQuizComplete,
382:         trackGameComplete,
383:         trackPronunciationCorrect,
384:         trackComboDiscovered
385:     };
386: }
387: 
388: export default useGamification;
389: 
390: 

(End of file - total 390 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\hooks\\usePets.ts"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\usePets.ts</path>
<type>file</type>
<content>1: /**
2:  * usePets.ts
3:  * 
4:  * React hook for Pet companion system:
5:  * - Fetch all available pets with unlock status
6:  * - Unlock pets via XP, streak, or achievement
7:  * - Set/clear active pet
8:  * - Pet preferences and AR integration
9:  */
10: 
11: import { useState, useEffect, useCallback } from 'react';
12: import { getApiBase } from '@/config';
13: import { eventBus } from '@/runtime/EventBus';
14: 
15: const API_BASE = getApiBase();
16: 
17: // ========== TypeScript Interfaces ==========
18: 
19: export interface UnlockCondition {
20:     type: 'free' | 'xp' | 'streak' | 'achievement';
21:     value: number;
22: }
23: 
24: export interface Pet {
25:     pet_id: string;
26:     name: string;
27:     name_vi: string;
28:     model_url: string;
29:     thumbnail_url: string | null;
30:     category: string;
31:     pack_source: string;
32:     rarity: 'common' | 'rare' | 'epic' | 'legendary';
33:     color: string;
34:     animations: string[];
35:     unlock_condition: UnlockCondition;
36:     is_unlocked: boolean;
37:     is_active: boolean;
38:     can_unlock: boolean;
39: }
40: 
41: export interface PetStats {
42:     total: number;
43:     unlocked: number;
44:     common: number;
45:     rare: number;
46:     epic: number;
47:     legendary: number;
48: }
49: 
50: export interface PetListResponse {
51:     pets: Pet[];
52:     stats: PetStats;
53: }
54: 
55: export interface UnlockPetResponse {
56:     success: boolean;
57:     message: string;
58:     pet?: Pet;
59: }
60: 
61: export interface SetActivePetResponse {
62:     success: boolean;
63:     message: string;
64:     active_pet?: Pet;
65: }
66: 
67: // ========== Event Types ==========
68: 
69: export type PetEventType = 
70:     | 'PET_UNLOCKED'
71:     | 'PET_ACTIVATED'
72:     | 'PET_DEACTIVATED'
73:     | 'PET_LIST_UPDATED';
74: 
75: // ========== Hook ==========
76: 
77: export function usePets(userId: string | null) {
78:     const [pets, setPets] = useState<Pet[]>([]);
79:     const [activePet, setActivePetState] = useState<Pet | null>(null);
80:     const [stats, setStats] = useState<PetStats | null>(null);
81:     const [isLoading, setIsLoading] = useState(false);
82:     const [error, setError] = useState<string | null>(null);
83:     const [recentlyUnlocked, setRecentlyUnlocked] = useState<Pet | null>(null);
84: 
85:     // Fetch all pets with user's unlock status
86:     const fetchPets = useCallback(async () => {
87:         if (!userId) return;
88: 
89:         setIsLoading(true);
90:         setError(null);
91: 
92:         try {
93:             const response = await fetch(`${API_BASE}/api/pets?user_id=${userId}`);
94:             if (!response.ok) {
95:                 throw new Error('Failed to fetch pets');
96:             }
97: 
98:             const data: PetListResponse = await response.json();
99:             setPets(data.pets);
100:             setStats(data.stats);
101: 
102:             // Find and set active pet
103:             const active = data.pets.find(p => p.is_active);
104:             setActivePetState(active || null);
105: 
106:             eventBus.emit('PET_LIST_UPDATED' as any, { pets: data.pets, stats: data.stats });
107:         } catch (err) {
108:             const message = (err as Error).message;
109:             setError(message);
110:             console.error('[usePets] Fetch error:', err);
111:         } finally {
112:             setIsLoading(false);
113:         }
114:     }, [userId]);
115: 
116:     // Fetch current active pet
117:     const fetchActivePet = useCallback(async (): Promise<Pet | null> => {
118:         if (!userId) return null;
119: 
120:         try {
121:             const response = await fetch(`${API_BASE}/api/pets/active/current?user_id=${userId}`);
122:             
123:             if (response.status === 404) {
124:                 // No active pet
125:                 setActivePetState(null);
126:                 return null;
127:             }
128: 
129:             if (!response.ok) {
130:                 throw new Error('Failed to fetch active pet');
131:             }
132: 
133:             const pet: Pet = await response.json();
134:             setActivePetState(pet);
135:             return pet;
136:         } catch (err) {
137:             console.error('[usePets] Fetch active pet error:', err);
138:             return null;
139:         }
140:     }, [userId]);
141: 
142:     // Unlock a pet
143:     const unlockPet = useCallback(async (petId: string): Promise<UnlockPetResponse> => {
144:         if (!userId) {
145:             return { success: false, message: 'User not authenticated' };
146:         }
147: 
148:         try {
149:             const response = await fetch(`${API_BASE}/api/pets/${petId}/unlock?user_id=${userId}`, {
150:                 method: 'POST',
151:                 headers: { 'Content-Type': 'application/json' }
152:             });
153: 
154:             const result: UnlockPetResponse = await response.json();
155: 
156:             if (result.success && result.pet) {
157:                 // Update local state
158:                 setPets(prev => prev.map(p => 
159:                     p.pet_id === petId ? { ...p, is_unlocked: true, can_unlock: false } : p
160:                 ));
161: 
162:                 setRecentlyUnlocked(result.pet);
163:                 setTimeout(() => setRecentlyUnlocked(null), 3000);
164: 
165:                 // Emit event for UI celebrations
166:                 eventBus.emit('PET_UNLOCKED' as any, { pet: result.pet });
167: 
168:                 // Trigger AR celebration animation if active
169:                 eventBus.emit('AR_COMMAND' as any, {
170:                     type: 'TRIGGER_ANIMATION',
171:                     payload: { clip: 'celebrate', loop: false }
172:                 });
173:             }
174: 
175:             return result;
176:         } catch (err) {
177:             console.error('[usePets] Unlock pet error:', err);
178:             return { success: false, message: (err as Error).message };
179:         }
180:     }, [userId]);
181: 
182:     // Set active pet
183:     const setActivePet = useCallback(async (petId: string): Promise<SetActivePetResponse> => {
184:         if (!userId) {
185:             return { success: false, message: 'User not authenticated' };
186:         }
187: 
188:         try {
189:             const response = await fetch(`${API_BASE}/api/pets/active?user_id=${userId}`, {
190:                 method: 'PUT',
191:                 headers: { 'Content-Type': 'application/json' },
192:                 body: JSON.stringify({ pet_id: petId })
193:             });
194: 
195:             if (!response.ok) {
196:                 const errorData = await response.json();
197:                 throw new Error(errorData.detail || 'Failed to set active pet');
198:             }
199: 
200:             const result = await response.json();
201: 
202:             // Update local state
203:             setPets(prev => prev.map(p => ({
204:                 ...p,
205:                 is_active: p.pet_id === petId
206:             })));
207: 
208:             const newActivePet = pets.find(p => p.pet_id === petId) || null;
209:             setActivePetState(newActivePet);
210: 
211:             // Emit events
212:             eventBus.emit('PET_ACTIVATED' as any, { pet: newActivePet });
213: 
214:             // Load pet model in AR scene
215:             if (newActivePet) {
216:                 eventBus.emit('AR_COMMAND' as any, {
217:                     type: 'LOAD_PET_MODEL',
218:                     payload: { 
219:                         modelUrl: newActivePet.model_url,
220:                         petId: newActivePet.pet_id,
221:                         animations: newActivePet.animations
222:                     }
223:                 });
224:             }
225: 
226:             return { success: true, message: 'Pet activated', active_pet: newActivePet || undefined };
227:         } catch (err) {
228:             console.error('[usePets] Set active pet error:', err);
229:             return { success: false, message: (err as Error).message };
230:         }
231:     }, [userId, pets]);
232: 
233:     // Clear active pet
234:     const clearActivePet = useCallback(async (): Promise<boolean> => {
235:         if (!userId) return false;
236: 
237:         try {
238:             const response = await fetch(`${API_BASE}/api/pets/active?user_id=${userId}`, {
239:                 method: 'DELETE'
240:             });
241: 
242:             if (!response.ok) {
243:                 throw new Error('Failed to clear active pet');
244:             }
245: 
246:             // Update local state
247:             setPets(prev => prev.map(p => ({ ...p, is_active: false })));
248:             setActivePetState(null);
249: 
250:             // Emit events
251:             eventBus.emit('PET_DEACTIVATED' as any, {});
252: 
253:             // Remove pet from AR scene
254:             eventBus.emit('AR_COMMAND' as any, {
255:                 type: 'REMOVE_PET_MODEL',
256:                 payload: {}
257:             });
258: 
259:             return true;
260:         } catch (err) {
261:             console.error('[usePets] Clear active pet error:', err);
262:             return false;
263:         }
264:     }, [userId]);
265: 
266:     // Get pet by ID
267:     const getPetById = useCallback((petId: string): Pet | undefined => {
268:         return pets.find(p => p.pet_id === petId);
269:     }, [pets]);
270: 
271:     // Filter pets by category
272:     const getPetsByCategory = useCallback((category: string): Pet[] => {
273:         return pets.filter(p => p.category === category);
274:     }, [pets]);
275: 
276:     // Filter pets by rarity
277:     const getPetsByRarity = useCallback((rarity: Pet['rarity']): Pet[] => {
278:         return pets.filter(p => p.rarity === rarity);
279:     }, [pets]);
280: 
281:     // Get unlocked pets only
282:     const getUnlockedPets = useCallback((): Pet[] => {
283:         return pets.filter(p => p.is_unlocked);
284:     }, [pets]);
285: 
286:     // Get locked pets that can be unlocked
287:     const getUnlockablePets = useCallback((): Pet[] => {
288:         return pets.filter(p => !p.is_unlocked && p.can_unlock);
289:     }, [pets]);
290: 
291:     // Calculate unlock progress for a specific pet
292:     const getUnlockProgress = useCallback((pet: Pet, userXP: number, userStreak: number): number => {
293:         if (pet.is_unlocked) return 100;
294:         if (pet.unlock_condition.type === 'free') return 100;
295: 
296:         const { type, value } = pet.unlock_condition;
297: 
298:         switch (type) {
299:             case 'xp':
300:                 return Math.min(100, Math.round((userXP / value) * 100));
301:             case 'streak':
302:                 return Math.min(100, Math.round((userStreak / value) * 100));
303:             case 'achievement':
304:                 // Achievement checking would need additional data
305:                 return pet.can_unlock ? 100 : 0;
306:             default:
307:                 return 0;
308:         }
309:     }, []);
310: 
311:     // Auto-fetch on mount when userId is available
312:     useEffect(() => {
313:         if (userId) {
314:             fetchPets();
315:         }
316:     }, [userId, fetchPets]);
317: 
318:     // Listen for gamification events that might unlock pets
319:     useEffect(() => {
320:         const handleLevelUp = () => {
321:             // Refresh pets list to check for newly unlockable pets
322:             if (userId) fetchPets();
323:         };
324: 
325:         const handleStreakUpdate = () => {
326:             // Refresh pets list for streak-based unlocks
327:             if (userId) fetchPets();
328:         };
329: 
330:         eventBus.on('LEVEL_UP', handleLevelUp);
331:         eventBus.on('STREAK_UPDATED', handleStreakUpdate);
332: 
333:         return () => {
334:             eventBus.off('LEVEL_UP', handleLevelUp);
335:             eventBus.off('STREAK_UPDATED', handleStreakUpdate);
336:         };
337:     }, [userId, fetchPets]);
338: 
339:     return {
340:         // State
341:         pets,
342:         activePet,
343:         stats,
344:         isLoading,
345:         error,
346:         recentlyUnlocked,
347: 
348:         // Actions
349:         fetchPets,
350:         fetchActivePet,
351:         unlockPet,
352:         setActivePet,
353:         clearActivePet,
354: 
355:         // Helpers
356:         getPetById,
357:         getPetsByCategory,
358:         getPetsByRarity,
359:         getUnlockedPets,
360:         getUnlockablePets,
361:         getUnlockProgress
362:     };
363: }
364: 
365: export default usePets;
366: 

(End of file - total 366 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 11.3s)

Excellent! The code is already well-integrated. Looking at the current state:

## Current Status Analysis

### Already Implemented:
1. **`useGamification.ts`** (lines 124-154): Already emits events when XP is added:
   - `LEVEL_UP` event on level up (line 126)
   - `BADGES_EARNED` event (line 132)

2. **`usePets.ts`** (lines 319-337): Already listens for gamification events:
   - Listens to `LEVEL_UP` → refreshes pets list (line 320-322)
   - Listens to `STREAK_UPDATED` → refreshes pets list (line 325-327)

### What's Missing:
Per the implementation guide (lines 639-660), we need to add **proactive pet unlock checking** that shows a notification when a user gains enough XP to unlock a new pet. The current implementation:
- ✅ Refreshes pets on level up 
- ❌ Does NOT check for newly unlockable pets and show notifications

Let me check if there's a PetUnlockNotification or similar component that needs to be wired up:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "include": "*.tsx",
  "path": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src",
  "pattern": "PET_UNLOCKED|showPetUnlock"
}
```

**Output:**
```
No files found
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 35.4s)

# Continuation Summary: AR Flashcard App - Pet Feature Integration

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models. **Phases 1-4 are COMPLETE**. Now working on **Phase 5: Gamification Integration** - connecting pet unlock notifications to the XP system.

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **Gamification system already exists and is well-integrated:**
   - `useGamification.ts` hook handles XP tracking, badges, level-ups
   - Already emits `LEVEL_UP` event when user levels up (line 126)
   - Already emits `BADGES_EARNED` event (line 132)

3. **`usePets.ts` already listens for gamification events (lines 319-337):**
   - Listens to `LEVEL_UP` → refreshes pets list
   - Listens to `STREAK_UPDATED` → refreshes pets list
   - **BUT** does not proactively check for newly unlockable pets or show notifications

4. **What's missing per implementation guide (lines 639-660):**
   - Need to add `checkPetUnlocks(newXP)` function to `useGamification.ts`
   - This function should check if any pets became unlockable after XP gain
   - Should trigger `PetUnlockModal` to show celebration when pets become unlockable

5. **`PetUnlockModal.tsx` exists and is ready to use:**
   - Full celebration modal with confetti, 3D pet preview, rarity-based styling
   - Accepts `pet`, `isOpen`, `onClose`, `onSetActive` props
   - Has haptic and sound feedback built in

6. **Integration approach needed:**
   - Modify `useGamification.ts` to emit a `PET_CAN_UNLOCK` event when XP gain makes a pet unlockable
   - Or add state to track newly unlockable pets
   - Wire up `PetUnlockModal` in a global location (Layout or App) to show when pets become unlockable

## Accomplished

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend API | ✅ COMPLETE | Pet models, schemas, API router |
| Phase 2: Frontend Hook | ✅ COMPLETE | `usePets.ts` hook |
| Phase 3: Pet UI Components | ✅ COMPLETE | All 5 components + barrel export |
| Phase 4: Sidebar Integration | ✅ COMPLETE | Pet selector button + modal in Sidebar.tsx |
| Phase 5: Gamification Hook | 🔄 IN PROGRESS | Need to add pet unlock checking |

### What needs to be done:
1. **Add `checkPetUnlocks` to `useGamification.ts`** - Call after XP is added to check for newly unlockable pets
2. **Emit event or show modal** when a pet becomes unlockable for the first time
3. **Wire up `PetUnlockModal`** globally so it appears when the event fires
4. **Testing** - Verify the full flow works end-to-end

## Relevant Files / Directories

### Spec (READ THIS)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - see lines 636-660 for gamification hook
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
├── api/pets.py                            # ✅ Full Pet API router
├── api/gamification.py                    # Gamification API (XP, badges)
└── services/gamification_service.py       # XP logic and rewards
```

### Frontend - Pet Components (Phase 3 Complete)
```
frontend-web/src/components/pets/
├── PetCard.tsx                            # ✅ Individual pet cards
├── PetViewer3D.tsx                        # ✅ 3D model viewer
├── PetGrid.tsx                            # ✅ Grid with filters
├── PetUnlockModal.tsx                     # ✅ Celebration modal - READY TO WIRE UP
├── PetSelector.tsx                        # ✅ Main selector modal
└── index.ts                               # ✅ Barrel exports
```

### Frontend - Hooks (Key Files to Modify)
```
frontend-web/src/hooks/useGamification.ts  # 🔄 MODIFY - Add checkPetUnlocks function (lines 107-154)
frontend-web/src/hooks/usePets.ts          # ✅ Complete - Already listens to events (lines 319-337)
```

### Frontend - Integration Points
```
frontend-web/src/components/Sidebar.tsx    # ✅ Complete - Has PetSelector
frontend-web/src/runtime/EventBus.ts       # Event bus for cross-component communication
```

### Key Code Snippets:

**useGamification.ts addXP function (line 107-154)** - This is where `checkPetUnlocks` should be called after XP is added:
```typescript
const addXP = useCallback(async (action: XPAction, metadata?: Record<string, any>): Promise<XPResult | null> => {
    // ... existing code ...
    const result: XPResult = await response.json();
    // TODO: Add checkPetUnlocks(result.total_xp) here
    // ...
}, [userId, fetchProgress]);
```

**Implementation Guide spec (lines 639-660):**
```typescript
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
```

---

## User

---

## Assistant (Build · claude-opus-4.5 · 7.0s)

I have clear next steps from the continuation summary. Let me proceed with **Phase 5: Gamification Integration** - connecting pet unlock notifications to the XP system.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Add checkPetUnlocks function to useGamification.ts",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Create PET_CAN_UNLOCK event type in EventBus",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Wire up PetUnlockModal globally in App/Layout",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Test full flow end-to-end",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Add checkPetUnlocks function to useGamification.ts",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Create PET_CAN_UNLOCK event type in EventBus",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Wire up PetUnlockModal globally in App/Layout",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Test full flow end-to-end",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · claude-opus-4.5 · 5.0s)

Let me first check the current state of the EventBus and useGamification hook:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\runtime\\EventBus.ts"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\runtime\EventBus.ts</path>
<type>file</type>
<content>1: // src/runtime/EventBus.ts
2: import type { IEventBus } from '@/core/interfaces/IEventBus';
3: 
4: /**
5:  * EventBus Implementation - Singleton Pattern
6:  * Pub/sub system cho AR events
7:  */
8: class EventBus implements IEventBus {
9:   private listeners: Map<string, Set<Function>> = new Map();
10: 
11:   /**
12:    * Subscribe to an event
13:    */
14:   on<T>(event: string, callback: (data: T) => void): void {
15:     if (!this.listeners.has(event)) {
16:       this.listeners.set(event, new Set());
17:     }
18:     this.listeners.get(event)!.add(callback);
19:   }
20: 
21:   /**
22:    * Emit an event to all subscribers
23:    */
24:   emit<T>(event: string, data: T): void {
25:     const callbacks = this.listeners.get(event);
26:     if (callbacks) {
27:       callbacks.forEach(callback => {
28:         try {
29:           callback(data);
30:         } catch (error) {
31:           console.error(`Error in event listener for ${event}:`, error);
32:         }
33:       });
34:     }
35:   }
36: 
37:   /**
38:    * Unsubscribe from an event
39:    */
40:   off<T>(event: string, callback: (data: T) => void): void {
41:     const callbacks = this.listeners.get(event);
42:     if (callbacks) {
43:       callbacks.delete(callback);
44:       if (callbacks.size === 0) {
45:         this.listeners.delete(event);
46:       }
47:     }
48:   }
49: 
50:   /**
51:    * Subscribe to an event once (auto-unsubscribe after first call)
52:    */
53:   once<T>(event: string, callback: (data: T) => void): void {
54:     const onceWrapper = (data: T) => {
55:       callback(data);
56:       this.off(event, onceWrapper);
57:     };
58:     this.on(event, onceWrapper);
59:   }
60: 
61:   /**
62:    * Clear all listeners
63:    */
64:   clear(): void {
65:     this.listeners.clear();
66:   }
67: 
68:   /**
69:    * Get listener count for debugging
70:    */
71:   getListenerCount(event?: string): number {
72:     if (event) {
73:       return this.listeners.get(event)?.size || 0;
74:     }
75:     let total = 0;
76:     this.listeners.forEach(set => total += set.size);
77:     return total;
78:   }
79: }
80: 
81: /**
82:  * Export singleton instance
83:  */
84: export const eventBus = new EventBus();
85: 
86: /**
87:  * Export class for testing
88:  */
89: export { EventBus };

(End of file - total 89 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\hooks\\useGamification.ts"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\useGamification.ts</path>
<type>file</type>
<content>1: /**
2:  * useGamification.ts
3:  * 
4:  * React hook for gamification features:
5:  * - XP tracking
6:  * - Badge management  
7:  * - Streak tracking
8:  * - Level progression
9:  * - Virtual Pet
10:  * - Sticker Collection
11:  */
12: 
13: import { useState, useEffect, useCallback } from 'react';
14: import { getApiBase } from '@/config';
15: import { eventBus } from '@/runtime/EventBus';
16: 
17: const API_BASE = getApiBase();
18: 
19: export interface Badge {
20:     id: string;
21:     name: string;
22:     emoji: string;
23:     description?: string;
24:     earned_at?: string;
25: }
26: 
27: export interface VirtualPet {
28:     type: 'bunny' | 'panda' | 'dog' | 'cat';
29:     happiness: number; // 0-100
30:     last_fed: string;
31:     outfit?: string;
32: }
33: 
34: export interface Sticker {
35:     id: string;
36:     name: string;
37:     imageUrl: string;
38:     rarity: 'common' | 'rare' | 'epic' | 'legendary';
39:     earned_at: string;
40: }
41: 
42: export interface UserProgress {
43:     user_id: string;
44:     total_xp: number;
45:     level: number;
46:     xp_to_next_level: number;
47:     stars: number;
48:     current_streak: number;
49:     longest_streak: number;
50:     badges: Badge[];
51:     badge_count: number;
52:     pet?: VirtualPet;
53:     stickers?: Sticker[];
54: }
55: 
56: export interface XPResult {
57:     success: boolean;
58:     xp_added: number;
59:     total_xp: number;
60:     level: number;
61:     level_up: boolean;
62:     streak: number;
63:     badges_earned: string[];
64:     sticker_earned?: string;
65: }
66: 
67: type XPAction =
68:     | 'flashcard_viewed'
69:     | 'flashcard_3d_interaction'
70:     | 'quiz_question_correct'
71:     | 'quiz_completed'
72:     | 'game_completed'
73:     | 'pronunciation_correct'
74:     | 'combo_discovered'
75:     | 'daily_login';
76: 
77: export function useGamification(userId: string | null) {
78:     const [progress, setProgress] = useState<UserProgress | null>(null);
79:     const [isLoading, setIsLoading] = useState(false);
80:     const [error, setError] = useState<string | null>(null);
81:     const [recentXP, setRecentXP] = useState<{ amount: number; action: string } | null>(null);
82:     const [levelUp, setLevelUp] = useState(false);
83:     const [newBadges, setNewBadges] = useState<string[]>([]);
84:     const [newSticker, setNewSticker] = useState<Sticker | null>(null);
85: 
86:     // Fetch user progress
87:     const fetchProgress = useCallback(async () => {
88:         if (!userId) return;
89: 
90:         setIsLoading(true);
91:         try {
92:             const response = await fetch(`${API_BASE}/api/v1/gamification/user/${userId}`);
93:             if (!response.ok) throw new Error('Failed to fetch progress');
94: 
95:             const data = await response.json();
96:             setProgress(data);
97:             setError(null);
98:         } catch (err) {
99:             setError((err as Error).message);
100:             console.error('[useGamification] Fetch error:', err);
101:         } finally {
102:             setIsLoading(false);
103:         }
104:     }, [userId]);
105: 
106:     // Add XP for an action
107:     const addXP = useCallback(async (action: XPAction, metadata?: Record<string, any>): Promise<XPResult | null> => {
108:         if (!userId) return null;
109: 
110:         try {
111:             const response = await fetch(`${API_BASE}/api/v1/gamification/add-xp`, {
112:                 method: 'POST',
113:                 headers: { 'Content-Type': 'application/json' },
114:                 body: JSON.stringify({ user_id: userId, action, metadata })
115:             });
116: 
117:             if (!response.ok) throw new Error('Failed to add XP');
118: 
119:             const result: XPResult = await response.json();
120: 
121:             // Update local state
122:             setRecentXP({ amount: result.xp_added, action });
123: 
124:             if (result.level_up) {
125:                 setLevelUp(true);
126:                 eventBus.emit('LEVEL_UP' as any, { level: result.level });
127:                 setTimeout(() => setLevelUp(false), 3000);
128:             }
129: 
130:             if (result.badges_earned.length > 0) {
131:                 setNewBadges(result.badges_earned);
132:                 eventBus.emit('BADGES_EARNED' as any, { badges: result.badges_earned });
133:                 setTimeout(() => setNewBadges([]), 3000);
134:             }
135: 
136:             // Handle auto-awarded sticker
137:             if (result.sticker_earned) {
138:                 const stickerObj: Sticker = typeof result.sticker_earned === 'string'
139:                     ? { id: result.sticker_earned, name: result.sticker_earned, imageUrl: '', rarity: 'common', earned_at: new Date().toISOString() }
140:                     : result.sticker_earned;
141:                 setNewSticker(stickerObj);
142:                 eventBus.emit('STICKER_COLLECTED' as any, { sticker: stickerObj });
143:                 setTimeout(() => setNewSticker(null), 3000);
144:             }
145: 
146:             // Refresh progress
147:             await fetchProgress();
148: 
149:             return result;
150:         } catch (err) {
151:             console.error('[useGamification] Add XP error:', err);
152:             return null;
153:         }
154:     }, [userId, fetchProgress]);
155: 
156:     // Award a badge manually
157:     const awardBadge = useCallback(async (badgeId: string): Promise<boolean> => {
158:         if (!userId) return false;
159: 
160:         try {
161:             const response = await fetch(`${API_BASE}/api/v1/gamification/award-badge`, {
162:                 method: 'POST',
163:                 headers: { 'Content-Type': 'application/json' },
164:                 body: JSON.stringify({ user_id: userId, badge_id: badgeId })
165:             });
166: 
167:             if (!response.ok) throw new Error('Failed to award badge');
168: 
169:             const result = await response.json();
170: 
171:             if (result.awarded) {
172:                 setNewBadges([badgeId]);
173:                 eventBus.emit('BADGES_EARNED' as any, { badges: [badgeId] });
174:                 await fetchProgress();
175:             }
176: 
177:             return result.awarded;
178:         } catch (err) {
179:             console.error('[useGamification] Award badge error:', err);
180:             return false;
181:         }
182:     }, [userId, fetchProgress]);
183: 
184:     // Get leaderboard
185:     const getLeaderboard = useCallback(async (limit: number = 10) => {
186:         try {
187:             const response = await fetch(`${API_BASE}/api/v1/gamification/leaderboard?limit=${limit}`);
188:             if (!response.ok) throw new Error('Failed to fetch leaderboard');
189:             return await response.json();
190:         } catch (err) {
191:             console.error('[useGamification] Leaderboard error:', err);
192:             return { leaderboard: [] };
193:         }
194:     }, []);
195: 
196:     // Feed virtual pet
197:     const feedPet = useCallback(async (): Promise<{ success: boolean; happiness: number; evolved?: boolean; stage?: string }> => {
198:         if (!userId) return { success: false, happiness: 0 };
199: 
200:         try {
201:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/feed`, {
202:                 method: 'POST',
203:                 headers: { 'Content-Type': 'application/json' },
204:                 body: JSON.stringify({ user_id: userId })
205:             });
206: 
207:             if (!response.ok) throw new Error('Failed to feed pet');
208: 
209:             const result = await response.json();
210: 
211:             // Trigger happy animation in AR
212:             eventBus.emit('AR_COMMAND' as any, {
213:                 type: 'TRIGGER_ANIMATION',
214:                 payload: { clip: 'happy', loop: false }
215:             });
216: 
217:             // Check for evolution
218:             if (result.evolved) {
219:                 eventBus.emit('PET_EVOLVED' as any, { stage: result.stage });
220:             }
221: 
222:             await fetchProgress();
223:             return { success: true, happiness: result.happiness, evolved: result.evolved, stage: result.stage };
224:         } catch (err) {
225:             console.error('[useGamification] Feed pet error:', err);
226:             return { success: false, happiness: 0 };
227:         }
228:     }, [userId, fetchProgress]);
229: 
230:     // Play with virtual pet
231:     const playPet = useCallback(async (): Promise<{ success: boolean; happiness: number; evolved?: boolean; stage?: string }> => {
232:         if (!userId) return { success: false, happiness: 0 };
233: 
234:         try {
235:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/play`, {
236:                 method: 'POST',
237:                 headers: { 'Content-Type': 'application/json' },
238:                 body: JSON.stringify({ user_id: userId })
239:             });
240: 
241:             if (!response.ok) throw new Error('Failed to play with pet');
242: 
243:             const result = await response.json();
244: 
245:             // Trigger play animation in AR
246:             eventBus.emit('AR_COMMAND' as any, {
247:                 type: 'TRIGGER_ANIMATION',
248:                 payload: { clip: 'play', loop: false }
249:             });
250: 
251:             // Check for evolution
252:             if (result.evolved) {
253:                 eventBus.emit('PET_EVOLVED' as any, { stage: result.stage });
254:             }
255: 
256:             await fetchProgress();
257:             return { success: true, happiness: result.happiness, evolved: result.evolved, stage: result.stage };
258:         } catch (err) {
259:             console.error('[useGamification] Play pet error:', err);
260:             return { success: false, happiness: 0 };
261:         }
262:     }, [userId, fetchProgress]);
263: 
264:     // Change pet outfit
265:     const changePetOutfit = useCallback(async (outfit: string): Promise<boolean> => {
266:         if (!userId) return false;
267: 
268:         try {
269:             const response = await fetch(`${API_BASE}/api/v1/gamification/pet/outfit`, {
270:                 method: 'POST',
271:                 headers: { 'Content-Type': 'application/json' },
272:                 body: JSON.stringify({ user_id: userId, outfit })
273:             });
274: 
275:             if (!response.ok) throw new Error('Failed to change outfit');
276: 
277:             await fetchProgress();
278:             return true;
279:         } catch (err) {
280:             console.error('[useGamification] Change outfit error:', err);
281:             return false;
282:         }
283:     }, [userId, fetchProgress]);
284: 
285:     // Collect sticker (earned from games/activities)
286:     const collectSticker = useCallback(async (stickerId: string): Promise<boolean> => {
287:         if (!userId) return false;
288: 
289:         try {
290:             const response = await fetch(`${API_BASE}/api/v1/gamification/stickers/collect`, {
291:                 method: 'POST',
292:                 headers: { 'Content-Type': 'application/json' },
293:                 body: JSON.stringify({ user_id: userId, sticker_id: stickerId })
294:             });
295: 
296:             if (!response.ok) throw new Error('Failed to collect sticker');
297: 
298:             const result = await response.json();
299: 
300:             if (result.collected) {
301:                 setNewSticker(result.sticker);
302:                 eventBus.emit('STICKER_COLLECTED' as any, { sticker: result.sticker });
303:                 setTimeout(() => setNewSticker(null), 3000);
304:                 await fetchProgress();
305:             }
306: 
307:             return result.collected;
308:         } catch (err) {
309:             console.error('[useGamification] Collect sticker error:', err);
310:             return false;
311:         }
312:     }, [userId, fetchProgress]);
313: 
314:     // Calculate XP percentage to next level
315:     const xpPercentage = progress
316:         ? Math.round((progress.total_xp / progress.xp_to_next_level) * 100)
317:         : 0;
318: 
319:     // Convenience methods for common actions (memoized to prevent stale closures)
320:     const trackFlashcardView = useCallback(() => addXP('flashcard_viewed'), [addXP]);
321:     const trackQuizComplete = useCallback(() => addXP('quiz_completed'), [addXP]);
322:     const trackGameComplete = useCallback(() => addXP('game_completed'), [addXP]);
323:     const trackPronunciationCorrect = useCallback(() => addXP('pronunciation_correct'), [addXP]);
324:     const trackComboDiscovered = useCallback(() => addXP('combo_discovered'), [addXP]);
325: 
326:     // Auto-fetch on mount
327:     useEffect(() => {
328:         if (userId) {
329:             fetchProgress();
330:         }
331:     }, [userId, fetchProgress]);
332: 
333:     // Listen for EventBus events - include memoized handlers in deps to prevent stale closures
334:     useEffect(() => {
335:         const handlePronunciationResult = (data: any) => {
336:             if (data.isCorrect) {
337:                 trackPronunciationCorrect();
338:             }
339:         };
340: 
341:         const handleComboActivated = () => {
342:             trackComboDiscovered();
343:         };
344: 
345:         eventBus.on('PRONUNCIATION_RESULT', handlePronunciationResult);
346:         eventBus.on('AR_COMBO_ACTIVATED', handleComboActivated);
347: 
348:         return () => {
349:             eventBus.off('PRONUNCIATION_RESULT', handlePronunciationResult);
350:             eventBus.off('AR_COMBO_ACTIVATED', handleComboActivated);
351:         };
352:     }, [trackPronunciationCorrect, trackComboDiscovered]);
353: 
354:     return {
355:         // State
356:         progress,
357:         isLoading,
358:         error,
359:         recentXP,
360:         levelUp,
361:         newBadges,
362:         newSticker,
363:         xpPercentage,
364: 
365:         // Pet & Stickers
366:         pet: progress?.pet,
367:         stickers: progress?.stickers || [],
368: 
369:         // Actions
370:         addXP,
371:         awardBadge,
372:         fetchProgress,
373:         getLeaderboard,
374:         feedPet,
375:         playPet,
376:         changePetOutfit,
377:         collectSticker,
378: 
379:         // Convenience
380:         trackFlashcardView,
381:         trackQuizComplete,
382:         trackGameComplete,
383:         trackPronunciationCorrect,
384:         trackComboDiscovered
385:     };
386: }
387: 
388: export default useGamification;
389: 
390: 

(End of file - total 390 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.0s)

Now let me check the existing `usePets.ts` to understand the Pet types and API:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\hooks\\usePets.ts"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\hooks\usePets.ts</path>
<type>file</type>
<content>1: /**
2:  * usePets.ts
3:  * 
4:  * React hook for Pet companion system:
5:  * - Fetch all available pets with unlock status
6:  * - Unlock pets via XP, streak, or achievement
7:  * - Set/clear active pet
8:  * - Pet preferences and AR integration
9:  */
10: 
11: import { useState, useEffect, useCallback } from 'react';
12: import { getApiBase } from '@/config';
13: import { eventBus } from '@/runtime/EventBus';
14: 
15: const API_BASE = getApiBase();
16: 
17: // ========== TypeScript Interfaces ==========
18: 
19: export interface UnlockCondition {
20:     type: 'free' | 'xp' | 'streak' | 'achievement';
21:     value: number;
22: }
23: 
24: export interface Pet {
25:     pet_id: string;
26:     name: string;
27:     name_vi: string;
28:     model_url: string;
29:     thumbnail_url: string | null;
30:     category: string;
31:     pack_source: string;
32:     rarity: 'common' | 'rare' | 'epic' | 'legendary';
33:     color: string;
34:     animations: string[];
35:     unlock_condition: UnlockCondition;
36:     is_unlocked: boolean;
37:     is_active: boolean;
38:     can_unlock: boolean;
39: }
40: 
41: export interface PetStats {
42:     total: number;
43:     unlocked: number;
44:     common: number;
45:     rare: number;
46:     epic: number;
47:     legendary: number;
48: }
49: 
50: export interface PetListResponse {
51:     pets: Pet[];
52:     stats: PetStats;
53: }
54: 
55: export interface UnlockPetResponse {
56:     success: boolean;
57:     message: string;
58:     pet?: Pet;
59: }
60: 
61: export interface SetActivePetResponse {
62:     success: boolean;
63:     message: string;
64:     active_pet?: Pet;
65: }
66: 
67: // ========== Event Types ==========
68: 
69: export type PetEventType = 
70:     | 'PET_UNLOCKED'
71:     | 'PET_ACTIVATED'
72:     | 'PET_DEACTIVATED'
73:     | 'PET_LIST_UPDATED';
74: 
75: // ========== Hook ==========
76: 
77: export function usePets(userId: string | null) {
78:     const [pets, setPets] = useState<Pet[]>([]);
79:     const [activePet, setActivePetState] = useState<Pet | null>(null);
80:     const [stats, setStats] = useState<PetStats | null>(null);
81:     const [isLoading, setIsLoading] = useState(false);
82:     const [error, setError] = useState<string | null>(null);
83:     const [recentlyUnlocked, setRecentlyUnlocked] = useState<Pet | null>(null);
84: 
85:     // Fetch all pets with user's unlock status
86:     const fetchPets = useCallback(async () => {
87:         if (!userId) return;
88: 
89:         setIsLoading(true);
90:         setError(null);
91: 
92:         try {
93:             const response = await fetch(`${API_BASE}/api/pets?user_id=${userId}`);
94:             if (!response.ok) {
95:                 throw new Error('Failed to fetch pets');
96:             }
97: 
98:             const data: PetListResponse = await response.json();
99:             setPets(data.pets);
100:             setStats(data.stats);
101: 
102:             // Find and set active pet
103:             const active = data.pets.find(p => p.is_active);
104:             setActivePetState(active || null);
105: 
106:             eventBus.emit('PET_LIST_UPDATED' as any, { pets: data.pets, stats: data.stats });
107:         } catch (err) {
108:             const message = (err as Error).message;
109:             setError(message);
110:             console.error('[usePets] Fetch error:', err);
111:         } finally {
112:             setIsLoading(false);
113:         }
114:     }, [userId]);
115: 
116:     // Fetch current active pet
117:     const fetchActivePet = useCallback(async (): Promise<Pet | null> => {
118:         if (!userId) return null;
119: 
120:         try {
121:             const response = await fetch(`${API_BASE}/api/pets/active/current?user_id=${userId}`);
122:             
123:             if (response.status === 404) {
124:                 // No active pet
125:                 setActivePetState(null);
126:                 return null;
127:             }
128: 
129:             if (!response.ok) {
130:                 throw new Error('Failed to fetch active pet');
131:             }
132: 
133:             const pet: Pet = await response.json();
134:             setActivePetState(pet);
135:             return pet;
136:         } catch (err) {
137:             console.error('[usePets] Fetch active pet error:', err);
138:             return null;
139:         }
140:     }, [userId]);
141: 
142:     // Unlock a pet
143:     const unlockPet = useCallback(async (petId: string): Promise<UnlockPetResponse> => {
144:         if (!userId) {
145:             return { success: false, message: 'User not authenticated' };
146:         }
147: 
148:         try {
149:             const response = await fetch(`${API_BASE}/api/pets/${petId}/unlock?user_id=${userId}`, {
150:                 method: 'POST',
151:                 headers: { 'Content-Type': 'application/json' }
152:             });
153: 
154:             const result: UnlockPetResponse = await response.json();
155: 
156:             if (result.success && result.pet) {
157:                 // Update local state
158:                 setPets(prev => prev.map(p => 
159:                     p.pet_id === petId ? { ...p, is_unlocked: true, can_unlock: false } : p
160:                 ));
161: 
162:                 setRecentlyUnlocked(result.pet);
163:                 setTimeout(() => setRecentlyUnlocked(null), 3000);
164: 
165:                 // Emit event for UI celebrations
166:                 eventBus.emit('PET_UNLOCKED' as any, { pet: result.pet });
167: 
168:                 // Trigger AR celebration animation if active
169:                 eventBus.emit('AR_COMMAND' as any, {
170:                     type: 'TRIGGER_ANIMATION',
171:                     payload: { clip: 'celebrate', loop: false }
172:                 });
173:             }
174: 
175:             return result;
176:         } catch (err) {
177:             console.error('[usePets] Unlock pet error:', err);
178:             return { success: false, message: (err as Error).message };
179:         }
180:     }, [userId]);
181: 
182:     // Set active pet
183:     const setActivePet = useCallback(async (petId: string): Promise<SetActivePetResponse> => {
184:         if (!userId) {
185:             return { success: false, message: 'User not authenticated' };
186:         }
187: 
188:         try {
189:             const response = await fetch(`${API_BASE}/api/pets/active?user_id=${userId}`, {
190:                 method: 'PUT',
191:                 headers: { 'Content-Type': 'application/json' },
192:                 body: JSON.stringify({ pet_id: petId })
193:             });
194: 
195:             if (!response.ok) {
196:                 const errorData = await response.json();
197:                 throw new Error(errorData.detail || 'Failed to set active pet');
198:             }
199: 
200:             const result = await response.json();
201: 
202:             // Update local state
203:             setPets(prev => prev.map(p => ({
204:                 ...p,
205:                 is_active: p.pet_id === petId
206:             })));
207: 
208:             const newActivePet = pets.find(p => p.pet_id === petId) || null;
209:             setActivePetState(newActivePet);
210: 
211:             // Emit events
212:             eventBus.emit('PET_ACTIVATED' as any, { pet: newActivePet });
213: 
214:             // Load pet model in AR scene
215:             if (newActivePet) {
216:                 eventBus.emit('AR_COMMAND' as any, {
217:                     type: 'LOAD_PET_MODEL',
218:                     payload: { 
219:                         modelUrl: newActivePet.model_url,
220:                         petId: newActivePet.pet_id,
221:                         animations: newActivePet.animations
222:                     }
223:                 });
224:             }
225: 
226:             return { success: true, message: 'Pet activated', active_pet: newActivePet || undefined };
227:         } catch (err) {
228:             console.error('[usePets] Set active pet error:', err);
229:             return { success: false, message: (err as Error).message };
230:         }
231:     }, [userId, pets]);
232: 
233:     // Clear active pet
234:     const clearActivePet = useCallback(async (): Promise<boolean> => {
235:         if (!userId) return false;
236: 
237:         try {
238:             const response = await fetch(`${API_BASE}/api/pets/active?user_id=${userId}`, {
239:                 method: 'DELETE'
240:             });
241: 
242:             if (!response.ok) {
243:                 throw new Error('Failed to clear active pet');
244:             }
245: 
246:             // Update local state
247:             setPets(prev => prev.map(p => ({ ...p, is_active: false })));
248:             setActivePetState(null);
249: 
250:             // Emit events
251:             eventBus.emit('PET_DEACTIVATED' as any, {});
252: 
253:             // Remove pet from AR scene
254:             eventBus.emit('AR_COMMAND' as any, {
255:                 type: 'REMOVE_PET_MODEL',
256:                 payload: {}
257:             });
258: 
259:             return true;
260:         } catch (err) {
261:             console.error('[usePets] Clear active pet error:', err);
262:             return false;
263:         }
264:     }, [userId]);
265: 
266:     // Get pet by ID
267:     const getPetById = useCallback((petId: string): Pet | undefined => {
268:         return pets.find(p => p.pet_id === petId);
269:     }, [pets]);
270: 
271:     // Filter pets by category
272:     const getPetsByCategory = useCallback((category: string): Pet[] => {
273:         return pets.filter(p => p.category === category);
274:     }, [pets]);
275: 
276:     // Filter pets by rarity
277:     const getPetsByRarity = useCallback((rarity: Pet['rarity']): Pet[] => {
278:         return pets.filter(p => p.rarity === rarity);
279:     }, [pets]);
280: 
281:     // Get unlocked pets only
282:     const getUnlockedPets = useCallback((): Pet[] => {
283:         return pets.filter(p => p.is_unlocked);
284:     }, [pets]);
285: 
286:     // Get locked pets that can be unlocked
287:     const getUnlockablePets = useCallback((): Pet[] => {
288:         return pets.filter(p => !p.is_unlocked && p.can_unlock);
289:     }, [pets]);
290: 
291:     // Calculate unlock progress for a specific pet
292:     const getUnlockProgress = useCallback((pet: Pet, userXP: number, userStreak: number): number => {
293:         if (pet.is_unlocked) return 100;
294:         if (pet.unlock_condition.type === 'free') return 100;
295: 
296:         const { type, value } = pet.unlock_condition;
297: 
298:         switch (type) {
299:             case 'xp':
300:                 return Math.min(100, Math.round((userXP / value) * 100));
301:             case 'streak':
302:                 return Math.min(100, Math.round((userStreak / value) * 100));
303:             case 'achievement':
304:                 // Achievement checking would need additional data
305:                 return pet.can_unlock ? 100 : 0;
306:             default:
307:                 return 0;
308:         }
309:     }, []);
310: 
311:     // Auto-fetch on mount when userId is available
312:     useEffect(() => {
313:         if (userId) {
314:             fetchPets();
315:         }
316:     }, [userId, fetchPets]);
317: 
318:     // Listen for gamification events that might unlock pets
319:     useEffect(() => {
320:         const handleLevelUp = () => {
321:             // Refresh pets list to check for newly unlockable pets
322:             if (userId) fetchPets();
323:         };
324: 
325:         const handleStreakUpdate = () => {
326:             // Refresh pets list for streak-based unlocks
327:             if (userId) fetchPets();
328:         };
329: 
330:         eventBus.on('LEVEL_UP', handleLevelUp);
331:         eventBus.on('STREAK_UPDATED', handleStreakUpdate);
332: 
333:         return () => {
334:             eventBus.off('LEVEL_UP', handleLevelUp);
335:             eventBus.off('STREAK_UPDATED', handleStreakUpdate);
336:         };
337:     }, [userId, fetchPets]);
338: 
339:     return {
340:         // State
341:         pets,
342:         activePet,
343:         stats,
344:         isLoading,
345:         error,
346:         recentlyUnlocked,
347: 
348:         // Actions
349:         fetchPets,
350:         fetchActivePet,
351:         unlockPet,
352:         setActivePet,
353:         clearActivePet,
354: 
355:         // Helpers
356:         getPetById,
357:         getPetsByCategory,
358:         getPetsByRarity,
359:         getUnlockedPets,
360:         getUnlockablePets,
361:         getUnlockProgress
362:     };
363: }
364: 
365: export default usePets;
366: 

(End of file - total 366 lines)
</content>
```

---

## Assistant (Build · claude-opus-4.5 · 5.2s)

Now I understand the full picture. Let me also check the `PetUnlockModal` to understand its props:

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Daniel Project\\Graduted Project\\Edu-platform\\frontend-web\\src\\components\\pets\\PetUnlockModal.tsx"
}
```

**Output:**
```
<path>E:\Daniel Project\Graduted Project\Edu-platform\frontend-web\src\components\pets\PetUnlockModal.tsx</path>
<type>file</type>
<content>1: /**
2:  * PetUnlockModal.tsx
3:  * 
4:  * Celebration modal for when a pet is unlocked
5:  * Features:
6:  * - Confetti animation (falling emojis like RewardCelebration.tsx)
7:  * - 3D pet preview using PetViewer3DCompact
8:  * - Rarity-based styling and gradients
9:  * - "Set as Active" button option
10:  * - Auto-dismiss with manual close option
11:  * - Kid-friendly styling with playful animations
12:  * - Haptic and sound feedback on mount
13:  */
14: 
15: import React, { useEffect, useState, useCallback } from 'react';
16: import { HapticService } from '@/services/HapticService';
17: import { SoundEffectService } from '@/services/SoundEffectService';
18: import { Pet } from '@/hooks/usePets';
19: import { rarityConfig } from './PetCard';
20: import { PetViewer3DCompact } from './PetViewer3D';
21: 
22: // ========== Props Interface ==========
23: 
24: export interface PetUnlockModalProps {
25:     /** The pet that was unlocked */
26:     pet: Pet;
27:     /** Whether the modal is open */
28:     isOpen: boolean;
29:     /** Called when modal should close */
30:     onClose: () => void;
31:     /** Called when user wants to set this pet as active */
32:     onSetActive?: (petId: string) => void;
33:     /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
34:     autoDismissMs?: number;
35: }
36: 
37: // ========== Confetti Configuration ==========
38: 
39: const UNLOCK_CONFETTI = ['🎉', '✨', '🌟', '⭐', '💫', '🎊', '🐾', '💖'];
40: 
41: const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
42:     common: ['🎉', '✨', '⭐', '🐾', '💚'],
43:     rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
44:     epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
45:     legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
46: };
47: 
48: // ========== Component ==========
49: 
50: export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
51:     pet,
52:     isOpen,
53:     onClose,
54:     onSetActive,
55:     autoDismissMs = 8000,
56: }) => {
57:     const [isVisible, setIsVisible] = useState(false);
58:     const [confettiPieces, setConfettiPieces] = useState<
59:         { id: number; emoji: string; left: string; delay: string; size: string }[]
60:     >([]);
61: 
62:     const config = rarityConfig[pet.rarity];
63: 
64:     // Generate confetti based on pet rarity
65:     const generateConfetti = useCallback(() => {
66:         const rarityConfetti = RARITY_CONFETTI[pet.rarity];
67:         const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];
68: 
69:         // Generate 35 confetti pieces for more celebration
70:         for (let i = 0; i < 35; i++) {
71:             pieces.push({
72:                 id: i,
73:                 emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
74:                 left: `${Math.random() * 100}%`,
75:                 delay: `${Math.random() * 2.5}s`,
76:                 size: `${1 + Math.random() * 1.5}rem`,
77:             });
78:         }
79: 
80:         setConfettiPieces(pieces);
81:     }, [pet.rarity]);
82: 
83:     // Show modal with effects
84:     useEffect(() => {
85:         if (isOpen) {
86:             setIsVisible(true);
87:             generateConfetti();
88: 
89:             // Haptic + Sound feedback
90:             HapticService.levelUp();
91:             SoundEffectService.play('unlock');
92: 
93:             // Auto-dismiss after timeout
94:             if (autoDismissMs > 0) {
95:                 const timer = setTimeout(() => {
96:                     handleDismiss();
97:                 }, autoDismissMs);
98: 
99:                 return () => clearTimeout(timer);
100:             }
101:         } else {
102:             setIsVisible(false);
103:         }
104:     }, [isOpen, generateConfetti, autoDismissMs]);
105: 
106:     // Handle dismiss
107:     const handleDismiss = useCallback(() => {
108:         HapticService.tap();
109:         setIsVisible(false);
110:         
111:         // Wait for fade animation
112:         setTimeout(() => {
113:             onClose();
114:         }, 300);
115:     }, [onClose]);
116: 
117:     // Handle set as active
118:     const handleSetActive = useCallback(() => {
119:         HapticService.success();
120:         SoundEffectService.play('success');
121:         onSetActive?.(pet.pet_id);
122:         handleDismiss();
123:     }, [pet.pet_id, onSetActive, handleDismiss]);
124: 
125:     if (!isOpen) return null;
126: 
127:     return (
128:         <div
129:             className="fixed inset-0 flex items-center justify-center z-[100020]"
130:             style={{
131:                 background: 'rgba(0,0,0,0.85)',
132:                 opacity: isVisible ? 1 : 0,
133:                 transition: 'opacity 0.3s ease-out',
134:                 pointerEvents: isVisible ? 'auto' : 'none',
135:             }}
136:             onClick={handleDismiss}
137:         >
138:             {/* Confetti Layer */}
139:             <div className="absolute inset-0 overflow-hidden pointer-events-none">
140:                 {confettiPieces.map((piece) => (
141:                     <div
142:                         key={piece.id}
143:                         className="absolute animate-pet-unlock-confetti"
144:                         style={{
145:                             left: piece.left,
146:                             top: '-60px',
147:                             fontSize: piece.size,
148:                             animationDelay: piece.delay,
149:                         }}
150:                     >
151:                         {piece.emoji}
152:                     </div>
153:                 ))}
154:             </div>
155: 
156:             {/* Sparkle burst around the card */}
157:             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
158:                 <div className="relative">
159:                     {[...Array(8)].map((_, i) => (
160:                         <span
161:                             key={i}
162:                             className="absolute text-3xl animate-sparkle-burst"
163:                             style={{
164:                                 transform: `rotate(${i * 45}deg) translateY(-120px)`,
165:                                 animationDelay: `${i * 0.1}s`,
166:                             }}
167:                         >
168:                             ✨
169:                         </span>
170:                     ))}
171:                 </div>
172:             </div>
173: 
174:             {/* Main Modal Card */}
175:             <div
176:                 className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
177:                 style={{
178:                     background: config.gradientStyle,
179:                     border: '4px solid #fff',
180:                     boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
181:                 }}
182:                 onClick={(e) => e.stopPropagation()}
183:             >
184:                 {/* Trophy/Unlock Header */}
185:                 <div className="relative mb-4">
186:                     <div
187:                         className="inline-block animate-bounce"
188:                         style={{ fontSize: '56px' }}
189:                     >
190:                         🎉
191:                     </div>
192:                     
193:                     {/* Sparkle effects around header */}
194:                     <span
195:                         className="absolute text-xl animate-ping"
196:                         style={{ top: '0', left: '20%' }}
197:                     >
198:                         ✨
199:                     </span>
200:                     <span
201:                         className="absolute text-xl animate-ping"
202:                         style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
203:                     >
204:                         ✨
205:                     </span>
206:                 </div>
207: 
208:                 {/* Title */}
209:                 <h2
210:                     className="text-2xl font-black text-white drop-shadow-lg mb-1"
211:                     style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
212:                 >
213:                     NEW PET UNLOCKED!
214:                 </h2>
215: 
216:                 {/* Rarity Badge */}
217:                 <div
218:                     className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
219:                     style={{
220:                         background: 'rgba(255,255,255,0.2)',
221:                         border: '2px solid rgba(255,255,255,0.3)',
222:                     }}
223:                 >
224:                     <span className="text-lg">{config.badge}</span>
225:                     <span className="text-white font-bold uppercase text-sm tracking-wide">
226:                         {pet.rarity}
227:                     </span>
228:                 </div>
229: 
230:                 {/* 3D Pet Preview */}
231:                 <div
232:                     className="mx-auto mb-4 rounded-2xl overflow-hidden"
233:                     style={{
234:                         width: '160px',
235:                         height: '160px',
236:                         background: 'rgba(255,255,255,0.15)',
237:                         border: '3px solid rgba(255,255,255,0.3)',
238:                         boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
239:                     }}
240:                 >
241:                     <PetViewer3DCompact
242:                         modelUrl={pet.model_url}
243:                         size={154}
244:                         scale={1.8}
245:                     />
246:                 </div>
247: 
248:                 {/* Pet Name */}
249:                 <div className="mb-4">
250:                     <h3
251:                         className="text-xl font-bold text-white"
252:                         style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
253:                     >
254:                         {pet.name}
255:                     </h3>
256:                     <p className="text-white/80 text-sm">
257:                         {pet.name_vi}
258:                     </p>
259:                 </div>
260: 
261:                 {/* Action Buttons */}
262:                 <div className="space-y-3">
263:                     {onSetActive && (
264:                         <button
265:                             className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
266:                             style={{
267:                                 background: 'rgba(255,255,255,0.95)',
268:                                 color: '#059669',
269:                                 boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
270:                             }}
271:                             onClick={handleSetActive}
272:                         >
273:                             <span className="mr-2">🐾</span>
274:                             Set as My Pet!
275:                         </button>
276:                     )}
277: 
278:                     <button
279:                         className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
280:                         style={{
281:                             background: 'rgba(255,255,255,0.1)',
282:                             color: 'white',
283:                             border: '2px solid rgba(255,255,255,0.3)',
284:                         }}
285:                         onClick={handleDismiss}
286:                     >
287:                         Continue
288:                     </button>
289:                 </div>
290: 
291:                 {/* Tap to dismiss hint */}
292:                 <p className="text-white/50 text-xs mt-4">
293:                     Tap outside to close
294:                 </p>
295: 
296:                 {/* Legendary shimmer effect */}
297:                 {pet.rarity === 'legendary' && (
298:                     <div
299:                         className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
300:                         style={{
301:                             background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
302:                             animation: 'pet-unlock-shimmer 2s infinite',
303:                         }}
304:                     />
305:                 )}
306:             </div>
307: 
308:             {/* Animation Keyframes */}
309:             <style>{`
310:                 @keyframes pet-unlock-confetti {
311:                     0% {
312:                         transform: translateY(0) rotate(0deg) scale(1);
313:                         opacity: 1;
314:                     }
315:                     50% {
316:                         opacity: 1;
317:                     }
318:                     100% {
319:                         transform: translateY(100vh) rotate(720deg) scale(0.5);
320:                         opacity: 0;
321:                     }
322:                 }
323:                 .animate-pet-unlock-confetti {
324:                     animation: pet-unlock-confetti 4s ease-out forwards;
325:                 }
326: 
327:                 @keyframes pet-unlock-pop {
328:                     0% {
329:                         transform: scale(0.3) rotate(-10deg);
330:                         opacity: 0;
331:                     }
332:                     60% {
333:                         transform: scale(1.1) rotate(2deg);
334:                     }
335:                     80% {
336:                         transform: scale(0.95) rotate(-1deg);
337:                     }
338:                     100% {
339:                         transform: scale(1) rotate(0deg);
340:                         opacity: 1;
341:                     }
342:                 }
343:                 .animate-pet-unlock-pop {
344:                     animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
345:                 }
346: 
347:                 @keyframes sparkle-burst {
348:                     0% {
349:                         opacity: 0;
350:                         transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
351:                     }
352:                     30% {
353:                         opacity: 1;
354:                         transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
355:                     }
356:                     100% {
357:                         opacity: 0;
358:                         transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
359:                     }
360:                 }
361:                 .animate-sparkle-burst {
362:                     animation: sparkle-burst 1.5s ease-out forwards;
363:                 }
364: 
365:                 @keyframes pet-unlock-shimmer {
366:                     0% { transform: translateX(-100%); }
367:                     100% { transform: translateX(100%); }
368:                 }
369:             `}</style>
370:         </div>
371:     );
372: };
373: 
374: export default PetUnlockModal;
375: 

(End of file - total 375 lines)
</content>
```

---

## User

---

## Assistant (Compaction · claude-opus-4.5 · 35.6s)

## Goal

The user is building an **AR Flashcard App for Kids** as a graduation project. Currently implementing the **Pet Feature** - a 3D Pet Companion System using Kenney blocky-character models. **Phases 1-4 are COMPLETE**. Now working on **Phase 5: Gamification Integration** - connecting pet unlock notifications to the XP system.

## Instructions

- Follow the `PET_FEATURE_IMPLEMENTATION_GUIDE.md` specification exactly
- Use skills: `3d-web-experience`, `react-ui-patterns`, `fastapi-pro`, `react-best-practices`, `ui-ux-designer`
- Assets are hosted on **Supabase** and URLs are stored in **MongoDB** - no local model files needed
- Tech Stack:
  - Frontend: React 18 + Vite + TypeScript + TailwindCSS
  - 3D: Three.js + React Three Fiber + @react-three/drei
  - Backend: FastAPI (Python) + MongoDB (Beanie ODM)

## Discoveries

1. **Frontend folder is `frontend-web`** (NOT `frontend`)

2. **`useGamification.ts` (lines 107-154)** - `addXP` function already:
   - Emits `LEVEL_UP` event when user levels up (line 126)
   - Emits `BADGES_EARNED` event (line 132)
   - Calls `fetchProgress()` after XP added
   - **MISSING**: Does NOT call `checkPetUnlocks()` to detect newly unlockable pets

3. **`usePets.ts` (lines 319-337)** already:
   - Listens to `LEVEL_UP` → refreshes pets list
   - Listens to `STREAK_UPDATED` → refreshes pets list
   - Has `getUnlockablePets()` helper (line 287-289) that returns pets where `!is_unlocked && can_unlock`
   - **BUT**: Does not proactively show notifications for newly unlockable pets

4. **`PetUnlockModal.tsx` is READY TO USE**:
   - Props: `pet: Pet`, `isOpen: boolean`, `onClose: () => void`, `onSetActive?: (petId: string) => void`
   - Full celebration with confetti, 3D pet preview, rarity-based styling
   - Has haptic and sound feedback built in

5. **`EventBus.ts`** is a simple pub/sub system - no predefined event types, just uses strings

6. **Implementation approach needed**:
   - Add `checkPetUnlocks(newXP)` to `useGamification.ts` after XP is added
   - Emit `PET_CAN_UNLOCK` event when a pet becomes unlockable for the first time
   - Wire up `PetUnlockModal` globally (in App or Layout) to show when event fires

## Accomplished

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend API | ✅ COMPLETE | Pet models, schemas, API router |
| Phase 2: Frontend Hook | ✅ COMPLETE | `usePets.ts` hook |
| Phase 3: Pet UI Components | ✅ COMPLETE | All 5 components + barrel export |
| Phase 4: Sidebar Integration | ✅ COMPLETE | Pet selector button + modal in Sidebar.tsx |
| Phase 5: Gamification Hook | 🔄 IN PROGRESS | Need to add pet unlock checking |

### Current Task - Phase 5 Steps:
1. **Add `checkPetUnlocks` to `useGamification.ts`** - Call after XP is added to check for newly unlockable pets
2. **Emit `PET_CAN_UNLOCK` event** when a pet becomes unlockable for the first time
3. **Wire up `PetUnlockModal` globally** (in App.tsx or Layout) so it appears when the event fires
4. **Testing** - Verify the full flow works end-to-end

### Implementation Guide spec (lines 639-660):
```typescript
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
```

## Relevant Files / Directories

### Spec (READ THIS)
```
docs/PET_FEATURE_IMPLEMENTATION_GUIDE.md    # Main spec - see lines 636-660 for gamification hook
```

### Backend (Complete - Reference Only)
```
backend/
├── models/pet.py                          # ✅ PetDocument + schemas
├── models/user_mongo.py                   # ✅ Has pet fields
├── api/pets.py                            # ✅ Full Pet API router
└── services/gamification_service.py       # XP logic and rewards
```

### Frontend - Pet Components (Phase 3 Complete)
```
frontend-web/src/components/pets/
├── PetCard.tsx                            # ✅ Individual pet cards
├── PetViewer3D.tsx                        # ✅ 3D model viewer
├── PetGrid.tsx                            # ✅ Grid with filters
├── PetUnlockModal.tsx                     # ✅ Celebration modal - READY TO WIRE UP
├── PetSelector.tsx                        # ✅ Main selector modal
└── index.ts                               # ✅ Barrel exports
```

### Frontend - Hooks (KEY FILES TO MODIFY)
```
frontend-web/src/hooks/useGamification.ts  # 🔄 MODIFY - Add checkPetUnlocks function after addXP (line 147)
frontend-web/src/hooks/usePets.ts          # ✅ Complete - Has getUnlockablePets() helper
```

### Frontend - Integration Points
```
frontend-web/src/runtime/EventBus.ts       # ✅ Read - Simple pub/sub, use for PET_CAN_UNLOCK event
frontend-web/src/components/Sidebar.tsx    # ✅ Complete - Has PetSelector
frontend-web/src/App.tsx                   # 📋 TODO - Wire up global PetUnlockModal listener
```

### Key Code Locations:
- **useGamification.ts line 147**: After `fetchProgress()` - add `checkPetUnlocks(result.total_xp)` call
- **usePets.ts line 287-289**: `getUnlockablePets()` returns `pets.filter(p => !p.is_unlocked && p.can_unlock)`
- **PetUnlockModal.tsx line 24-35**: Props interface for the celebration modal

---

## User

---

## Assistant (Build · claude-opus-4.5 · 478.7s)

---

## User

continue

---

## Assistant (Build · gpt-5.2-codex · 5.6s)

---

