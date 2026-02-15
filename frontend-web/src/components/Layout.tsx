import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { PetUnlockModal } from './pets/PetUnlockModal';
import { eventBus } from '@/runtime/EventBus';
import type { Pet } from '@/hooks/usePets';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [unlockedPet, setUnlockedPet] = useState<Pet | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);

    // Listen for PET_UNLOCKED events from anywhere in the app
    useEffect(() => {
        const handlePetUnlocked = (data: { pet: Pet }) => {
            setUnlockedPet(data.pet);
            setShowUnlockModal(true);
        };

        eventBus.on('PET_UNLOCKED', handlePetUnlocked);

        return () => {
            eventBus.off('PET_UNLOCKED', handlePetUnlocked);
        };
    }, []);

    const handleUnlockModalClose = useCallback(() => {
        setShowUnlockModal(false);
        setTimeout(() => setUnlockedPet(null), 300);
    }, []);

    const handleSetActiveFromModal = useCallback((petId: string) => {
        // Emit event so usePets hook can handle the API call
        eventBus.emit('PET_SET_ACTIVE_REQUEST' as any, { petId });
        setShowUnlockModal(false);
        setTimeout(() => setUnlockedPet(null), 300);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 flex">
            <Sidebar />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                {children}
            </main>

            {/* Global Pet Unlock Celebration Modal */}
            {unlockedPet && (
                <PetUnlockModal
                    pet={unlockedPet}
                    isOpen={showUnlockModal}
                    onClose={handleUnlockModalClose}
                    onSetActive={handleSetActiveFromModal}
                />
            )}
        </div>
    );
};
