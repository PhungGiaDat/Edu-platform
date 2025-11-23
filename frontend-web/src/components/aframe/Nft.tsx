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

        const handleMarkerFound = () => {
          console.log('📍 Marker found:', markerId);
          markerStateManager.markFound(markerId);
          eventBus.emit(AREvent.MARKER_FOUND, { markerId, target });
        };

        const handleMarkerLost = () => {
          console.log('❌ Marker lost:', markerId);
          markerStateManager.markLost(markerId);
          eventBus.emit(AREvent.MARKER_LOST, { markerId });
        };

        const handleNftLoading = (e: Event) => {
          console.log('📥 NFT Loading:', markerId, e);
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
          element.addEventListener('loading', handleNftLoading);
          element.addEventListener('loaded', handleNftLoaded);
          element.addEventListener('error', handleNftError);
          element.addEventListener('markerFound', handleMarkerFound);
          element.addEventListener('markerLost', handleMarkerLost);

          console.log('✅ NFT event listeners registered:', markerId);

          return () => {
            element.removeEventListener('loading', handleNftLoading);
            element.removeEventListener('loaded', handleNftLoaded);
            element.removeEventListener('error', handleNftError);
            element.removeEventListener('markerFound', handleMarkerFound);
            element.removeEventListener('markerLost', handleMarkerLost);
            
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
          {...otherProps}
        >
          {children}
        </a-nft>
      );
    }
  )
);

Nft.displayName = 'Nft';