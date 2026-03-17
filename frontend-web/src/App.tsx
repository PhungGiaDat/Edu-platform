import React, { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import LearnARV2 from "./pages/LearnARV2";
import { CourseList } from "./pages/CourseList";
import { CourseDetail } from "./pages/CourseDetail";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { LandingPage } from "./pages/LandingPage";
import { ProgressDashboard } from "./pages/ProgressDashboard";
import { LearningPathSetup } from "./pages/LearningPathSetup";
import { Layout } from "./components/Layout";
import { AIChatBuddy } from "./components/AIChatBuddy";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PetUnlockModal } from "./components/pets";
import { eventBus } from "./runtime/EventBus";
import { usePets, type Pet } from "./hooks/usePets";
import { getApiBase } from "./config";

// ========== Global Pet Unlock Notifier ==========
// Listens to PET_CAN_UNLOCK (XP gate met) and PET_UNLOCKED (after actual unlock)
// Shows PetUnlockModal as a global overlay on any page

const USER_ID = "demo-user"; // TODO: replace with real auth user ID
const API_BASE = getApiBase();
const SESSION_KEY = "pet_notified_ids";

/** Load notified pet IDs from sessionStorage (resets on tab close) */
function loadNotifiedIds(): Set<string> {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/** Persist notified pet IDs to sessionStorage */
function saveNotifiedIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

const GlobalPetUnlockNotifier: React.FC = () => {
  const [modalPet, setModalPet] = useState<Pet | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queue of pets waiting to be shown — prevents mid-animation replacement
  const queueRef = useRef<Pet[]>([]);
  const isBusyRef = useRef(false);

  // Track notified pets across navigation within the tab (sessionStorage-backed)
  const notifiedIdsRef = useRef<Set<string>>(loadNotifiedIds());

  const { setActivePet } = usePets(USER_ID);

  const handleSetActive = useCallback(async (petId: string) => {
    await setActivePet(petId);
  }, [setActivePet]);

  /** Show the next pet in the queue, if any */
  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      isBusyRef.current = true;
      setModalPet(next);
      setIsModalOpen(true);
    } else {
      isBusyRef.current = false;
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    // Wait for PetUnlockModal's own 300ms fade-out, then advance the queue
    setTimeout(() => {
      setModalPet(null);
      showNext();
    }, 320);
  }, [showNext]);

  /** Enqueue a pet for the modal — skips if already shown this session */
  const enqueue = useCallback((pet: Pet, forceShow = false) => {
    if (!forceShow && notifiedIdsRef.current.has(pet.pet_id)) return;

    notifiedIdsRef.current.add(pet.pet_id);
    saveNotifiedIds(notifiedIdsRef.current);

    if (isBusyRef.current) {
      // Modal already open — queue for after current one closes
      queueRef.current.push(pet);
    } else {
      isBusyRef.current = true;
      setModalPet(pet);
      setIsModalOpen(true);
    }
  }, []);

  // Listen for PET_CAN_UNLOCK - emitted by useGamification after XP is added.
  // Fetches fresh data directly to avoid stale closure on pets state.
  useEffect(() => {
    const handleCanUnlock = async (_data: { userXP: number; userStreak: number; level: number }) => {
      try {
        const res = await fetch(`${API_BASE}/api/pets?user_id=${USER_ID}`);
        if (!res.ok) return;
        const { pets: freshPets } = await res.json();

        const newlyUnlockable: Pet[] = freshPets.filter(
          (p: Pet) => !p.is_unlocked && p.can_unlock && !notifiedIdsRef.current.has(p.pet_id)
        );

        // Enqueue all newly unlockable pets (most common case: just one)
        newlyUnlockable.forEach(pet => enqueue(pet));
      } catch (err) {
        console.error("[GlobalPetUnlockNotifier] Error checking unlockable pets:", err);
      }
    };

    eventBus.on("PET_CAN_UNLOCK", handleCanUnlock);
    return () => eventBus.off("PET_CAN_UNLOCK", handleCanUnlock);
  }, [enqueue]);

  // Listen for PET_UNLOCKED - emitted by usePets after a confirmed server unlock.
  // Always show celebration (forceShow=true), even if we notified before.
  useEffect(() => {
    const handleUnlocked = (data: { pet: Pet }) => {
      if (data?.pet) enqueue(data.pet, true);
    };

    eventBus.on("PET_UNLOCKED", handleUnlocked);
    return () => eventBus.off("PET_UNLOCKED", handleUnlocked);
  }, [enqueue]);

  if (!modalPet) return null;

  return (
    <PetUnlockModal
      pet={modalPet}
      isOpen={isModalOpen}
      onClose={handleClose}
      onSetActive={handleSetActive}
    />
  );
};

// ========== App ==========

const App = () => {
  return (
    <>
      <SpeedInsights />
      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route path="/flashcards" element={<Layout><FlashcardPage /></Layout>} />
        <Route path="/learn-ar" element={<LearnARV2 />} />
        <Route path="/courses" element={<Layout><CourseList /></Layout>} />
        <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/progress" element={<Layout><ProgressDashboard /></Layout>} />
        <Route path="/learning-path" element={<Layout><LearningPathSetup /></Layout>} />

        <Route path="/scan" element={<Navigate to="/learn-ar" replace />} />
      </Routes>

      {/* Global AI Chat Buddy - Floating on all pages */}
      <AIChatBuddy />

      {/* Global Pet Unlock Celebration Modal */}
      <GlobalPetUnlockNotifier />
    </>
  );
};

export default App;

