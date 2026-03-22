# MindAR Integration Skill

## Overview
This skill provides comprehensive guidance for integrating the MindAR library into web applications, focusing on image tracking setup, marker compilation, A-Frame configuration, and initial performance optimization.

## When to Use This Skill
- Setting up MindAR for the first time in a project
- Compiling image markers into PATT files
- Configuring A-Frame scenes for AR experiences
- Troubleshooting marker recognition issues
- Optimizing initial AR performance and camera setup

## Prerequisites
- Basic understanding of HTML and JavaScript
- Familiarity with npm/package management
- Knowledge of browser camera permissions
- Understanding of A-Frame component system (helpful but not required)

## Core Concepts

### MindAR Architecture
MindAR is a WebAR framework built on top of A-Frame that enables:
- **Image Tracking**: Computer vision-based marker detection using compiled PATT files
- **Face Tracking**: Facial feature detection (not covered in this skill)
- **A-Frame Integration**: Declarative 3D/AR scene management using HTML-like components
- **WebXR Foundation**: Browser-based AR without native app installation

### PATT Files (Compiled Markers)
- **Format**: `.mind` files containing 16x16 pixel matrices per RGB channel with 4 orientations
- **Generation**: Created using MindAR Marker Training tool from source images
- **Purpose**: Optimized marker patterns for fast computer vision recognition
- **Organization**: Single-marker files or combined multi-marker compilations

### A-Frame Scene Structure
```html
<a-scene>
  <!-- Camera component for AR view -->
  <a-camera></a-camera>
  
  <!-- AR entities with marker targets -->
  <a-entity mindar-image-target="targetIndex: 0">
    <!-- 3D content rendered when marker detected -->
  </a-entity>
</a-scene>
```

## Implementation Workflow

### Step 1: Installation & Dependencies

#### Install MindAR Packages
```bash
npm install mind-ar
# or with specific integration
npm install @ar-js-org/ar.js  # Alternative AR library
```

#### CDN Integration (Quick Start)
```html
<!-- MindAR Image Tracking -->
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js"></script>

<!-- A-Frame Framework -->
<script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>

<!-- MindAR A-Frame Integration -->
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js"></script>
```

#### Project Structure
```
project/
├── public/
│   ├── markers/              # Compiled PATT files
│   │   ├── marker-01.mind
│   │   ├── marker-02.mind
│   │   └── combined.mind     # Multi-marker file
│   └── assets/               # 3D models, textures
│       ├── models/
│       └── textures/
├── src/
│   ├── components/
│   │   └── ARScene.tsx       # React AR component
│   └── lib/
│       └── ar-bridge.ts      # Event bridge
└── marker-sources/           # Original marker images
    ├── marker-01.png
    └── marker-02.png
```

### Step 2: Marker Design & Compilation

#### Design Principles for Quality Markers

**✅ GOOD MARKER CHARACTERISTICS:**
1. **Border Thickness**: 85% of image should be content, surrounded by thick black border
2. **Asymmetric Design**: Different appearance in all 4 rotations (not rotationally symmetric)
3. **High Contrast**: Bold, clear shapes with strong foreground/background contrast
4. **Simple Content**: Avoid excessive fine details (causes tracking noise)
5. **White External Area**: High-contrast border region improves recognition
6. **Square Format**: Square images work best with MindAR's tracking system

**❌ AVOID THESE MISTAKES:**
- Thin or broken borders (< 50% thickness)
- Rotationally symmetric patterns (looks same when rotated)
- Low contrast or gradients
- Too many fine details or complex textures
- Circular or irregular outer shapes
- Text-only markers (often symmetric when rotated)

#### Marker Compilation Process

**Step 1: Prepare Source Images**
```bash
# Recommended specifications
- Format: PNG or JPG
- Size: 512x512px to 1024x1024px
- Color: RGB (color images work fine)
- DPI: 72-300 DPI
- Border: Add 85% thick black border in image editor
```

**Step 2: Use MindAR Marker Training Tool**
1. Visit: https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Upload your marker image(s):
   - Single marker → generates single `.mind` file
   - Multiple markers → generates combined `.mind` file with all markers
3. Set compilation parameters:
   - **Max Track**: Number of markers to track simultaneously (default: 1)
   - **Image Size**: Larger = better quality but slower (default: 512px)
4. Click "Compile" and wait for processing (may take 1-2 minutes)
5. Download the generated `.mind` file
6. Save to your project's `public/markers/` directory

**Step 3: Verify Marker Quality**
```javascript
// Test marker recognition quality
// Good markers should:
// - Be detected within 1-2 seconds at 0.5m distance
// - Track stably without jitter
// - Work from 30-60 degree viewing angles
// - Maintain tracking at 0.3m - 2m distance
```

### Step 3: A-Frame Scene Configuration

#### Basic AR Scene Setup
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MindAR Basic Setup</title>
  
  <!-- MindAR & A-Frame Scripts -->
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js"></script>
</head>
<body>
  <!-- AR Scene Configuration -->
  <a-scene 
    mindar-image="
      imageTargetSrc: ./markers/combined.mind;
      maxTrack: 3;
      autoStart: true;
      uiLoading: yes;
      uiScanning: yes;
      uiError: yes;
    "
    color-space="sRGB"
    renderer="
      colorManagement: true;
      physicallyCorrectLights: true;
      antialias: true;
      alpha: true;
    "
    vr-mode-ui="enabled: false"
    device-orientation-permission-ui="enabled: false">
    
    <!-- AR Camera -->
    <a-camera 
      position="0 0 0" 
      look-controls="enabled: false"
      cursor="fuse: false; rayOrigin: mouse;"
      raycaster="far: 10000; objects: .clickable">
    </a-camera>
    
    <!-- Marker Target 0 -->
    <a-entity mindar-image-target="targetIndex: 0">
      <!-- 3D Content for Marker 0 -->
      <a-box 
        position="0 0 0" 
        scale="0.5 0.5 0.5" 
        color="blue"
        animation="property: rotation; to: 0 360 0; loop: true; dur: 4000">
      </a-box>
    </a-entity>
    
    <!-- Marker Target 1 -->
    <a-entity mindar-image-target="targetIndex: 1">
      <!-- 3D Content for Marker 1 -->
      <a-sphere 
        position="0 0 0" 
        radius="0.3" 
        color="red">
      </a-sphere>
    </a-entity>
  </a-scene>
</body>
</html>
```

#### MindAR Configuration Options

**imageTargetSrc** (required)
- Path to compiled `.mind` file
- Can be single marker or combined multi-marker file
- Relative path from HTML file location

**maxTrack** (default: 1)
- Maximum number of markers to track simultaneously
- Range: 1-10 (higher values impact performance)
- Recommended: 3-5 for balanced performance

**autoStart** (default: true)
- Automatically start AR on page load
- Set to `false` to manually control initialization

**uiLoading / uiScanning / uiError** (default: yes)
- Built-in UI overlays for different states
- Set to `no` for custom UI implementation

**filterMinCF / filterBeta** (advanced)
- Tracking filter parameters for smoothing
- Default values work well for most cases

#### A-Frame Renderer Configuration

**colorManagement** (recommended: true)
- Proper color space handling for realistic rendering

**physicallyCorrectLights** (recommended: true)
- Accurate light attenuation and behavior

**antialias** (recommended: true)
- Smooth edges (slight performance cost)

**alpha** (recommended: true)
- Transparent canvas for AR overlay

### Step 4: Camera Permissions & Error Handling

#### Request Camera Access
```javascript
// Camera permission handling
async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // Permission granted
    console.log('Camera access granted');
    
    // Stop preview stream (MindAR will request again)
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('Camera access denied:', error);
    return false;
  }
}

// Call before initializing AR scene
requestCameraPermission().then(granted => {
  if (granted) {
    initializeARScene();
  } else {
    showCameraPermissionError();
  }
});
```

#### Handle AR Initialization Errors
```javascript
const sceneEl = document.querySelector('a-scene');

sceneEl.addEventListener('arReady', () => {
  console.log('MindAR initialized successfully');
  hideLoadingUI();
});

sceneEl.addEventListener('arError', (event) => {
  console.error('MindAR error:', event.detail);
  showErrorMessage('AR initialization failed. Please check camera permissions.');
});
```

### Step 5: React Integration (Optional)

#### React Component Wrapper
```typescript
import { useEffect, useRef, useState } from 'react';

interface ARSceneProps {
  markerPath: string;
  maxTrack?: number;
  onReady?: () => void;
  onError?: (error: any) => void;
}

export function ARScene({ markerPath, maxTrack = 1, onReady, onError }: ARSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!sceneRef.current) return;

    const handleReady = () => {
      setIsReady(true);
      onReady?.();
    };

    const handleError = (event: any) => {
      onError?.(event.detail);
    };

    const scene = sceneRef.current.querySelector('a-scene');
    scene?.addEventListener('arReady', handleReady);
    scene?.addEventListener('arError', handleError);

    return () => {
      scene?.removeEventListener('arReady', handleReady);
      scene?.removeEventListener('arError', handleError);
    };
  }, [onReady, onError]);

  return (
    <div ref={sceneRef}>
      <a-scene
        mindar-image={`imageTargetSrc: ${markerPath}; maxTrack: ${maxTrack}`}
        color-space="sRGB"
        renderer="colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false">
        
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        
        {/* Children can be passed as props for dynamic content */}
      </a-scene>
    </div>
  );
}
```

### Step 6: Performance Optimization

#### Initial Performance Checklist
- [ ] **Marker Count**: Limit to 3-5 simultaneous markers for smooth performance
- [ ] **Image Resolution**: Use 512x512px markers (good balance of quality/speed)
- [ ] **3D Complexity**: Keep polygon count low (<10k triangles per marker)
- [ ] **Texture Size**: Compress textures (max 1024x1024px)
- [ ] **Canvas Size**: Match device resolution (avoid oversized canvas)
- [ ] **Update Rate**: Throttle non-critical updates to 15-30 FPS

#### Monitor Performance
```javascript
const sceneEl = document.querySelector('a-scene');

// FPS monitoring
setInterval(() => {
  const fps = sceneEl.renderStarted ? 
    1000 / sceneEl.renderer.info.render.fps : 0;
  console.log(`Current FPS: ${fps.toFixed(1)}`);
}, 1000);

// Memory monitoring
setInterval(() => {
  const memory = performance.memory;
  console.log(`Memory: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
}, 5000);
```

## Troubleshooting Guide

### Marker Not Detected
1. **Check Border Thickness**: Should be 85% of image
2. **Verify Asymmetry**: Rotate marker 90° - should look different
3. **Increase Contrast**: Make foreground/background more distinct
4. **Simplify Design**: Remove fine details and gradients
5. **Test Distance**: Try 0.5m distance with good lighting
6. **Recompile Marker**: Use higher image size (1024px) in compiler

### Poor Tracking Stability (Jitter)
1. **Improve Marker Quality**: Follow design principles above
2. **Adjust Filter Settings**: Increase `filterBeta` for more smoothing
3. **Reduce 3D Complexity**: Lower polygon count in scene
4. **Optimize Lighting**: Ensure consistent, bright lighting
5. **Limit Marker Count**: Reduce `maxTrack` value

### Low FPS Performance
1. **Reduce Marker Count**: Lower `maxTrack` to 1-3
2. **Simplify 3D Content**: Remove complex models/animations
3. **Compress Textures**: Reduce texture sizes to 512x512px
4. **Disable Antialiasing**: Set `antialias: false` in renderer
5. **Lower Resolution**: Reduce canvas rendering resolution

### Camera Permission Issues
1. **HTTPS Required**: Camera access only works on HTTPS (or localhost)
2. **User Gesture**: Some browsers require user interaction before camera request
3. **Clear Site Data**: Reset camera permissions in browser settings
4. **Check Browser Support**: Verify WebRTC/getUserMedia support

## Best Practices

### Development Workflow
1. **Design Markers First**: Create high-quality markers before coding
2. **Test Early**: Verify marker recognition before building complex scenes
3. **Iterate on Performance**: Profile and optimize from day one
4. **Use Version Control**: Track `.mind` files and marker sources
5. **Document Marker IDs**: Maintain clear mapping of targetIndex → marker meaning

### Production Considerations
- **HTTPS Required**: Deploy on HTTPS for camera access
- **Mobile First**: Test on real mobile devices, not just desktop
- **Loading States**: Provide clear UI feedback during initialization
- **Error Recovery**: Handle camera failures and tracking loss gracefully
- **Fallback Content**: Offer non-AR alternative for unsupported devices

## Additional Resources

### Official Documentation
- **MindAR Docs**: https://hiukim.github.io/mind-ar-js-doc/
- **Marker Training Tool**: https://hiukim.github.io/mind-ar-js-doc/tools/compile
- **A-Frame Docs**: https://aframe.io/docs/

### Example Projects
- **MindAR Examples**: https://github.com/hiukim/mind-ar-js/tree/master/examples
- **CodePen Demos**: Search "MindAR" for interactive examples

### Community Support
- **GitHub Issues**: https://github.com/hiukim/mind-ar-js/issues
- **A-Frame Slack**: AR development community discussions

---

**Next Steps After Mastering This Skill:**
- Load `ar-state-machine` skill for complex AR state management
- Load `event-driven-ar` skill for React-AR event communication
- Load `multi-target-tracking` skill for advanced multi-marker systems
