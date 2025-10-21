// src/components/ARSceneARJS.tsx

import { useEffect, useRef } from 'react';
import type { ARTarget, ARCombo } from '../types';

// --- Component chính với kiến trúc v12.0 "React-in-A-Frame" ---

type Props = {
  isVisible: boolean;
  displayMode: '2D' | '3D';
  targets: ARTarget[];
  combo: ARCombo | null;
  onVideoReady: (video: HTMLVideoElement) => void;
};

export default function ARSceneARJS({ isVisible, displayMode, targets, combo, onVideoReady }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Effect 1: Khởi tạo và dọn dẹp scene A-Frame
  useEffect(() => {
    if (!isVisible || !sceneRef.current) return;
    
    console.log('🎬 ARSceneARJS v12.0: Initializing A-Frame scene...');
    
    const sceneContainer = sceneRef.current;
    sceneContainer.innerHTML = `
      <a-scene
        embedded
        renderer="colorManagement: true; logDepthBuffer: true;"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: true"
        arjs="sourceType: webcam; trackingMethod: best; debugUIEnabled: false;"
      >
        <a-entity id="camera-rig">
          <a-camera position="0 0 0" wasd-controls-enabled="false" look-controls-enabled="false">
            <a-cursor rayorigin="mouse"></a-cursor>
          </a-camera>
        </a-entity>
        <a-entity id="marker-container"></a-entity>
      </a-scene>
    `;

    const tryToFindAndStyleElements = () => {
      const sceneEl = sceneContainer.querySelector('a-scene') as HTMLElement | null;
      const videoEl = sceneContainer.querySelector('video') as HTMLVideoElement | null;

      if (sceneEl && videoEl) {
        console.log('🎥 ARSceneARJS v12.0: Found both scene and video, letting A-Frame manage layout...');
        
        // *** v12.0: LET A-FRAME MANAGE LAYOUT - NO FORCED CSS ***
        // Remove forced styling to let A-Frame handle aspect ratio naturally
        onVideoReady(videoEl);
        clearInterval(intervalId);
      } else {
        console.log('⏳ ARSceneARJS v12.0: Still looking for scene/video elements...');
      }
    };

    const intervalId = setInterval(tryToFindAndStyleElements, 250);

    return () => {
      clearInterval(intervalId);
      if (sceneContainer) sceneContainer.innerHTML = '';
    };
  }, [isVisible, onVideoReady]);

  // *** v12.0: Effect 2: Tự động tạo và cập nhật các thực thể A-Frame ***
  useEffect(() => {
    const sceneEl = sceneRef.current?.querySelector('a-scene');
    const markerContainer = sceneEl?.querySelector('#marker-container');
    if (!markerContainer || !targets.length) return;

    console.log('� ARSceneARJS v12.0: Creating A-Frame entities for', targets.length, 'targets');

    // 1. Xóa tất cả các marker cũ
    markerContainer.innerHTML = '';
    const foundMarkers = new Set<string>();

    // 2. Hàm helper để tạo nội dung cho một card
    const createCardContentHTML = (target: ARTarget) => `
        <a-plane
            id="plane-${target.tag}"
            src="${target.image_2d_url || ''}"
            position="${target.position || '0 0 0'}"
            rotation="${target.rotation || '0 0 0'}"
            scale="${target.scale || '1 1 1'}"
            visible="false"
        ></a-plane>
        <a-entity
            id="model-${target.tag}"
            gltf-model="${target.model_3d_url}"
            position="${target.position || '0 0 0'}"
            rotation="${target.rotation || '0 0 0'}"
            scale="${target.scale || '0.5 0.5 0.5'}"
            visible="false"
        ></a-entity>
    `;
    
    // 3. Tạo nội dung cho combo
    const comboHTML = combo ? `
        <a-entity id="combo-entity" visible="false">
             <a-plane
                id="combo-plane"
                src="${combo.image_2d_url || ''}"
                scale="1.5 1.5 1.5"
             ></a-plane>
             <a-entity
                id="combo-model"
                gltf-model="${combo.model_3d_url}"
             ></a-entity>
        </a-entity>
    ` : '';

    // 4. Tạo các marker <a-nft>
    targets.forEach(target => {
        const nft = document.createElement('a-nft');
        nft.setAttribute('type', 'nft');
        nft.setAttribute('url', target.nft_base_url);
        nft.setAttribute('emitevents', 'true');
        
        // Neo combo vào marker đầu tiên nếu có
        const isAnchor = combo && target.tag === combo.required_tags[0];
        nft.innerHTML = createCardContentHTML(target) + (isAnchor ? comboHTML : '');

        nft.addEventListener('markerFound', () => {
            console.log(`🎯 Marker found: ${target.tag}`);
            foundMarkers.add(target.tag);
            updateVisibility();
        });
        nft.addEventListener('markerLost', () => {
            console.log(`📤 Marker lost: ${target.tag}`);
            foundMarkers.delete(target.tag);
            updateVisibility();
        });

        markerContainer.appendChild(nft);
    });

    // 5. Logic cập nhật hiển thị
    const updateVisibility = () => {
        const isComboActive = combo ? combo.required_tags.every(tag => foundMarkers.has(tag)) : false;
        console.log('🔄 Updating visibility:', { foundMarkers: Array.from(foundMarkers), isComboActive, displayMode });

        // Cập nhật combo
        const comboEntity = markerContainer.querySelector('#combo-entity');
        if (comboEntity) {
            comboEntity.setAttribute('visible', isComboActive.toString());
            const comboPlane = comboEntity.querySelector('#combo-plane');
            const comboModel = comboEntity.querySelector('#combo-model');
            if (comboPlane) comboPlane.setAttribute('visible', (isComboActive && displayMode === '2D').toString());
            if (comboModel) comboModel.setAttribute('visible', (isComboActive && displayMode === '3D').toString());
        }

        // Cập nhật các card đơn lẻ
        targets.forEach(target => {
            const plane = markerContainer.querySelector(`#plane-${target.tag}`);
            const model = markerContainer.querySelector(`#model-${target.tag}`);
            if (plane) plane.setAttribute('visible', (!isComboActive && displayMode === '2D').toString());
            if (model) model.setAttribute('visible', (!isComboActive && displayMode === '3D').toString());
        });
    };
    
    updateVisibility(); // Cập nhật lần đầu

  }, [targets, combo, displayMode]);

  if (!isVisible) return null;

  // v12.0: Component chỉ render container rỗng, A-Frame quản lý phần còn lại
  return <div ref={sceneRef} className="w-full h-full" />;
}
