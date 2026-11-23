// Compatibility export. The pets feature owns this implementation.
export { usePets } from '@/features/pets/hooks/usePets';
export type {
  UnlockCondition,
  Pet,
  PetStats,
  PetListResponse,
  UnlockPetResponse,
  SetActivePetResponse,
  PetEventType,
} from '@/features/pets/hooks/usePets';
export { default } from '@/features/pets/hooks/usePets';
