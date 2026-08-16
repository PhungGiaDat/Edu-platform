/**
 * @file pets-screen-active-pet.test.ts — source-contract tests for PetsScreen active-pet + care-state wiring.
 *
 * Verifies the minimum RN implementation for Task #6:
 *   1. PetsScreen seeds from useUser().activePet
 *   2. PetsScreen loads care stats from petsApi.getPetCareState(userId)
 *   3. PetsScreen persists selection through usePets().setActivePet
 *   4. care stats are built from real care-state values, not placeholders
 *   5. new localized pet strings are used for sections/error/CTA states
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const PETS_SCREEN_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/screens/PetsScreen.tsx';
const USE_PETS_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/hooks/usePets.ts';
const PET_MODEL_VIEWER_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/components/pets/PetModelViewer.tsx';
const EN_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/i18n/en.json';
const VI_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/i18n/vi.json';

const petsScreenSrc = readFileSync(PETS_SCREEN_PATH, 'utf-8');
const usePetsSrc = readFileSync(USE_PETS_PATH, 'utf-8');
const petModelViewerSrc = readFileSync(PET_MODEL_VIEWER_PATH, 'utf-8');
const enSrc = readFileSync(EN_PATH, 'utf-8');
const viSrc = readFileSync(VI_PATH, 'utf-8');

describe('PetsScreen Task #6 — active pet + care-state wiring', () => {
  it('reads userId and activePet from useUser', () => {
    assert.ok(
      petsScreenSrc.includes("import { useUser } from '../hooks/useUser';"),
      'PetsScreen should import useUser',
    );
    assert.ok(
      petsScreenSrc.includes('const { userId, activePet: userActivePet } = useUser();'),
      'PetsScreen should read userId and activePet from useUser()',
    );
    assert.ok(
      petsScreenSrc.includes('setSelectedPetId(userActivePet.pet_id);'),
      'PetsScreen should seed selectedPetId from the user active pet',
    );
  });

  it('loads pet care state from petsApi.getPetCareState(userId)', () => {
    assert.ok(
      petsScreenSrc.includes("import { petsApi } from '../services/api';"),
      'PetsScreen should import petsApi',
    );
    assert.ok(
      petsScreenSrc.includes('.getPetCareState(userId)'),
      'PetsScreen should load care state by user id',
    );
    assert.ok(
      petsScreenSrc.includes("setCareStateError(t('pets.careLoadFailed'));"),
      'PetsScreen should localize care-state load failures',
    );
  });

  it('persists active pet selection through usePets.setActivePet', () => {
    assert.ok(
      usePetsSrc.includes('setActivePet: (petId: string) => Promise<Pet | null>;'),
      'usePets should expose setActivePet in its public result',
    );
    assert.ok(
      usePetsSrc.includes('const response = await petsApi.setActivePet(petId);'),
      'usePets should call petsApi.setActivePet',
    );
    assert.ok(
      petsScreenSrc.includes('const { pets, loading, refreshing, error, refresh, getPet, setActivePet } = usePets();'),
      'PetsScreen should read setActivePet from usePets',
    );
    assert.ok(
      petsScreenSrc.includes('Promise.all([setActivePet(pet.pet_id), getPet(pet.pet_id)])'),
      'PetsScreen should persist the selected pet before resolving its details',
    );
  });

  it('builds stats from real care-state values instead of placeholders', () => {
    assert.ok(
      petsScreenSrc.includes('function buildStats(careState: PetCareState): PetCareStat[] {'),
      'PetsScreen should build stats from PetCareState',
    );
    assert.ok(
      petsScreenSrc.includes("{ key: 'happiness', label: 'Happiness', value: normalize(careState.happiness / 100) }"),
      'Happiness should come from careState.happiness',
    );
    assert.ok(
      petsScreenSrc.includes("{ key: 'energy', label: 'Energy', value: normalize(careState.energy / 100) }"),
      'Energy should come from careState.energy',
    );
    assert.ok(
      petsScreenSrc.includes("{ key: 'hunger', label: 'Hunger', value: normalize(careState.hunger / 100) }"),
      'Hunger should come from careState.hunger',
    );
    assert.ok(
      petsScreenSrc.includes("{ key: 'xp', label: 'XP', value: normalize(careState.xpEarned / 100) }"),
      'XP should come from careState.xpEarned',
    );
  });

  it('renders the active pet through the native GLB viewer', () => {
    assert.ok(
      petsScreenSrc.includes("import { PetModelViewer } from '../components/pets/PetModelViewer';"),
      'PetsScreen should import the native GLB viewer',
    );
    assert.ok(
      petsScreenSrc.includes('<PetModelViewer pet={activePet} />'),
      'PetsScreen should render the selected active pet in the viewer',
    );
    assert.ok(
      petModelViewerSrc.includes("import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';"),
      'PetModelViewer should use R3F native renderer',
    );
    assert.ok(
      petModelViewerSrc.includes("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"),
      'PetModelViewer should load GLB assets with GLTFLoader',
    );
    assert.ok(
      petModelViewerSrc.includes('.downloadGLB(pet.model_url)'),
      'PetModelViewer should cache the backend-provided model_url before rendering',
    );
    assert.ok(
      petModelViewerSrc.includes('if (failed) {'),
      'PetModelViewer should enter fallback mode after download or render failure',
    );
    assert.ok(
      petModelViewerSrc.includes('pet.thumbnail_url'),
      'PetModelViewer fallback should prefer the supplied 2D pet thumbnail',
    );
  });

  it('uses localized pet copy for sections and CTA states', () => {
    assert.ok(
      petsScreenSrc.includes("{t('pets.yourPets')}"),
      'PetsScreen should localize the your pets section label',
    );
    assert.ok(
      petsScreenSrc.includes("{t('pets.allPets')}"),
      'PetsScreen should localize the all pets section label',
    );
    assert.ok(
      petsScreenSrc.includes("{isSelectingPet ? t('pets.updatingActivePet') : t('pets.activePetCta')}"),
      'PetsScreen should localize the active-pet CTA state',
    );
    assert.ok(enSrc.includes('"careLoadFailed": "Could not load pet care stats"'));
    assert.ok(enSrc.includes('"activePetFailed": "Could not update the active pet"'));
    assert.ok(viSrc.includes('"careLoadFailed": "Không thể tải chỉ số chăm sóc thú cưng"'));
    assert.ok(viSrc.includes('"activePetFailed": "Không thể cập nhật thú cưng đang dùng"'));
  });
});
