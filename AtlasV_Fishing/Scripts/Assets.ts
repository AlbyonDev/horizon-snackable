/**
 * Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create a new .hstf template in Horizon Studio.
 *   2. Add an entry here.
 */
import { TemplateAsset } from 'meta/worlds';

export namespace Assets {
  
  // ── Scene Elements ────────────────────────────────────────────────────────────
  export const BubbleTemplate = new TemplateAsset('@Templates/Bubble.hstf');

  // ── UI Effects ──────────────────────────────────────────────────────────────
  export const GoldCoinsAnimator = new TemplateAsset('@Templates/GameplayObjects/GoldCoinsAnimator.hstf');
}
