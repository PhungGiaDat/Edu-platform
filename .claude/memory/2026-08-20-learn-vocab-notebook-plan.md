---
name: learn-vocab-notebook-plan-2026
description: Plan cho 4 features: Sổ tay, Tra từ AI, TikTok Flashcards, Golden Moment notifications
metadata:
  type: project
---

# Learn Vocabulary & Notebook Plan

**Spec:** `docs/mobile_migration/spec/learn-vocab-notebook-spec.md`
**Plan:** `docs/mobile_migration/plans/2026-08-20-learn-vocab-notebook-plan.md`

## 4 Features

1. **Sổ tay (Notebook)** — Save words từ AI translation hoặc flashcard swipe, dùng SM-2 spaced repetition
2. **Tra từ (AI Dictionary)** — AI translation với Qdrant wiki context cho accurate, child-safe translations
3. **TikTok Flashcards** — Vertical swipe flashcard UI, organize by topic và IELTS bands
4. **Thời điểm vàng** — Push notification triggered quiz system với spaced repetition (hourly, daily, weekly, monthly)

## Tech Stack
- Frontend: React Native + Claymorphism + Three.js (@react-three/fiber)
- Backend: FastAPI + QdrantRAGService + SM-2 algorithm
- Notifications: Expo Notifications
- Database: PostgreSQL (Supabase)

## 8 Tasks
1. Database Schema Migration ✅ (SQL file created in plan)
2. Notebook CRUD API (backend)
3. Dictionary Translation API (backend)
4. Vocabulary Topics API (backend)
5. NotebookScreen (RN)
6. DictionaryScreen (RN)
7. SwipeFlashcardsScreen (RN) — react-native-gesture-handler + reanimated
8. Push Notification System (RN)

## UI Style
- Claymorphism (multi-layer shadows)
- Vibrant palette: sunshineYellow, skyBlue, mintGreen, coralPink, lavender
- 3D animated elements với Three.js

**Why:** User yêu cầu webapp vocabulary learning với spaced repetition notifications, AI translation từ wiki data.
