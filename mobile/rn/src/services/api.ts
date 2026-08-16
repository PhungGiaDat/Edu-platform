import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
  AuthResponse,
  RegisterRequest,
  RegisterResponse,
  ARExperienceResponse,
} from '../types/api';
import type {
  AddXpRequest,
  AddXpResponse,
  AddXpEventRequest,
  AddXpEventResponse,
  StreakData,
  UserStats,
} from '../types/gamification';
import { toAddXpEventWireRequest } from '../types/gamification';
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
  QuizActivityHydration,
  QuizActivityAnswerRequest,
  QuizActivityAnswerResult,
  MiniGameActivityHydration,
  MiniGameCompleteResult,
  VocabularyActivityHydration,
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
      // [DEBUG-AUTH] Temporarily log token presence to diagnose 401
      console.log(
        `[DEBUG-AUTH] ${config.method?.toUpperCase()} ${config.url} token=${
          token ? `${token.slice(0, 20)}…(${token.length})` : 'NONE'
        }`,
      );
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // [DEBUG-AUTH] Surface the missing-token case so we can see it
        console.warn(`[DEBUG-AUTH] no JWT for ${config.url}`);
      }
    } catch (e) {
      // [DEBUG-AUTH] Surface SecureStore failures (they were previously silent)
      console.warn(`[DEBUG-AUTH] SecureStore.getItemAsync threw`, e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // [DEBUG-AUTH] Log full 401 context: URL, status, and whether we deleted the token
    if (error.response?.status === 401) {
      console.warn(
        `[DEBUG-AUTH] 401 on ${error.config?.method?.toUpperCase()} ${
          error.config?.url
        } — deleting stored JWT`,
        { responseData: error.response?.data },
      );
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
    return Promise.reject(error);
  }
);

export interface AuthApi {
  /**
   * POST /auth/login — backend uses `OAuth2PasswordRequestForm`, which
   * requires `application/x-www-form-urlencoded` with `username` + `password`
   * fields. RN historically sent JSON; this client now mirrors the contract
   * used by `frontend-web/src/contexts/AuthContext.tsx`.
   */
  login: (email: string, password: string) => Promise<AxiosResponse<AuthResponse>>;
  /**
   * POST /auth/register — backend accepts JSON `UserCreate` and returns
   * `UserResponse` (no token). The screen posts register, then auto-logs in
   * via `login()` to obtain a JWT.
   */
  register: (payload: RegisterRequest) => Promise<AxiosResponse<RegisterResponse>>;
  me: () => Promise<AxiosResponse<import('../types/api').UserMe>>;
}

export const authApi: AuthApi = {
  login: async (email: string, password: string) => {
    // Backend expects OAuth2PasswordRequestForm (form-encoded, not JSON).
    const formBody = new URLSearchParams();
    formBody.append('username', email);
    formBody.append('password', password);

    return api.post<AuthResponse>('/auth/login', formBody.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register: async (payload: RegisterRequest) => {
    return api.post<RegisterResponse>('/auth/register', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  },
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

  getQuizActivity: (courseId: string, lessonId: string, activityId: string) =>
    api.get<QuizActivityHydration>(`/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/quiz`),

  submitQuizActivityAnswer: (courseId: string, lessonId: string, activityId: string, payload: QuizActivityAnswerRequest) =>
    api.post<QuizActivityAnswerResult>(`/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/quiz/answers`, payload),
  getVocabularyActivity: (courseId: string, lessonId: string, activityId: string) =>
    api.get<VocabularyActivityHydration>(`/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/vocabulary`),
  getMiniGameActivity: (courseId: string, lessonId: string, activityId: string) =>
    api.get<MiniGameActivityHydration>(`/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/mini-game`),
  completeMiniGameActivity: (courseId: string, lessonId: string, activityId: string, matched_pair_ids: string[]) =>
    api.post<MiniGameCompleteResult>(`/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/mini-game/complete`, { matched_pair_ids }),

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

  /**
   * Idempotent XP event for C26 gamification.
   * Uses POST /gamification/xp-event with stable eventId.
   *
   * eventId must be:
   * - Stable: Generated ONCE at semantic event creation
   * - Unique: Different occurrences = different eventIds
   * - Reused: Same occurrence retries use SAME eventId
   */
  addXpEvent: (body: AddXpEventRequest) =>
    api.post<AddXpEventResponse>('/gamification/xp-event', toAddXpEventWireRequest(body)),
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
  addXpEvent: (body: AddXpEventRequest) =>
    api.post<AddXpEventResponse>('/gamification/xp-event', body),
};

export default api;
