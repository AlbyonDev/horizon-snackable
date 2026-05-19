/**
 * FloaterSharedState — Cross-controller game state.
 *
 * Only fields that are genuinely read or written by multiple controllers live
 * here. Single-owner state stays inside the controller that owns it (e.g.
 * 3D physics in CastSimulation, animation timers in AnimationsRunner,
 * dialogue/beat state in DialogueController).
 *
 * Pure data — no logic, no orchestration. Controllers receive a reference at
 * construction and mutate fields directly. The single tiny helper
 * `getCurrentPhase()` is included because Day/Night is a derived view that
 * multiple controllers need and centralizing it avoids drift.
 */

import { GamePhase, Phase } from './Types';
import type { FishCharacter, FishAffection, FishSaveData } from './Types';
import { createDefaultCharacter } from './CastData';
import { AffectionSystem } from './AffectionSystem';

export class FloaterSharedState {
  /** Engine phase — the single source of truth for which controller's update
   *  logic runs this frame, and what the UI should show. */
  phase: GamePhase = GamePhase.Title;

  /** Wall-clock-derived time accumulator (seconds). Used by render for bob
   *  animations and by controllers that need a continuous clock. */
  time: number = 0;

  // Current fish + affection — read by dialogue, render, save, and cast logic.
  fish: FishCharacter = createDefaultCharacter();
  fishAffection: FishAffection;

  /** Updated at cast boundaries (not mid-cast) — what the HUD shows. */
  displayedAffectionLabel: string = 'Indifferent';

  /** Stable id for the current play session. Used by AffectionSystem to dedupe
   *  rapid delta applications across frames. */
  sessionId: string = `session_${Date.now()}`;

  // Cast progression — shared between dialogue (end-of-cast bookkeeping),
  // save (persist progression), and cast simulation (encounter selection).
  castCount: number = 0;
  currentCastIndex: number = 0;
  perFishCastIndex: Record<string, number> = {};
  equippedLureId: string | null = null;

  /** Cached fish save data for characters not currently active. Populated by
   *  SaveCoordinator on load; read by CastSimulation when picking encounters
   *  and by PhaseController.startCast when restoring affection on switch. */
  savedFishRecords: Record<string, FishSaveData> = {};

  /** Day/Night phase — toggled by UI input, consumed by CastSimulation for
   *  encounter zone selection and by UIPresenter for background choice. */
  isDayMode: boolean = false;

  constructor(affectionSystem: AffectionSystem, defaultCharacterId: string) {
    this.fishAffection = affectionSystem.createAffection(defaultCharacterId);
  }

  /** Current Day/Night phase. Consumed by the encounter recipe system. */
  getCurrentPhase(): Phase {
    return this.isDayMode ? Phase.Day : Phase.Night;
  }
}
