// src/hooks/useARInjection.ts
import { useEffect, useCallback } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { ARTarget } from '@/types';

/**
 * Hook to handle event-driven AR content injection.
 * It listens for 'AR_DATA_LOADED' and automatically triggers 'CREATE_NFT_REQUEST' 
 * for the AR iframe container.
 */
export function useARInjection() {
    /**
     * Clear all current AR content
     */
    const clearAR = useCallback(() => {
        eventBus.emit('CLEAR_NFT_REQUEST', {});
    }, []);

    /**
     * Inject a set of targets manually
     */
    const injectTargets = useCallback((targets: ARTarget[]) => {
        if (!targets || targets.length === 0) return;

        console.log('[useARInjection] 🚀 Injecting targets:', targets);

        // Clear existing first
        clearAR();

        // Inject new targets
        targets.forEach(target => {
            eventBus.emit('CREATE_NFT_REQUEST', {
                markerId: target.tag,
                descriptorUrl: target.nft_base_url,
                modelUrl: target.model_3d_url || '',
                scale: target.scale,
                position: target.position,
                rotation: target.rotation
            });
        });
    }, [clearAR]);

    useEffect(() => {
        // Automatically handle data loaded event
        const handleDataLoaded = (data: any) => {
            if (data && data.targets) {
                console.log('[useARInjection] 📡 AR_DATA_LOADED received, auto-injecting...');
                injectTargets(data.targets);
            }
        };

        eventBus.on('AR_DATA_LOADED' as any, handleDataLoaded);

        return () => {
            eventBus.off('AR_DATA_LOADED' as any, handleDataLoaded);
        };
    }, [injectTargets]);

    return { injectTargets, clearAR };
}
