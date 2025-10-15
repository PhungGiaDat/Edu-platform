// Nft.tsx - FIXED VERSION with force visibility
import React, { useEffect, useRef } from 'react';

interface NftProps {
  type: 'nft';
  url: string;
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  children?: React.ReactNode;
}

export const Nft: React.FC<NftProps> = ({ 
  type, 
  url, 
  onMarkerFound, 
  onMarkerLost, 
  children 
}) => {
  const nftRef = useRef<any>(null);

  useEffect(() => {
    const element = nftRef.current;
    if (!element) {
      console.log('❌ NFT element not found');
      return;
    }

    console.log('🎯 NFT Component mounted:', {
      url,
      type,
      hasElement: !!element,
      isLoaded: element.hasLoaded,
      childrenCount: element.children?.length
    });

    const setupListeners = () => {
      const onNftLoading = (e: any) => {
        console.log('📥 NFT Loading started:', url, e);
      };

      const onNftLoaded = (e: any) => {
        console.log('✅ NFT Loaded successfully:', url, e);
        
        // 🔥 FIX: Force children visibility after marker loads
        setTimeout(() => {
          const children = Array.from(element.children || []);
          console.log(`🔄 NFT loaded, found ${children.length} children`);
          
          children.forEach((child: any, index) => {
            if (child.object3D) {
              console.log(`👶 Child ${index}: ${child.tagName}, visible: ${child.object3D.visible}`);
            }
          });
        }, 100);
      };

      const onNftError = (e: any) => {
        console.error('❌ NFT Load error:', url, e);
      };

      const onFound = (e: any) => {
        console.log('🎯🎯🎯 MARKER FOUND EVENT FIRED! 🎯🎯🎯', {
          url,
          event: e,
          timestamp: Date.now()
        });
        
        // 🔥 FIX: Force all children visible when marker found
        setTimeout(() => {
          const children = Array.from(element.children || []);
          children.forEach((child: any) => {
            if (child.object3D) {
              child.object3D.visible = true;
              console.log('👁️ Forced visible:', child.tagName);
            }
          });
        }, 50);
        
        onMarkerFound?.();
      };

      const onLost = (e: any) => {
        console.log('❌ MARKER LOST EVENT FIRED!', {
          url,
          event: e,
          timestamp: Date.now()
        });
        onMarkerLost?.();
      };

      element.addEventListener('arjs-nft-loading-start', onNftLoading);
      element.addEventListener('arjs-nft-loaded', onNftLoaded);
      element.addEventListener('arjs-nft-load-error', onNftError);
      element.addEventListener('markerFound', onFound);
      element.addEventListener('markerLost', onLost);

      console.log('✅ Event listeners attached');

      setTimeout(() => {
        const arjsAnchor = element.components?.['arjs-anchor'];
        if (arjsAnchor) {
          console.log('✅ arjs-anchor found:', arjsAnchor.data);
        }
        console.log('📋 Components:', Object.keys(element.components || {}));
      }, 500);

      return () => {
        element.removeEventListener('arjs-nft-loading-start', onNftLoading);
        element.removeEventListener('arjs-nft-loaded', onNftLoaded);
        element.removeEventListener('arjs-nft-load-error', onNftError);
        element.removeEventListener('markerFound', onFound);
        element.removeEventListener('markerLost', onLost);
      };
    };

    if (element.hasLoaded) {
      console.log('🚀 NFT element already loaded');
      return setupListeners();
    }

    const onLoaded = () => {
      console.log('🚀 NFT element loaded event');
      return setupListeners();
    };

    element.addEventListener('loaded', onLoaded, { once: true });

    return () => {
      element.removeEventListener('loaded', onLoaded);
    };
  }, [url, onMarkerFound, onMarkerLost]);

  console.log('🔄 Rendering NFT with URL:', url);

  return (
    // @ts-ignore: A-Frame NFT tag
    <a-nft
      ref={nftRef}
      type={type}
      url={url}
      smooth="true"
      smoothCount="10"
      smoothTolerance="10"
      smoothThreshold="2"
    >
      {children}
    </a-nft>
  );
};