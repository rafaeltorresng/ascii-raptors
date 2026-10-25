import * as frozenModels from './fixtures/approved-raptors-v0.2.js';
import * as frozenKite from './fixtures/approved-kite-v0.1.js';
import type { flightPose } from '../src/flight.ts';
import type { getSpecies } from '../src/species.ts';

// The frozen bundles export these functions, but their historical declarations
// describe only the browser host. Keep this test-only adapter outside fixtures.
export const approvedSpecies = (frozenModels as unknown as { getSpecies: typeof getSpecies })
  .getSpecies;
export const approvedKitePose = (frozenKite as unknown as { flightPose: typeof flightPose })
  .flightPose;
