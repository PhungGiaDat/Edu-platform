# PHASE 2 RESEARCH: Card Combo + Food Feed Interaction Mechanics

**Author:** Researcher Agent  
**Date:** July 23, 2026  
**Status:** Research Complete — Ready for Implementation Planning

---

## Executive Summary

This document outlines the technical design for two core AR interaction features targeting the `AR_INTERACTING` state: **(A) Card Combo/Merge System** and **(B) Food Feed Animation**. Both features extend the existing AR experience pipeline by introducing multi-model state tracking, proximity-based detection, drag-and-drop mechanics, and reward animations.

**Key findings:**
- Proximity detection is straightforward using `Vector3.Distance()` between tracked model transforms
- Combo system should be data-driven via a lookup table (card pair → reward)
- Food feed requires extending `ARGestureHandler` with plane-constrained drag mechanics
- Five new Unity→RN events are needed to close the feedback loop
- Claymorphic visuals can be achieved with a simple rim-light shader without full pipeline changes

---

## 1. Proximity Detection Algorithm

### 1.1 Detection Method

The existing codebase tracks a single model via `ModelSpawner`. For multi-card scenarios, we need to track multiple spawned models simultaneously. The proximity check is:

```csharp
// In a new ComboManager component
float distance = Vector3.Distance(modelA.transform.position, modelB.transform.position);
bool isNear = distance <= PROXIMITY_THRESHOLD;
```

### 1.2 World-Unit Threshold

ARFoundation uses meters as world units. For typical flashcard-sized markers (8.5cm × 5.5cm ID-1 cards), a reasonable proximity threshold is:

| Threshold | Behavior |
|-----------|----------|
| **0.05m (5cm)** | Very close — cards must almost touch |
| **0.10m (10cm)** | Moderate — works well for physical card combos |
| **0.15m (15cm)** | Loose — easier to trigger but may cause false positives |
| **0.20m (20cm)** | Very loose — only for large cards or deliberate gestures |

**Recommendation:** Start with **0.10m** as the default, configurable via payload or Unity Inspector. Adjust based on user testing — smaller thresholds feel more deliberate, larger thresholds are more forgiving.

### 1.3 Trigger Mechanism

Two options for combo triggering:

| Option | Pros | Cons |
|--------|------|------|
| **Automatic** (proximity alone) | Seamless, no UI interruption | May trigger unintentionally |
| **Tap-to-combo** (COMBO button) | User-controlled, intentional | Requires UI overlay, extra tap |
| **Proximity + visual hint** | Best UX: glow/pulse when near, tap to confirm | Most complex |

**Recommendation:** Implement **Proximity + visual hint + optional tap**. When distance < 0.15m, show a proximity indicator (models glow/pulse). When distance < 0.10m, show a COMBO button overlay on the RN side. This gives users visual feedback before requiring action.

### 1.4 Proximity Update Frequency

Proximity checks should run in `Update()` or via a coroutine with a throttle:

```csharp
// Check every 100ms, not every frame
private const float PROXIMITY_CHECK_INTERVAL = 0.1f;
private float _lastCheckTime = 0f;

void Update() {
    if (Time.time - _lastCheckTime < PROXIMITY_CHECK_INTERVAL) return;
    _lastCheckTime = Time.time;
    CheckAllProximities();
}
```

---

## 2. Combo System Design

### 2.1 Data Model

Combos should be defined in a data-driven lookup table, not hardcoded pairs.

#### Option A: Unity ScriptableObject (Recommended for Phase 2)

Create a `ComboDefinition` ScriptableObject:

```csharp
[CreateAssetMenu(fileName = "ComboTable", menuName = "AR/Combo Table")]
public class ComboTable : ScriptableObject {
    [Serializable]
    public class ComboEntry {
        public string cardIdA;
        public string cardIdB;
        public string rewardCardId;
        public int xpReward;
        public string animationTrigger; // "merge", "explosion", "sparkle"
    }
    public ComboEntry[] combos;
}
```

#### Option B: JSON Config from RN

RN sends combo definitions as part of the AR experience payload:

```json
{
  "comboTable": [
    { "cardIdA": "apple", "cardIdB": "banana", "rewardCardId": "fruit_salad", "xpReward": 50 },
    { "cardIdA": "dog", "cardIdB": "cat", "rewardCardId": "farm", "xpReward": 75 }
  ]
}
```

**Recommendation:** Start with **ScriptableObject** in Unity for simplicity. Migrate to backend-driven config in Phase 3 when the backend is productionized.

#### Option C: Backend-Driven (Future)

When the backend is ready, combo definitions live in the database:

```sql
CREATE TABLE combo_definitions (
  id SERIAL PRIMARY KEY,
  card_a VARCHAR(100) NOT NULL,
  card_b VARCHAR(100) NOT NULL,
  reward_card_id VARCHAR(100) NOT NULL,
  xp_reward INTEGER DEFAULT 30,
  UNIQUE(card_a, card_b)
);
```

### 2.2 Combo Resolution

For A+B combos, order should not matter (apple+banana = banana+apple). Store pairs in canonical form:

```csharp
private string CanonicalPair(string a, string b) {
    return string.Compare(a, b, StringComparison.Ordinal) < 0
        ? $"{a}+{b}"
        : $"{b}+{a}";
}
```

Lookup:
```csharp
public ComboEntry FindCombo(string cardA, string cardB) {
    var key = CanonicalPair(cardA, cardB);
    return _comboTable.combos.FirstOrDefault(c => 
        CanonicalPair(c.cardIdA, c.cardIdB) == key);
}
```

### 2.3 Combo State Machine

Extend the existing AR experience flow with combo states:

```
AR_INTERACTING (existing)
    ↓
MODEL_LOADED (Card A detected, first model spawned)
    ↓
MODEL_LOADED (Card B detected, second model spawned)
    ↓
[Proximity threshold met] → COMBO_NEAR (visual hint shown)
    ↓
[Optional: User taps COMBO button] → COMBO_TRIGGERED
    ↓
[Animation plays: models fly to midpoint, particle burst, reward spawns]
    ↓
COMBO_COMPLETE
    ↓
MODEL_SPAWNING (reward model)
    ↓
MODEL_LOADED (reward model active)
    ↓
[XP awarded, RN notified via onComboComplete]
    ↓
AR_INTERACTING (return to normal interaction)
```

### 2.4 Combo Animation Approach

The existing `AnimationController` handles clip-based animations (rotate/bounce/idle). Combo animations are cinematic and one-shot — they don't loop. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **Unity Timeline** | Visual authoring, precise control | Requires separate .playable file per combo |
| **AnimationController + triggers** | Reuses existing system | Less cinematic, clip-based |
| **Visual Effect Graph (VFX)** | Particle explosions, magical effects | Steeper learning curve |
| **LeanTween / DoTween** (if imported) | Script-driven, flexible | Adds third-party dependency |
| **Coroutine-driven transforms** | No new tools, full code control | More complex to author |

**Recommendation for Phase 2:** Implement combo animations as **coroutine-driven transform tweening** with particle effects via `ParticleSystem`. This avoids requiring Unity Editor work and keeps everything in C#:

```csharp
private IEnumerator PlayComboAnimation(Transform a, Transform b, Transform reward) {
    var midpoint = (a.position + b.position) / 2f;
    
    // Phase 1: Models fly to midpoint (500ms)
    var t = 0f;
    while (t < 0.5f) {
        t += Time.deltaTime;
        var tNorm = t / 0.5f;
        a.position = Vector3.Lerp(a.position, midpoint, tNorm);
        b.position = Vector3.Lerp(b.position, midpoint, tNorm);
        yield return null;
    }
    
    // Phase 2: Particle burst (300ms)
    _particleSystem.Play();
    yield return new WaitForSeconds(0.3f);
    
    // Phase 3: Hide originals, spawn reward (instant)
    a.gameObject.SetActive(false);
    b.gameObject.SetActive(false);
    reward.gameObject.SetActive(true);
    
    // Phase 4: Reward pop-in scale animation (300ms)
    reward.localScale = Vector3.zero;
    t = 0f;
    while (t < 0.3f) {
        t += Time.deltaTime;
        var scale = Mathf.Lerp(0f, 1f, EaseOutBack(t / 0.3f));
        reward.localScale = Vector3.one * scale;
        yield return null;
    }
    
    // Emit completion event
    RNEventEmitter.Instance.SendEvent("onComboComplete", new { ... });
}
```

### 2.5 Data-Driven Animation Configuration

Include animation type in the combo table:

```csharp
[Serializable]
public class ComboEntry {
    public string cardIdA;
    public string cardIdB;
    public string rewardCardId;
    public int xpReward;
    public ComboAnimationType animationType; // Enum: Merge, Explosion, Sparkle, Portal
}

public enum ComboAnimationType {
    Merge,       // Models fly together
    Explosion,   // Burst outward then converge
    Sparkle,    // Star burst effect
    Portal       // Swirl into portal, reward appears
}
```

---

## 3. Food Feed Design

### 3.1 Pet/Character in Scene

**Current state:** No virtual pet character exists in the Unity scene.

**Recommendation:** Create a simple clay-styled placeholder character:

```csharp
// PetCharacter.cs — simple clay pet
public class PetCharacter : MonoBehaviour {
    [SerializeField] private Renderer bodyRenderer;
    [SerializeField] private ParticleSystem eatingParticles;
    
    public enum State { Idle, Hungry, Eating, Happy }
    private State _currentState = State.Idle;
    
    public State CurrentState => _currentState;
    
    public void SetState(State newState) {
        _currentState = newState;
        RNEventEmitter.Instance.SendEvent("onCharacterStateChanged", new {
            state = newState.ToString().ToLower()
        });
        
        switch (newState) {
            case State.Idle: PlayIdleAnimation(); break;
            case State.Eating: PlayEatingAnimation(); break;
            case State.Happy: PlayHappyAnimation(); break;
        }
    }
}
```

**Character design:** A simple sphere (body) with two smaller spheres (eyes) and a capsule (mouth). Material uses the clay shader described in Section 6. Positioned at a fixed anchor point in the scene (user places pet separately from food).

### 3.2 Food Drag Implementation

Extend `ARGestureHandler` with plane-constrained drag:

```csharp
// Add to ARGestureHandler.cs
public class ARGestureHandler : MonoBehaviour, 
    IPointerClickHandler, IDragHandler, IBeginDragHandler, IEndDragHandler,
    IBeginDragHandler, IDragHandler  // Already has these, extend functionality
{
    [SerializeField] private ARFeedingHandler feedingHandler;
    private bool _isDraggingFood;
    private GameObject _draggedFood;
    private Plane _dragPlane;
    
    public new void OnDrag(PointerEventData eventData) {
        // If dragging food, constrain to AR plane
        if (_isDraggingFood && _draggedFood != null) {
            var ray = Camera.main.ScreenPointToRay(eventData.position);
            if (_dragPlane.Raycast(ray, out float enter)) {
                var worldPos = ray.GetPoint(enter);
                _draggedFood.transform.position = worldPos;
                
                // Check proximity to pet
                feedingHandler?.CheckFoodProximity(_draggedFood.transform.position);
            }
        } else {
            // Original rotation logic
            var delta = eventData.position - _lastPointerPos;
            _accumulatedRotation += delta.x;
            _lastPointerPos = eventData.position;
            var currentRot = _initialRotation + Vector3.up * _accumulatedRotation * 0.5f;
            modelSpawner?.SetRotation(currentRot);
        }
    }
    
    public void StartDraggingFood(GameObject food) {
        _isDraggingFood = true;
        _draggedFood = food;
        _dragPlane = new Plane(Vector3.up, food.transform.position);
    }
    
    public void StopDraggingFood() {
        _isDraggingFood = false;
        _draggedFood = null;
    }
}
```

### 3.3 Feed Animation Sequence

```
User scans food flashcard → Food model spawned at food anchor
User scans pet flashcard → Pet character spawned at pet anchor
    ↓
User long-presses food model (or taps "Feed" button) → enters drag mode
    ↓
User drags food toward pet
    ↓
[Food reaches pet proximity threshold] → EAT_TRIGGERED
    ↓
Pet plays eating animation (mouth opens → closes, chomp)
Food model shrinks/fades
    ↓
Eating particles (crunch effect)
    ↓
XP popup appears (floating above pet)
    ↓
Pet returns to idle/happy state
    ↓
onFoodFed event sent to RN
```

### 3.4 XP and Streak Tracking

The `ARFeedingHandler` manages feeding state and streak counting:

```csharp
public class ARFeedingHandler : MonoBehaviour {
    [SerializeField] private PetCharacter pet;
    
    private int _currentStreak = 0;
    private const int STREAK_BONUS_THRESHOLD = 3; // Every 3rd feed = bonus XP
    private const int BASE_XP = 10;
    private const int STREAK_BONUS_XP = 25;
    
    public void OnFoodReachedPet(GameObject food) {
        _currentStreak++;
        
        int xpAwarded = _currentStreak % STREAK_BONUS_THRESHOLD == 0
            ? STREAK_BONUS_XP
            : BASE_XP;
        
        // Play animations
        pet.SetState(PetCharacter.State.Eating);
        StartCoroutine(HideFood(food));
        
        // Emit event
        RNEventEmitter.Instance.SendEvent("onFoodFed", new {
            foodModelId = food.name,
            xpAwarded = xpAwarded,
            streakCount = _currentStreak,
            isStreakBonus = _currentStreak % STREAK_BONUS_THRESHOLD == 0
        });
    }
}
```

---

## 4. New Unity Events

### 4.1 Full Event Signature Table

| Event Name | Trigger | Direction | Payload |
|------------|---------|-----------|---------|
| `onProximityNear` | Two models within 0.15m (warning zone) | Unity → RN | `{ cardIdA: string, cardIdB: string, distance: number }` |
| `onComboTriggered` | User confirms combo or auto-trigger | Unity → RN | `{ cardIds: string[], comboId: string, xpPotential: number }` |
| `onComboComplete` | Combo animation finished, reward spawned | Unity → RN | `{ rewardCardId: string, xpAwarded: number, newLevel?: number }` |
| `onFoodFed` | Pet ate food | Unity → RN | `{ foodModelId: string, xpAwarded: number, streakCount: number, isStreakBonus: boolean }` |
| `onCharacterStateChanged` | Pet state transitions | Unity → RN | `{ state: "idle" \| "hungry" \| "eating" \| "happy" }` |
| `onDragStart` | User starts dragging a model | Unity → RN | `{ modelId: string, type: "food" \| "model" }` |
| `onDragEnd` | User releases dragged model | Unity → RN | `{ modelId: string, position: { x, y, z }, droppedOnPet: boolean }` |

### 4.2 RN Event Handler Additions

Add these handlers to the Unity bridge in RN:

```typescript
// In UnityBridgeModule.ts or ARScreen.tsx
unityBridge.on('onProximityNear', (data) => {
  // Show "COMBO available!" visual hint
  showProximityIndicator(data.cardIdA, data.cardIdB, data.distance);
});

unityBridge.on('onComboComplete', (data) => {
  // Animate XP counter
  animateXPIncrease(data.xpAwarded);
  // Check level up
  checkLevelUp(data.newLevel);
});

unityBridge.on('onFoodFed', (data) => {
  // Update streak counter UI
  updateStreak(data.streakCount);
  // Show floating XP popup
  showFloatingXP(data.xpAwarded, data.isStreakBonus);
});

unityBridge.on('onCharacterStateChanged', (data) => {
  // Update pet mood indicator
  updatePetMood(data.state);
});
```

---

## 5. RN State Changes

### 5.1 ARScreen Multi-Card State

Current `ARScreen` tracks a single AR model. Need to extend for multi-card:

```typescript
// New state structure
interface ARSessionState {
  // Current interaction mode
  mode: 'single' | 'combo' | 'feeding';
  
  // Tracked models
  activeModels: Map<string, {
    cardId: string;
    word: string;
    position: Vector3;
    anchorId: string;
  }>;
  
  // Combo state
  combo: {
    isNear: boolean;
    nearCardIds: string[];
    triggered: boolean;
  };
  
  // Feeding state
  feeding: {
    petState: 'idle' | 'hungry' | 'eating' | 'happy';
    currentStreak: number;
    isDraggingFood: boolean;
    draggedFoodId: string | null;
  };
  
  // XP/Progression (session-scoped)
  sessionXP: number;
  sessionLevel: number;
}
```

### 5.2 Combo UI Overlay

RN should render a combo indicator when `onProximityNear` fires:

```tsx
// In ARScreen.tsx
const [comboIndicator, setComboIndicator] = useState<{
  visible: boolean;
  cardIds: string[];
  distance: number;
}>({ visible: false, cardIds: [], distance: 0 });

// In the Unity event handler
unityBridge.on('onProximityNear', ({ cardIdA, cardIdB, distance }) => {
  setComboIndicator({
    visible: true,
    cardIds: [cardIdA, cardIdB],
    distance
  });
});

unityBridge.on('onComboTriggered', () => {
  setComboIndicator({ visible: false, cardIds: [], distance: 0 });
});

// Render
{comboIndicator.visible && (
  <View style={styles.comboOverlay}>
    <Text style={styles.comboText}>
      {comboIndicator.cardIds.join(' + ')}
    </Text>
    <Text style={styles.comboSubtext}>
      {comboIndicator.distance < 0.10 ? 'COMBO!' : 'Bring closer...'}
    </Text>
  </View>
)}
```

### 5.3 ProgressTracker Integration

The `ProgressTracker` component should animate XP awards:

```tsx
// In ARScreen.tsx — handle XP awards from Unity
const handleXPIncrease = (amount: number) => {
  // Trigger animated XP counter
  setXP(prev => {
    const newXP = prev + amount;
    if (newXP >= MAX_XP) {
      // Level up!
      setLevel(l => l + 1);
      return newXP - MAX_XP;
    }
    return newXP;
  });
  
  // Show floating XP popup
  showFloatingXP(amount);
};

unityBridge.on('onComboComplete', ({ xpAwarded, newLevel }) => {
  handleXPIncrease(xpAwarded);
  if (newLevel) setLevel(newLevel);
});

unityBridge.on('onFoodFed', ({ xpAwarded }) => {
  handleXPIncrease(xpAwarded);
});
```

---

## 6. Claymorphic 3D Approach

### 6.1 What is Claymorphic Rendering

Claymorphic (or clay-style) 3D visuals feature:
- Soft, rounded forms
- Matte surfaces with subtle specularity
- Strong rim lighting (soft edge highlight)
- Muted, warm color palette
- Minimal texture detail

### 6.2 Simple Rim-Light Shader (No Pipeline Change)

Create a clay-syle URP shader with a single pass:

```hlsl
// ClayShader.shader
Shader "Custom/Clay"
{
    Properties
    {
        _Color ("Base Color", Color) = (1, 0.9, 0.8, 1)
        _RimColor ("Rim Color", Color) = (1, 1, 1, 1)
        _RimPower ("Rim Power", Range(0.5, 4)) = 2
        _RimIntensity ("Rim Intensity", Range(0, 1)) = 0.6
    }
    
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        
        CGPROGRAM
        #pragma surface surf Clay
        
        half4 LightingClay(SurfaceOutput s, half3 viewDir, half atten) {
            // Diffuse
            half NdotL = dot(s.Normal, _WorldSpaceLightPos0.xyz);
            half diffuse = max(0, NdotL) * 0.7 + 0.3; // Soft shadows
            
            // Rim light
            half rim = 1 - saturate(dot(normalize(viewDir), s.Normal));
            rim = pow(rim, _RimPower) * _RimIntensity;
            
            half4 c;
            c.rgb = s.Albedo * _LightColor0.rgb * diffuse * atten;
            c.rgb += _RimColor.rgb * rim;
            c.a = s.Alpha;
            return c;
        }
        
        struct Input {
            float3 worldNormal;
            float3 viewDir;
        };
        
        float4 _Color;
        float4 _RimColor;
        float _RimPower;
        float _RimIntensity;
        
        void surf(Input IN, inout SurfaceOutput o) {
            o.Albedo = _Color.rgb;
            o.Alpha = _Color.a;
            o.Normal = IN.worldNormal;
        }
        ENDCG
    }
}
```

### 6.3 Applying to Models

```csharp
public class ClayMaterialApplicator : MonoBehaviour {
    [SerializeField] private Color baseColor = new Color(0.95f, 0.85f, 0.75f);
    [SerializeField] private Color rimColor = Color.white;
    [SerializeField] [Range(0.5f, 4f)] private float rimPower = 2f;
    [SerializeField] [Range(0f, 1f)] private float rimIntensity = 0.6f;
    
    private Material _clayMaterial;
    
    void Start() {
        // Create clay material from shader
        var shader = Shader.Find("Custom/Clay");
        if (shader == null) {
            Debug.LogWarning("[ClayMaterialApplicator] Shader not found");
            return;
        }
        
        _clayMaterial = new Material(shader);
        _clayMaterial.SetColor("_Color", baseColor);
        _clayMaterial.SetColor("_RimColor", rimColor);
        _clayMaterial.SetFloat("_RimPower", rimPower);
        _clayMaterial.SetFloat("_RimIntensity", rimIntensity);
        
        // Apply to all renderers
        foreach (var renderer in GetComponentsInChildren<Renderer>()) {
            renderer.material = _clayMaterial;
        }
    }
}
```

### 6.4 Alternative: Standard Shader with Settings

If custom shader is too complex, use Unity's Standard shader with clay-friendly settings:

| Property | Clay Value |
|----------|------------|
| Metallic | 0.0 |
| Smoothness | 0.3–0.4 (matte) |
| Emission | 0 (unless glowing needed) |
| Color | Warm, muted (e.g., #F5D6C6) |

Add rim light via post-processing (Bloom + custom volume) or a simple Point Light near the model.

---

## 7. Open Questions for Product Owner

### 7.1 Combo Mechanics

| Question | Options |
|----------|---------|
| **Combo trigger:** Auto or tap-to-confirm? | A) Auto-trigger on proximity, B) Show COMBO button, C) Proximity warning + tap confirm |
| **Combo persistence:** Does a combo consume the cards? | A) Cards remain scannable after combo, B) Cards consumed (one-time combo per card pair) |
| **Combo vs. feeding:** Can food cards combo with other food cards? | A) Yes (fruit + fruit = fruit salad), B) No (food only for feeding) |
| **Combo XP:** Fixed per combo or scaled by difficulty/rarity? | A) Fixed 50 XP, B) Scaled by combined card rarity, C) User-configurable per combo |

### 7.2 Pet/Character

| Question | Options |
|----------|---------|
| **Pet placement:** User-placed or auto-positioned? | A) User places pet with separate flashcard scan, B) Pet auto-spawns at scene center |
| **Pet customization:** Can users customize the pet? | A) No (placeholder only), B) Unlock different pet styles via XP |
| **Pet states:** What animations/states are needed? | A) Idle + Eating only, B) Idle + Hungry + Eating + Happy, C) More granular (excited, sleepy, etc.) |
| **Pet persists:** Does pet exist across AR sessions? | A) Session-only, B) Persistent between sessions (happiness decays) |

### 7.3 Feeding Mechanics

| Question | Options |
|----------|---------|
| **Streak definition:** What counts as a streak? | A) Consecutive feeds (any food), B) Feed matching pet's preferred food, C) Feed within time window |
| **Streak reset:** When does streak reset? | A) Never (lifetime), B) Daily, C) When pet is "full" (max feeds per session) |
| **Feeding limit:** Any limit on feeds per session? | A) Unlimited, B) 5 feeds then pet is "full", C) Cooldown between feeds |
| **Wrong food:** What if pet doesn't like the food? | A) Always happy, B) Reduced XP, C) Pet refuses (animation rejection) |

### 7.4 Visual Design

| Question | Options |
|----------|---------|
| **Claymorphic style:** Stick with clay aesthetic or allow 3D model variations? | A) Clay-only for MVP, B) Allow high-poly models for some cards |
| **Combo effects:** What visual feedback for combos? | A) Simple merge animation, B) Particle effects + sound, C) Full cinematic |
| **XP popup style:** Floating numbers or animated badges? | A) Simple floating "+50 XP", B) Animated badge with combo/feed icon |

### 7.5 Data Architecture

| Question | Options |
|----------|---------|
| **Combo definitions:** Where do combos live? | A) Hardcoded in Unity (Phase 2), B) RN config (JSON), C) Backend database |
| **Reward cards:** Are reward cards new scannable flashcards? | A) Yes (combo creates new learnable card), B) No (just XP/reward model) |
| **XP persistence:** Store XP in RN state or backend? | A) RN state only (session), B) Backend via API call |

---

## 8. Implementation Phasing Recommendation

### Phase 2A: Core Proximity + Combo (MVP)
1. Extend `ModelSpawner` to track multiple models
2. Create `ComboManager` with proximity detection
3. Implement combo lookup table (ScriptableObject)
4. Add combo animation coroutines
5. Wire up `onComboTriggered` / `onComboComplete` events
6. Add combo UI overlay in RN
7. Update `ProgressTracker` for combo XP

**Deliverable:** User can scan 2 cards, bring them close, see combo animation, and earn XP.

### Phase 2B: Feeding System
1. Create `PetCharacter` placeholder
2. Extend `ARGestureHandler` for drag mechanics
3. Create `ARFeedingHandler` for feeding logic
4. Implement feed animation sequence
5. Add streak tracking
6. Wire up `onFoodFed` / `onCharacterStateChanged` events
7. Add feeding UI (streak counter, pet mood)

**Deliverable:** User can drag food to pet, see eating animation, and earn XP with streak bonuses.

### Phase 2C: Polish
1. Clay shader implementation
2. Particle effects for combos/feeding
3. Sound effects integration
4. Edge cases (failed combos, pet refusal, etc.)
5. Performance optimization (proximity check throttling)

---

## 9. File Changes Summary

### New Unity Files
| File | Purpose |
|------|---------|
| `Assets/AR/ComboManager.cs` | Proximity detection, combo lookup, combo state |
| `Assets/AR/ARFeedingHandler.cs` | Pet state, feeding logic, streak tracking |
| `Assets/Characters/PetCharacter.cs` | Pet placeholder with state machine |
| `Assets/Animation/ComboAnimationController.cs` | Coroutine-based combo animations |
| `Assets/ScriptableObjects/ComboTable.asset` | Combo definitions data |
| `Assets/Shaders/ClayShader.shader` | Claymorphic rim-light shader |
| `Assets/Scripts/Materials/ClayMaterialApplicator.cs` | Applies clay shader to models |

### Modified Unity Files
| File | Changes |
|------|---------|
| `ARExperienceHandler.cs` | Multi-model state, delegate to ComboManager/ARFeedingHandler |
| `ModelSpawner.cs` | Track multiple spawned models |
| `ARGestureHandler.cs` | Drag mechanics for food |
| `RNEventEmitter.cs` | Add new event senders |
| `RNMessageReceiver.cs` | Handle combo/feeding RN commands (if needed) |

### New RN Files
| File | Purpose |
|------|---------|
| `src/hooks/useARSession.ts` | Multi-card AR state management |
| `src/components/ComboOverlay.tsx` | Combo UI indicator |
| `src/components/FeedingUI.tsx` | Pet mood, streak counter |

### Modified RN Files
| File | Changes |
|------|---------|
| `ARScreen.tsx` | Handle multi-card state, event listeners |
| `UnityBridgeModule.ts` | Register new event handlers |
| `ProgressTracker.tsx` | Animated XP counter |

---

## Appendix A: Event Flow Diagrams

### Combo Event Flow
```
Unity                          RN
  |                              |
  | onProximityNear              |
  |────────────────────────────►|
  |                              | Show "COMBO available" overlay
  |                              |
  | [User taps COMBO]            |
  | onComboTriggered             |
  |────────────────────────────►|
  |                              | Update UI, show "COMBO!" text
  |                              |
  | [Play combo animation]       |
  |                              |
  | onComboComplete              |
  | { rewardCardId, xpAwarded }  |
  |────────────────────────────►|
  |                              | Animate XP counter, spawn reward card UI
```

### Food Feed Event Flow
```
Unity                          RN
  |                              |
  | [Pet spawned]               |
  | onCharacterStateChanged      |
  | { state: "hungry" }         |
  |────────────────────────────►|
  |                              | Show hungry pet indicator
  |                              |
  | onDragStart                  |
  |────────────────────────────►|
  |                              | Show "dragging" indicator
  |                              |
  | [Food reaches pet]           |
  | onFoodFed                    |
  | { xpAwarded, streakCount }   |
  |────────────────────────────►|
  |                              | Show XP popup, update streak
  |                              |
  | onCharacterStateChanged      |
  | { state: "happy" }          |
  |────────────────────────────►|
  |                              | Update pet mood indicator
```

---

## Appendix B: Mockup References

### Combo Overlay (RN)
```
┌─────────────────────────────────┐
│                                 │
│     [Card A] + [Card B]        │
│                                 │
│    "COMBO AVAILABLE!"           │
│         [COMBO!]                │
│                                 │
│         [Scene]                 │
│                                 │
└─────────────────────────────────┘
```

### Feeding UI (RN)
```
┌─────────────────────────────────┐
│  🍎 Streak: 3 🔥               │
│                                 │
│         [Pet 🐹]                │
│                                 │
│     "Yum! +25 XP!"              │
│                                 │
│  [Drag food here → 🍕]          │
│                                 │
└─────────────────────────────────┘
```

---

*End of Research Document*
