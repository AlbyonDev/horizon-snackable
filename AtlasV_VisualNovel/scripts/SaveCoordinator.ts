/**
 * SaveCoordinator — Save/load orchestration + reset.
 *
 * Owns the serialization shape (`buildSaveData`) and the deserialization
 * flow (`loadGame`). Pulls from / pushes to every gameplay subsystem
 * (flags, affection, quests, CG, journal, global stats) and the shared
 * state (fish progression, per-fish records).
 *
 * Reset semantics: clears local + persistent save, then calls the
 * `onGameplayReset` hook so the orchestrator can rebuild fresh subsystem
 * instances and reset controllers. CG unlocks survive resets — they're
 * persisted in their own PVar and re-deserialized after the wipe.
 */

import { NetworkingService, EventService } from 'meta/worlds';
import { FlagSystem } from './FlagSystem';
import { SaveSystem } from './SaveSystem';
import { AffectionSystem } from './AffectionSystem';
import { QuestSystem } from './QuestSystem';
import { CGGallerySystem } from './CGGallerySystem';
import { JournalSystem } from './JournalSystem';
import { GlobalStatsSystem } from './GlobalStatsSystem';
import { characterRegistry } from './CharacterRegistry';
import { createDefaultCharacter } from './CastData';
import {
  OnSaveDataRequested, OnCGSaveRequested, OnResetSaveRequested,
} from './SaveEvents';
import type { FloaterSharedState } from './FloaterSharedState';
import type { SaveData, FishSaveData } from './Types';

/** Hooks the coordinator calls when load/reset milestones happen. The
 *  orchestrator implements these to re-wire controllers. */
export interface SaveHooks {
  /** Fresh save data has been parsed into `state` and subsystems. Caller may
   *  refresh ViewModel-derived display values. */
  onLoadComplete: () => void;
  /** Local + remote reset just completed (or was issued). Caller rebuilds
   *  any gameplay state that lives outside of the coordinator's reach
   *  (controllers' own state, dialogue beats, etc.). CG unlocks have already
   *  been restored. */
  onGameplayReset: () => void;
}

export class SaveCoordinator {
  constructor(
    private readonly state: FloaterSharedState,
    private readonly flagSystemRef: { current: FlagSystem },
    private readonly questSystemRef: { current: QuestSystem },
    private readonly cgGallerySystemRef: { current: CGGallerySystem },
    private readonly journalSystemRef: { current: JournalSystem },
    private readonly globalStatsSystemRef: { current: GlobalStatsSystem },
    private readonly saveSystem: SaveSystem,
    private readonly affectionSystem: AffectionSystem,
    private readonly hooks: SaveHooks,
  ) {
    // Wire up persistent save: whenever local save writes, also push to server.
    this.saveSystem.setOnSaveCallback((json: string) => {
      if (!NetworkingService.get().isServerContext()) {
        EventService.sendGlobally(OnSaveDataRequested, { data: json });
      }
    });
  }

  // === Save data composition ===

  buildSaveData(): SaveData {
    // Merge: previously saved fish records, then overlay current fish's live state.
    const allFish: Record<string, FishSaveData> = { ...this.state.savedFishRecords };
    allFish[this.state.fish.id] = {
      affection: this.state.fishAffection.value,
      drift: this.state.fish.currentDrift,
    };

    return {
      fish: allFish,
      flags: this.flagSystemRef.current.serialize(),
      seenBeats: [], // populated by caller (DialogueController) before save flush
      quests: this.questSystemRef.current.serialize(),
      perFishCastIndex: { ...this.state.perFishCastIndex },
      cgUnlocks: this.cgGallerySystemRef.current.serialize(),
      journal: this.journalSystemRef.current.serialize(),
      globalStats: this.globalStatsSystemRef.current.serialize(),
    };
  }

  /** Build save data with a caller-provided seenBeats snapshot (owned by
   *  DialogueController, not by the coordinator). */
  buildSaveDataWithSeenBeats(seenBeats: string[]): SaveData {
    const data = this.buildSaveData();
    data.seenBeats = seenBeats;
    return data;
  }

  // === Load ===

  /** Read from saveSystem.loadSave() and write into shared state + subsystems.
   *  Caller passes `seenBeatsTarget` (a Set owned by DialogueController) to
   *  populate; coordinator doesn't store it itself. */
  loadGame(seenBeatsTarget: Set<string>): void {
    const data = this.saveSystem.loadSave();
    if (!data) {
      console.log('[SaveCoordinator] No save data found, starting fresh');
      this.state.savedFishRecords = {};
      return;
    }

    // Populate savedFishRecords with ALL fish data from save.
    this.state.savedFishRecords = {};
    for (const fishId of Object.keys(data.fish)) {
      this.state.savedFishRecords[fishId] = { ...data.fish[fishId] };
    }
    console.log(`[SaveCoordinator] Loaded ${Object.keys(this.state.savedFishRecords).length} fish records`);

    const fishData = data.fish[this.state.fish.id];
    if (fishData) {
      this.state.fish.affection = fishData.affection;
      this.state.fish.currentDrift = fishData.drift;
      this.state.fishAffection = this.affectionSystem.restoreFromSave(this.state.fish.id, {
        value: fishData.affection,
        lastChangeSessionId: fishData.lastChangeSessionId ?? '',
        lastChangeDelta: fishData.lastChangeDelta ?? 0,
      });
      this.state.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.state.fishAffection.value);
    }
    this.flagSystemRef.current.deserialize(data.flags);
    seenBeatsTarget.clear();
    for (const id of data.seenBeats) seenBeatsTarget.add(id);

    if (data.cgUnlocks) {
      this.cgGallerySystemRef.current.deserialize(data.cgUnlocks);
    }
    if (data.journal) {
      this.journalSystemRef.current.deserialize(data.journal);
    }
    if (data.globalStats) {
      this.globalStatsSystemRef.current.deserialize(
        data.globalStats,
        this.journalSystemRef.current.getAllFishEntries(),
        this.flagSystemRef.current.serialize(),
      );
    }

    // Reconstruct castCount from globalStats.totalCasts (or legacy field).
    this.state.castCount = this.globalStatsSystemRef.current.getStats().totalCasts || data.castCount || 0;

    if (data.perFishCastIndex) {
      this.state.perFishCastIndex = { ...data.perFishCastIndex };
      this.state.currentCastIndex = this.state.perFishCastIndex[this.state.fish.id] ?? data.currentCastIndex ?? 0;
    } else {
      this.state.currentCastIndex = data.currentCastIndex ?? 0;
      this.state.perFishCastIndex = {};
      if (this.state.currentCastIndex > 0) {
        this.state.perFishCastIndex[this.state.fish.id] = this.state.currentCastIndex;
      }
    }

    if (data.quests) {
      this.questSystemRef.current.deserialize(data.quests);
      const allChars = characterRegistry.getAllCharacters().map(c => ({ id: c.id, questRequirement: c.questRequirement }));
      this.questSystemRef.current.reconstructCompletedQuests(allChars, this.flagSystemRef.current);
    }
    console.log(`[SaveCoordinator] Load done: castCount=${this.state.castCount}, currentCastIndex=${this.state.currentCastIndex}`);

    this.hooks.onLoadComplete();
  }

  /** Merge incoming persistent CG unlocks (union with existing in-memory). */
  applyPersistentCGData(json: string): void {
    if (!json || json.length === 0) return;
    try {
      const cgArray = JSON.parse(json) as string[];
      const existing = this.cgGallerySystemRef.current.serialize();
      const merged = Array.from(new Set([...existing, ...cgArray]));
      this.cgGallerySystemRef.current.deserialize(merged);
      console.log(`[SaveCoordinator] Merged ${merged.length} CG unlocks from persistent storage`);
    } catch (e) {
      console.log('[SaveCoordinator] ERROR parsing persistent CG data:', e);
    }
  }

  /** Push current CG unlocks to the dedicated PVar (survives save resets). */
  persistCGData(): void {
    const cgArray = this.cgGallerySystemRef.current.serialize();
    const cgJson = JSON.stringify(cgArray);
    EventService.sendGlobally(OnCGSaveRequested, { data: cgJson });
  }

  // === Reset ===

  /** Send the reset request to the server. The coordinator does NOT wipe
   *  local state here — the server's OnResetComplete handler triggers
   *  `resetAllGameState()` after acknowledging. */
  requestReset(): void {
    EventService.sendGlobally(OnResetSaveRequested, { confirm: true });
    // Also clear local state immediately (preserving CG) — matches original behavior.
    this.resetAllGameState();
  }

  /** Wipe local save, reset subsystems to fresh instances, preserve CG
   *  unlocks across the reset, then call the gameplay reset hook so the
   *  orchestrator can rebuild controllers + reset their state. */
  resetAllGameState(): void {
    this.saveSystem.clearSave();

    // Preserve CG unlocks across reset.
    const preservedCGUnlocks = this.cgGallerySystemRef.current.serialize();

    // Reset shared state to initial.
    this.state.fish = createDefaultCharacter();
    this.state.fishAffection = this.affectionSystem.createAffection(characterRegistry.getDefaultCharacterId());
    this.state.castCount = 0;
    this.state.currentCastIndex = 0;
    this.state.equippedLureId = null;
    this.state.perFishCastIndex = {};
    this.state.savedFishRecords = {};

    // Replace subsystem instances (mutate the ref boxes so the rest of the
    // app sees the new instance through the same ref).
    this.flagSystemRef.current = new FlagSystem();
    this.questSystemRef.current = new QuestSystem();
    this.cgGallerySystemRef.current = new CGGallerySystem();
    this.journalSystemRef.current = new JournalSystem();
    this.globalStatsSystemRef.current = new GlobalStatsSystem();

    // Restore preserved CG unlocks (CGs persist across resets).
    if (preservedCGUnlocks.length > 0) {
      this.cgGallerySystemRef.current.deserialize(preservedCGUnlocks);
    }

    this.hooks.onGameplayReset();
  }

  // === Public save accessors ===

  requestSave(): void {
    this.saveSystem.requestSave();
  }

  /** Flush save immediately with the latest snapshot. Used at critical
   *  boundaries (cast advancement, ending, intro completion). */
  flushImmediate(seenBeats: string[]): void {
    this.saveSystem.flushImmediate(() => this.buildSaveDataWithSeenBeats(seenBeats));
  }

  /** Driven per-frame from the orchestrator's onUpdate. */
  update(dt: number, seenBeats: string[]): void {
    this.saveSystem.update(dt, () => this.buildSaveDataWithSeenBeats(seenBeats));
  }

  setPersistentData(json: string): void {
    this.saveSystem.setPersistentData(json);
  }

  setReady(): void {
    this.saveSystem.setReady();
  }
}
