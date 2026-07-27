import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, ARExperienceResponse } from '../types/api';
import type {
  AddXpRequest,
  AddXpResponse,
  StreakData,
  UserStats,
} from '../types/gamification';
import type { ChangePetOutfitRequest, ChangePetOutfitResponse, ClearActivePetResponse, ListPetsParams, Pet, PetListResponse, SetActivePetRequest, UnlockPetResponse } from '../types/pet';
import type { PetCareActionResult, PetCareState, PetXPResponse } from '../types/petCare';
import type {
  CompleteLessonStats,
  Course,
  CourseDetail,
  Lesson,
  LessonSession,
  LessonStepAttemptPayload,
  LessonStepAttemptResponse,
  MediaAssetRecord,
  QuizSubmitResult,
  UserProgress,
} from '../types/course';
import { mapPetCareState, mapPetResponse } from './mappers';
import { TOKEN_KEY } from '../utils/secureStorage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Bearer token interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Silent fail — token retrieval is optional
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  me: () => api.get<import('../types/api').UserMe>('/auth/me'),
};

export const flashcardApi = {
  getFlashcard: (qrId: string) =>
    api.get<ARExperienceResponse>(`/flashcard/${qrId}`),
};

export const arConfigApi = {
  getStabilityConfig: () => api.get<{ stability_config: unknown }>('/ar/config'),
};

/**
 * coursesApi — typed courses + gamification client (per plan §1.1).
 *
 * Replaces the old `coursesApi` (which only exposed `getCourses` /
 * `getLessons`) with the 13 endpoints the lesson player + home screens need.
 * Also covers `/gamification/streak`, `/gamification/user/{id}`, and
 * `/gamification/add-xp` since those endpoints are owned by the courses
 * feature surface in the backend.
 */
export const coursesApi = {
  // ── Courses ──
  listCourses: (skip = 0, limit = 20) =>
    api.get<Course[]>('/courses', { params: { skip, limit } }),

  getCourse: (courseId: string) =>
    api.get<CourseDetail>(`/courses/${courseId}`),

  getLesson: (courseId: string, lessonId: string) =>
    api.get<Lesson>(`/courses/${courseId}/lessons/${lessonId}`),

  getLessonMedia: (courseId: string, lessonId: string) =>
    api.get<MediaAssetRecord[]>(
      `/courses/${courseId}/lessons/${lessonId}/media`,
    ),

  startCourse: (courseId: string, userId: string) =>
    api.post<UserProgress>(`/courses/${courseId}/start`, { user_id: userId }),

  // ── Lesson session ──
  startLessonSession: (courseId: string, lessonId: string) =>
    api.post<LessonSession>(
      `/courses/${courseId}/lessons/${lessonId}/session/start`,
    ),

  getLessonSession: (courseId: string, lessonId: string) =>
    api.get<LessonSession>(
      `/courses/${courseId}/lessons/${lessonId}/session`,
    ),

  submitLessonStep: (
    courseId: string,
    lessonId: string,
    payload: LessonStepAttemptPayload,
  ) =>
    api.post<LessonStepAttemptResponse>(
      `/courses/${courseId}/lessons/${lessonId}/steps/attempt`,
      payload,
    ),

  submitQuiz: (lessonId: string, answers: Record<string, string>) =>
    api.post<QuizSubmitResult>(`/quizzes/${lessonId}/submit`, {
      lesson_id: lessonId,
      answers,
    }),

  completeLesson: (lessonId: string, stats: CompleteLessonStats) =>
    api.post(`/lessons/${lessonId}/complete`, {
      lesson_id: lessonId,
      ...stats,
    }),

  // ── Progress ──
  getProgress: (userId: string) =>
    api.get<UserProgress[]>(`/users/${userId}/progress`),

  // ── Gamification (shared surface) ──
  getStreak: (userId: string) =>
    api.get<StreakData>(`/gamification/streak/${userId}`),

  getUserStats: (userId: string) =>
    api.get<UserStats>(`/gamification/user/${userId}`),

  addXp: (action: string, metadata?: Record<string, unknown>) =>
    api.post<AddXpResponse>('/gamification/add-xp', {
      action,
      metadata,
    } as AddXpRequest),
};

/**
 * petsApi — typed pet catalog + care client (per plan §1.3).
 *
 * `listPets`/`getPet`/`unlockPet`/`setActivePet`/`getActivePet`/
 * `clearActivePet` hit the catalog endpoints; the rest are care/evolution
 * actions owned by gamification. All responses are mapped to the canonical
 * RN shape (camelCase + snake_case keys exposed where the backend requires
 * them).
 */
export const petsApi = {
  // ── Catalog ──
  listPets: (params: ListPetsParams = {}) =>
    api
      .get<PetListResponse>('/pets', { params })
      .then((res) => ({
        ...res,
        data: {
          pets: res.data.pets.map((p) => ({
            ...p,
            // backend already returns camelCase-friendly fields; the mapper
            // is a no-op pass-through that documents the boundary.
            ...mapPetResponse(p),
          })),
          stats: res.data.stats,
        },
      })),

  getPet: (petId: string) =>
    api
      .get<Pet>(`/pets/${petId}`)
      .then((res) => ({ ...res, data: { ...res.data, ...mapPetResponse(res.data) } })),

  unlockPet: (petId: string) =>
    api
      .post<UnlockPetResponse>(`/pets/${petId}/unlock`)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          pet: res.data.pet ? { ...res.data.pet, ...mapPetResponse(res.data.pet) } : null,
        },
      })),

  setActivePet: (petId: string) =>
    api
      .put<Pet>('/pets/active', { pet_id: petId } as SetActivePetRequest)
      .then((res) => ({ ...res, data: { ...res.data, ...mapPetResponse(res.data) } })),

  getActivePet: () =>
    api
      .get<Pet | null>('/pets/active/current')
      .then((res) => ({
        ...res,
        data: res.data ? { ...res.data, ...mapPetResponse(res.data) } : null,
      })),

  clearActivePet: () => api.delete<ClearActivePetResponse>('/pets/active'),

  // ── Care / evolution ──
  getPetCareState: (userId: string) =>
    api
      .get(`/gamification/pet/${userId}`)
      .then((res) => ({
        ...res,
        data: mapPetCareState(res.data),
      } as { data: PetCareState; status: number; statusText: string; headers: any; config: any })),

  feedPet: () =>
    api
      .post<PetCareActionResult>('/gamification/pet/feed')
      .then((res) => ({ ...res, data: { ...res.data, ...mapPetCareState(res.data) } })),

  playWithPet: () =>
    api
      .post<PetCareActionResult>('/gamification/pet/play')
      .then((res) => ({ ...res, data: { ...res.data, ...mapPetCareState(res.data) } })),

  changePetOutfit: (outfit: ChangePetOutfitRequest['outfit']) =>
    api.post<ChangePetOutfitResponse>('/gamification/pet/outfit', { outfit }),

  getPetXP: (userId: string) =>
    api.get<PetXPResponse>(`/gamification/pet-xp/${userId}`),
};

// ── Backwards-compat aliases (foundation services) ──
// These keep the existing `useCourses` / `useCourseDetail` / `usePets`
// hooks compiling through Phase 0.
export const courseService = {
  listCourses: () =>
    api
      .get<Course[]>('/courses', { params: { skip: 0, limit: 20 } })
      .then((res) => ({
        ...res,
        data: res.data,
      })),
  getCourse: (courseId: string) =>
    api.get<CourseDetail>(`/courses/${courseId}`),
  listLessons: (courseId: string) =>
    api.get<Lesson[]>(`/courses/${courseId}/lessons/`),
};

export const petService = {
  listPets: () =>
    api
      .get<PetListResponse>('/pets')
      .then((res) => ({ ...res, data: res.data.pets })),
  getPet: (petId: string) => api.get<Pet>(`/pets/${petId}`),
};

export const gamificationService = {
  getProfile: (userId?: string) =>
    userId
      ? api.get<UserStats>(`/gamification/user/${userId}`)
      : api.get<UserStats>('/gamification/me'),
  listBadges: () => api.get<unknown[]>('/gamification/badges'),
  awardXp: (body: AddXpRequest) =>
    api.post<AddXpResponse>('/gamification/add-xp', body),
};

export default api;