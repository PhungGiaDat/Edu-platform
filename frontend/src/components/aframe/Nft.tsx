// src/components/aframe/Nft.tsx
import React, { useEffect, useRef, memo, useImperativeHandle, forwardRef } from 'react';
import type { AFrameEntity } from '@/types/aframe'; 
import type { INftMarkerProps } from '@/core/interfaces/IAFrameProps';
import { AREvent } from '@/core/types/AREvents';

export const Nft = memo(
  forwardRef<HTMLElement, INftMarkerProps>(
    (
      {
        type,
        url,
        markerId,
        target,
        eventBus,
        markerStateManager,
        children,
        smooth = 'true',
        smoothCount = '10',
        smoothTolerance = '0.01',
        smoothThreshold = '5',
        ...otherProps
      },
      ref
    ) => {
      const nftRef = useRef<HTMLElement>(null);
      const isInitializedRef = useRef(false);

      useImperativeHandle(ref, () => nftRef.current!);

      useEffect(() => {
        const element = nftRef.current as AFrameEntity | null;
        
        if (!element) {
          console.warn('⚠️ NFT: Element not found');
          return;
        }

        if (!eventBus || !markerStateManager) {
          console.warn('⚠️ NFT: Missing dependencies', {
            markerId,
            hasEventBus: !!eventBus,
            hasMarkerStateManager: !!markerStateManager
          });
          return;
        }

        const hasNftTracking = element.components?.['arjs-tracked-controls'];
        if (isInitializedRef.current && hasNftTracking) {
          console.log('✅ NFT already initialized:', markerId);
          return;
        }

        console.log('🔧 Initializing NFT marker:', {
          markerId,
          url,
          hasTracking: !!hasNftTracking,
          components: Object.keys(element.components || {})
        });

        // ========== CRITICAL: Manually initialize AR.js NFT tracking ==========
        const initializeNftTracking = () => {
          const sceneEl = element.sceneEl;
          if (!sceneEl) {
            console.warn('⚠️ NFT: Scene element not found');
            return;
          }

          // Access AR.js system
          const arjsSystem = (sceneEl as any).systems?.['arjs'];
          console.log('🔍 AR.js system found:', !!arjsSystem);

          // Check if arjs-anchor component exists
          const anchorComponent = element.components?.['arjs-anchor'];
          console.log('🔍 AR.js anchor component:', {
            exists: !!anchorComponent,
            url: url
          });

          // If anchor exists but NFT not loaded, try to force re-init
          if (anchorComponent) {
            console.log('🔄 Force re-initializing AR.js anchor...');
            
            // Try to access the internal markerControls
            const markerControls = (anchorComponent as any).markerControls;
            if (markerControls) {
              console.log('🔍 MarkerControls found:', markerControls);
            }
            
            // AR.js NFT uses ArMarkerControls internally
            // Check if it's trying to load NFT
            const arContext = arjsSystem?._arSession?.arContext;
            if (arContext) {
              console.log('🔍 AR Context:', {
                parameters: arContext.parameters,
                arController: !!arContext.arController
              });
            }
          }

          // Log AR.js internal state
          if (arjsSystem?._arSession) {
            console.log('🔍 AR.js session:', {
              hasArSource: !!arjsSystem._arSession.arSource,
              hasArContext: !!arjsSystem._arSession.arContext
            });
          }

          // FORCE: Manually trigger NFT load by accessing the component's internal init
          // This is a workaround for AR.js not auto-loading NFT when element is added dynamically
          if (anchorComponent && !anchorComponent._nftLoaded) {
            console.log('⚡ Attempting to manually trigger NFT load...');
            
            // Try to call init again or update
            try {
              if (typeof anchorComponent.init === 'function') {
                console.log('🔄 Calling anchor.init()...');
                // Don't call init directly as it may cause issues
                // Instead, try to trigger update
              }
              if (typeof anchorComponent.update === 'function') {
                console.log('🔄 Calling anchor.update()...');
                anchorComponent.update();
              }
            } catch (err) {
              console.error('❌ Error triggering NFT load:', err);
            }
          }
        };

        // Wait for element to be fully in DOM, then initialize
        requestAnimationFrame(() => {
          initializeNftTracking();
        });

        const handleMarkerFound = (e?: Event) => {
          console.log('📍 NFT Marker FOUND:', markerId, e);
          markerStateManager.markFound(markerId);
          eventBus.emit(AREvent.MARKER_FOUND, { markerId, target });
        };

        const handleMarkerLost = (e?: Event) => {
          console.log('👋 NFT Marker LOST:', markerId, e);
          markerStateManager.markLost(markerId);
          eventBus.emit(AREvent.MARKER_LOST, { markerId });
        };

        const handleNftLoading = (e: Event) => {
          console.log('📥 NFT Loading:', markerId, 'URL:', url, e);
        };

        const handleNftLoaded = (e: Event) => {
          console.log('✅ NFT Loaded:', markerId, e);
          
          setTimeout(() => {
            const children = Array.from(element.children || []) as Element[];
            console.log(`🔄 NFT ${markerId}: ${children.length} children`);
            
            children.forEach((child, index) => {
              const childEntity = child as unknown as AFrameEntity;
              if (childEntity.object3D) {
                console.log(`  Child ${index}: ${child.tagName}, visible: ${childEntity.object3D.visible}`);
              }
            });
          }, 100);
        };

        const handleNftError = (e: Event) => {
          console.error('❌ NFT Error:', markerId, e);
          eventBus.emit(AREvent.AR_ERROR, {
            error: new Error(`NFT loading failed: ${markerId}`),
            context: `NFT marker: ${url}`
          });
        };

        const setupListeners = () => {
          // AR.js NFT uses different event names!
          // Standard: 'markerFound', 'markerLost'
          // Alternative: 'nftmarker-found', 'nftmarker-lost' (AR.js specific)
          
          element.addEventListener('loading', handleNftLoading);
          element.addEventListener('loaded', handleNftLoaded);
          element.addEventListener('error', handleNftError);
          
          // Listen to both naming conventions for compatibility
          element.addEventListener('markerFound', handleMarkerFound);
          element.addEventListener('markerLost', handleMarkerLost);
          element.addEventListener('nftmarker-found', handleMarkerFound);
          element.addEventListener('nftmarker-lost', handleMarkerLost);

          console.log('✅ NFT event listeners registered:', markerId, '(both markerFound and nftmarker-found)');

          return () => {
            element.removeEventListener('loading', handleNftLoading);
            element.removeEventListener('loaded', handleNftLoaded);
            element.removeEventListener('error', handleNftError);
            element.removeEventListener('markerFound', handleMarkerFound);
            element.removeEventListener('markerLost', handleMarkerLost);
            element.removeEventListener('nftmarker-found', handleMarkerFound);
            element.removeEventListener('nftmarker-lost', handleMarkerLost);
            
            console.log('🧹 NFT cleanup:', markerId);
          };
        };

        let cleanup: (() => void) | undefined;

        if ((element as any).hasLoaded) {
          console.log('✅ NFT element already loaded:', markerId);
          cleanup = setupListeners();
        } else {
          console.log('⏳ Waiting for NFT element load:', markerId);
          
          const onElementLoaded = () => {
            console.log('✅ NFT element loaded event:', markerId);
            cleanup = setupListeners();
            element.removeEventListener('loaded', onElementLoaded);
          };
          
          element.addEventListener('loaded', onElementLoaded);
        }

        isInitializedRef.current = true;

        return cleanup;
      }, [url, markerId, target, eventBus, markerStateManager]);

      return (
        <a-nft
          ref={nftRef}
          type={type}
          url={url}
          smooth={smooth}
          smoothCount={smoothCount}
          smoothTolerance={smoothTolerance}
          smoothThreshold={smoothThreshold}
          registerevents="true"
          emitevents="true"
          {...otherProps}
        >
          {children}
        </a-nft>
      );
    }
  )
);

Nft.displayName = 'Nft';