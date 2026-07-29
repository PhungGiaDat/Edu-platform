/**
 * petService / petService re-export — see ./api.ts for the new typed
 * `petsApi` client. This file remains as a backwards-compatible surface for
 * callers that imported `petService` from `'../services/api'`; it is now a
 * thin wrapper around `petsApi`.
 */
export { petService } from './api';
export { petService as default } from './api';