# Task 6: Update ar-viewer.html for Animation Support

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\public\ar-viewer.html`

## Task Overview
Update the ar-viewer.html to support loading combo models with animations based on URL parameters.

## Global Constraints
- Uses A-Frame with animation-mixer component
- Supports URL parameters for combo model URL and animation clip
- Must work with existing AR viewer structure

## Integration Steps

### Step 1: Add combo model URL parameters extraction
In the script section, after the existing `params` variable declaration (around line 64), add:
```javascript
// Combo model parameters
var comboModelUrl = params.get('comboModel');
var comboAnimation = params.get('comboAnimation') || 'idle';
var comboImageUrl = params.get('comboImage');
```

### Step 2: Add function to load combo model
Add this function before the `bootstrap` function:
```javascript
// Load combo model with animation
function loadComboModel(url, animationClip) {
    var scene = document.querySelector('a-scene');
    if (!scene || !url) return;
    
    // Create combo entity
    var comboEntity = document.createElement('a-entity');
    comboEntity.setAttribute('id', 'combo-model');
    comboEntity.setAttribute('gltf-model', url);
    comboEntity.setAttribute('position', '0 0.5 0');
    comboEntity.setAttribute('scale', '0.3 0.3 0.3');
    comboEntity.setAttribute('visible', 'false');
    
    // Add animation-mixer for GLTF animations
    comboEntity.setAttribute('animation-mixer', 'clip: ' + animationClip + '; loop: repeat');
    
    // Hide initially
    scene.addEventListener('loaded', function() {
        comboEntity.setAttribute('visible', 'true');
    });
    
    // Add to scene
    scene.appendChild(comboEntity);
    
    console.log('✅ Combo model loaded with animation:', animationClip);
    postToParent('AR_DEBUG', {
        label: 'COMBO_MODEL_LOADED',
        details: { url: url, animation: animationClip },
        source: 'ar-viewer'
    });
}
```

### Step 3: Call loadComboModel after scene is ready
In the `bootstrap` function, after the `await loadScript('/static/ar-assets/js/ar-viewer.js');` line (around line 151), add:
```javascript
// Load combo model if URL params provided
if (comboModelUrl) {
    // Wait for scene to load before adding combo model
    scene.addEventListener('loaded', function() {
        loadComboModel(comboModelUrl, comboAnimation);
    });
}
```

### Step 4: Add function to update combo position based on marker positions
Add this function:
```javascript
// Update combo position based on marker positions
function updateComboPosition(marker1Pos, marker2Pos) {
    var comboEntity = document.getElementById('combo-model');
    if (!comboEntity) return;
    
    // Calculate center
    var centerX = (marker1Pos.x + marker2Pos.x) / 2;
    var centerY = Math.max(marker1Pos.y, marker2Pos.y) + 0.3;
    var centerZ = (marker1Pos.z + marker2Pos.z) / 2;
    
    // Update position with animation
    comboEntity.setAttribute('animation', {
        property: 'position',
        to: centerX + ' ' + centerY + ' ' + centerZ,
        dur: 300,
        easing: 'easeOutQuad'
    });
}
```

### Step 5: Listen for COMBO_ACTIVATED event and update combo model visibility
Add event listener in the bootstrap function after loading the scene:
```javascript
// Listen for combo activation from parent
document.addEventListener('COMBO_ACTIVATED', function(e) {
    var comboEntity = document.getElementById('combo-model');
    if (comboEntity) {
        comboEntity.setAttribute('visible', 'true');
        postToParent('AR_DEBUG', {
            label: 'COMBO_ENTITY_SHOWN',
            details: e.detail || {},
            source: 'ar-viewer'
        });
    }
});

// Listen for combo deactivation
document.addEventListener('COMBO_DEACTIVATED', function(e) {
    var comboEntity = document.getElementById('combo-model');
    if (comboEntity) {
        comboEntity.setAttribute('visible', 'false');
        postToParent('AR_DEBUG', {
            label: 'COMBO_ENTITY_HIDDEN',
            details: e.detail || {},
            source: 'ar-viewer'
        });
    }
});
```

## Dependencies
- Task 5 complete: ARContainerV2 integration sends COMBO_ACTIVATED events

## Output
- Modified ar-viewer.html with animation support
- Report file: `report/task-6-report.md`
