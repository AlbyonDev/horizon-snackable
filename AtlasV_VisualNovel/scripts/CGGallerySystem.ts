/**
 * CGGallerySystem — Manages CG (Computer Graphics) gallery unlocks and state.
 * Handles: CG unlock tracking, serialization for save/load, gallery display data.
 *
 * CGs are declared per-character on each CharacterConfig (see CharacterData_*.ts)
 * and aggregated here via the CharacterRegistry, so adding a new character
 * auto-registers their CGs without touching this file.
 */

import type { CGData, CGGalleryCard } from './Types';
import type { TextureAsset } from 'meta/worlds';
import { characterRegistry } from './CharacterRegistry';

// Map from old CG IDs to new IDs (backward compat for legacy saves).
const CG_ID_MIGRATION: Record<string, string> = {
  'nereia_love_end': 'ending_nereia_reel',
};

/**
 * CG ID → TextureAsset, derived dynamically from the character registry.
 * Always reflects current registry contents — adding a new character with CGs
 * immediately works without touching this file.
 */
export function getCGTextureMap(): Record<string, TextureAsset> {
  return characterRegistry.getCGTextureMap();
}

export class CGGallerySystem {
  private unlockedCGs: Set<string> = new Set();
  private cgViewerActive: boolean = false;
  private currentViewingCG: string | null = null;
  private viewerFadeAlpha: number = 0;

  // === CG Unlock Management ===

  /**
   * Unlock a CG by ID. Returns true if newly unlocked.
   * Silently no-ops if the CG isn't declared by any registered character
   * (so NPCs without portrait/ending CGs don't pollute the unlock set).
   */
  unlockCG(cgId: string): boolean {
    if (this.unlockedCGs.has(cgId)) return false;
    if (!this.getCG(cgId)) return false;
    this.unlockedCGs.add(cgId);
    console.log(`[CGGallerySystem] CG unlocked: ${cgId}`);
    return true;
  }

  /** Unlock a portrait CG for a fish (called on first encounter). */
  unlockPortraitCG(fishId: string): boolean {
    const portraitId = `portrait_${fishId}`;
    return this.unlockCG(portraitId);
  }

  /** Check if a CG is unlocked */
  isCGUnlocked(cgId: string): boolean {
    return this.unlockedCGs.has(cgId);
  }

  /** Get all CG definitions (aggregated from every registered character). */
  getAllCGs(): CGData[] {
    return characterRegistry.getAllCGs();
  }

  /** Get CGs for a specific character */
  getCGsForCharacter(characterId: string): CGData[] {
    return characterRegistry.getCharacter(characterId)?.cgs ?? [];
  }

  /** Look up a single CG definition by id. */
  getCG(cgId: string): CGData | undefined {
    return this.getAllCGs().find(cg => cg.id === cgId);
  }

  /** Get the texture for a CG id, falling back to the default character's portrait. */
  getCGTexture(cgId: string): TextureAsset {
    const tex = characterRegistry.getCGTextureMap()[cgId];
    if (tex) return tex;
    return characterRegistry.getCharacter(characterRegistry.getDefaultCharacterId())!.portraitTexture;
  }

  /** Get total and unlocked counts (counts only CGs declared in the registry). */
  getProgress(): { total: number; unlocked: number } {
    const all = this.getAllCGs();
    let unlocked = 0;
    for (const cg of all) if (this.unlockedCGs.has(cg.id)) unlocked++;
    return { total: all.length, unlocked };
  }

  /** Get gallery cards for XAML grid display */
  getGalleryCards(): CGGalleryCard[] {
    return this.getAllCGs().map(cg => ({
      id: cg.id,
      name: cg.name,
      characterId: cg.characterId,
      isUnlocked: this.unlockedCGs.has(cg.id),
      thumbnailPath: cg.thumbnailPath,
      thumbnailTexture: cg.thumbnailTexture,
    }));
  }

  // === CG Viewer State ===

  /** Open fullscreen CG viewer */
  openViewer(cgId: string): void {
    this.cgViewerActive = true;
    this.currentViewingCG = cgId;
    this.viewerFadeAlpha = 0;
    console.log(`[CGGallerySystem] Viewer opened: ${cgId}`);
  }

  /** Close fullscreen CG viewer */
  closeViewer(): void {
    this.cgViewerActive = false;
    this.currentViewingCG = null;
    this.viewerFadeAlpha = 0;
    console.log('[CGGallerySystem] Viewer closed');
  }

  /** Update viewer fade animation. Returns current alpha. */
  updateViewer(dt: number): number {
    if (this.cgViewerActive && this.viewerFadeAlpha < 1) {
      this.viewerFadeAlpha = Math.min(1, this.viewerFadeAlpha + dt * 2.5); // 0.4s fade-in
    }
    return this.viewerFadeAlpha;
  }

  isViewerActive(): boolean { return this.cgViewerActive; }
  getCurrentCGId(): string | null { return this.currentViewingCG; }
  getViewerAlpha(): number { return this.viewerFadeAlpha; }

  // === Gallery Text for Journal Display (fallback) ===

  /** Get formatted collection text for the journal Collection tab */
  getCollectionText(): string {
    const progress = this.getProgress();
    return `Collection (${progress.unlocked}/${progress.total})`;
  }

  // === Save/Load ===

  serialize(): string[] {
    return Array.from(this.unlockedCGs);
  }

  deserialize(data: string[]): void {
    this.unlockedCGs = new Set();
    if (!data) return;
    for (const id of data) {
      const migratedId = CG_ID_MIGRATION[id] ?? id;
      this.unlockedCGs.add(migratedId);
    }
    console.log(`[CGGallerySystem] Loaded ${this.unlockedCGs.size} unlocked CGs`);
  }
}
