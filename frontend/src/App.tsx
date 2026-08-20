import React, { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import LearnARV2 from "./pages/LearnARV2";
// LearnAR8thWall temporarily disabled - XR in progress - TODO: fix imports
// TODO: Enable after XR implementation complete from "./pages/LearnAR8thWall";
import { CourseList } from "./pages/CourseList";
import { CourseDetail } from "./pages/CourseDetail";
import { LessonPlayer } from "./pages/LessonPlayer";
import { AnimalsAdventure } from "./pages/AnimalsAdventure";
import { AnimalsCourse } from "./pages/AnimalsCourse";
import { AnimalsLessonPlayer } from "./pages/AnimalsLessonPlayer";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { LandingPage } from "./pages/LandingPage";
import { ProgressDashboard } from "./pages/ProgressDashboard";
import { LearningPathSetup } from "./pages/LearningPathSetup";
import PetsPage from "./pages/PetsPage";
import StickersPage from "./pages/StickersPage";
import { Layout } from "./components/Layout";
import { AIChatBuddy } from "./components/AIChatBuddy";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PetUnlockModal } from "./components/pets";
import { eventBus } from "./runtime/EventBus";
import { usePets, type Pet } from "./hooks/usePets";
import { useAuth } from "./contexts/AuthContext";
import { getApiBase } from "./config";
import { apiClient } from "./services/apiClient";
import { SoundEffectService } from "./services/SoundEffectService";
import { GlobalSessionWatcher } from "./components/GlobalSessionWatcher";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudentList from "./pages/admin/StudentList";
import AdminStudentDetail from "./pages/admin/StudentDetail";
import AdminCourseManager from "./pages/admin/CourseManager";
import AdminFlashcardManager from "./pages/admin/FlashcardManager";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminGoalSettings from "./pages/admin/GoalSettings";
import AdminErrorBoundary from "./components/admin/AdminErrorBoundary";
import { CourseCreatePage, CourseEditPage } from "./pages/admin/CourseEditor";
import { DeckNewPage, DeckEditPage, CardNewPage, CardEditPage } from "./pages/admin/FlashcardEditor";
import FlashcardView from "./pages/public/FlashcardView";

// ========== Global Pet Unlock Notifier ==========
// Listens to PET_CAN_UNLOCK (XP gate met) and PET_UNLOCKED (after actual unlock)
// Shows PetUnlockModal as a global overlay on any page

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

  const { user } = useAuth();
  const { setActivePet } = usePets(user?.id || null);

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
    const handleCanUnlock = async () => {
      if (!user?.id) return;

      try {
        const { pets: freshPets } = await apiClient.get('/api/v1/pets');

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
  }, [user?.id, enqueue]);

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

// ========== Conditional AI Chat Buddy ==========
// Suppressed on /learn-ar to avoid z-index conflicts with AR overlays

const ConditionalAIChatBuddy: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isGuest } = useAuth();

  // Hide on AR page (z-index conflict) and all public/unauthenticated routes
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isARPage = location.pathname === '/learn-ar';

  if (isARPage || isPublicRoute) return null;
  if (!isAuthenticated && !isGuest) return null;

  return <AIChatBuddy />;
};

const RequireLearnerAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, isGuest } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequireUserAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, isGuest } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RequireTeacherRole: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  
  // Check if user has teacher/admin privileges
  const hasTeacherRole = user?.role === 'teacher' || user?.role === 'admin' || user?.is_superuser;
  
  if (!hasTeacherRole) {
    // Redirect non-teachers away from admin pages
    return <Navigate to="/profile" replace />;
  }
  
  return <>{children}</>;
};

// ========== App ==========

const App = () => {
  // Fire-and-forget warmup ping to wake Render free-tier from cold-start sleep.
  // This runs once on first page load so the backend is warmed by the time
  // the user navigates to any data-fetching page.
  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {/* ignore — best-effort warmup */});
  }, []);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      SoundEffectService.unlock().catch(() => {});
      // Remove listeners after first interaction
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return (
    <>
      <SpeedInsights />
      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public QR Code Route */}
        <Route path="/f/:qrId" element={<FlashcardView />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route path="/flashcards" element={<RequireUserAuth><Layout><FlashcardPage /></Layout></RequireUserAuth>} />
        <Route path="/learn-ar" element={<RequireLearnerAccess><LearnARV2 /></RequireLearnerAccess>} />
        {/* XR routes disabled - implementation in progress */}
        <Route path="/courses" element={<RequireLearnerAccess><Layout><CourseList /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/animals" element={<RequireLearnerAccess><Layout><AnimalsCourse /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/animals-adventure" element={<RequireLearnerAccess><Layout><AnimalsAdventure /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/animals-adventure/lessons/:id" element={<RequireLearnerAccess><Layout><AnimalsLessonPlayer /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/animals/lessons/:lessonId" element={<RequireLearnerAccess><Layout><AnimalsLessonPlayer /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/path/:pathId" element={<RequireLearnerAccess><Layout><CourseList /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/level/:level" element={<RequireLearnerAccess><Layout><CourseList /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/category/:category" element={<RequireLearnerAccess><Layout><CourseList /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/:id" element={<RequireLearnerAccess><Layout><CourseDetail /></Layout></RequireLearnerAccess>} />
        <Route path="/courses/:courseId/lessons/:lessonId" element={<RequireLearnerAccess><Layout><LessonPlayer /></Layout></RequireLearnerAccess>} />
        <Route path="/profile" element={<RequireUserAuth><Layout><Profile /></Layout></RequireUserAuth>} />
        <Route path="/progress" element={<RequireUserAuth><Layout><ProgressDashboard /></Layout></RequireUserAuth>} />
        <Route path="/learning-path" element={<RequireUserAuth><Layout><LearningPathSetup /></Layout></RequireUserAuth>} />

        <Route path="/pets" element={<RequireUserAuth><Layout><PetsPage /></Layout></RequireUserAuth>} />
        <Route path="/stickers" element={<RequireUserAuth><Layout><StickersPage /></Layout></RequireUserAuth>} />
        <Route path="/scan" element={<Navigate to="/learn-ar" replace />} />

        {/* Admin Routes - Require Teacher/Admin Role with Error Boundary */}
        <Route path="/admin" element={<RequireTeacherRole><AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/flashcards" element={<RequireTeacherRole><AdminErrorBoundary><AdminFlashcardManager /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/courses" element={<RequireTeacherRole><AdminErrorBoundary><AdminCourseManager /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/students" element={<RequireTeacherRole><AdminErrorBoundary><AdminStudentList /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/students/:userId" element={<RequireTeacherRole><AdminErrorBoundary><AdminStudentDetail /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/students/:userId/goals" element={<RequireTeacherRole><AdminErrorBoundary><AdminGoalSettings /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/analytics" element={<RequireTeacherRole><AdminErrorBoundary><AdminAnalytics /></AdminErrorBoundary></RequireTeacherRole>} />

        {/* Course CRUD Routes */}
        <Route path="/admin/courses/new" element={<RequireTeacherRole><AdminErrorBoundary><CourseCreatePage /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/courses/:courseId/edit" element={<RequireTeacherRole><AdminErrorBoundary><CourseEditPage /></AdminErrorBoundary></RequireTeacherRole>} />

        {/* Flashcard CRUD Routes */}
        <Route path="/admin/flashcards/new-deck" element={<RequireTeacherRole><AdminErrorBoundary><DeckNewPage /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/flashcards/:deckId/edit" element={<RequireTeacherRole><AdminErrorBoundary><DeckEditPage /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/flashcards/:deckId/new" element={<RequireTeacherRole><AdminErrorBoundary><CardNewPage /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/flashcards/:deckId/:cardId" element={<RequireTeacherRole><AdminErrorBoundary><CardEditPage /></AdminErrorBoundary></RequireTeacherRole>} />
        <Route path="/admin/flashcards/:deckId/:cardId/edit" element={<RequireTeacherRole><AdminErrorBoundary><CardEditPage /></AdminErrorBoundary></RequireTeacherRole>} />
      </Routes>

      {/* Global AI Chat Buddy - Hidden on AR page to avoid z-index conflicts */}
      <ConditionalAIChatBuddy />

      {/* Global Pet Unlock Celebration Modal */}
      <GlobalPetUnlockNotifier />

      {/* Global Session Break Reminder */}
      <GlobalSessionWatcher />
    </>
  );
};

export default App;
