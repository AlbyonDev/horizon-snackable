import { Service, service } from 'meta/worlds';
import { FishInstance } from '../Types';
import { FishDataService } from './FishDataService';

/**
 * FishRegistry — Thin wrapper around FishDataService.
 *
 * Kept for backward compatibility with FishSpriteRenderer and HookController
 * which import from this module. Delegates all logic to FishDataService.
 */
@service()
export class FishRegistry extends Service {

  getInstance(fishId: number): FishInstance | undefined {
    return FishDataService.get().getInstance(fishId);
  }

  /** All active fish — delegates to FishDataService. */
  allActive(): IterableIterator<FishInstance> {
    return FishDataService.get().allActive();
  }

  /**
   * Find all free fish within collision range of the hook position.
   */
  findHits(hx: number, hy: number): FishInstance[] {
    return FishDataService.get().findHits(hx, hy);
  }
}
