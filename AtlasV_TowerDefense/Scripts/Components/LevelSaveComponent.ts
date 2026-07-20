/**
 * LevelSaveComponent — Persists level completion progress across sessions.
 *
 * Component Attachment: Player entity (player.hstf)
 * Component Networking: Networked (uses NetworkEvents for client↔server)
 * Component Ownership: Client-owned (player)
 *
 * Architecture:
 *   - Player entity is CLIENT-OWNED → ExecuteOn.Owner runs on the owning client.
 *   - PlayerVariablesService is SERVER-ONLY.
 *   - On start (server, via ExecuteOn.Everywhere): fetch saved data, send to client via sendEventToOwner.
 *   - On LevelCompleted (client): send save request to server via sendEventToEveryone (owner can broadcast).
 *   - On save request (server, via ExecuteOn.Everywhere): write to PlayerVariablesService.
 *
 * Save format: object { b: boolean[], r: number, rel: string[] } stored as PlayerVariableType
 * Key: "td_level_sav"
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  PlayerVariablesService,
  ExecuteOn,
  EventService,
  Service,
  component,
  subscribe,
} from 'meta/worlds';

import { TOTAL_LEVELS } from '../Constants';
import {
  Events,
  SaveLevelProgressEvent,
  SaveLevelProgressPayload,
  SaveRunCountEvent,
  SaveRunCountPayload,
  SaveRelicsEvent,
  SaveRelicsPayload,
  SaveBossModEvent,
  SaveBossModPayload,
  ProgressLoadedEvent,
  ProgressLoadedPayload,
} from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { RelicService } from '../Services/RelicService';

const SAVE_KEY = 'td_level_sav';

/** Save data shape stored in PlayerVariablesService */
interface LevelSaveData {
  b: boolean[]; // beaten flags per level index
  r: number;    // run count
  rel: string[]; // active relic IDs for the current run
  bm: string;   // boss modifier shuffle-bag state JSON: { bag: number[], idx: number }
}

@component()
export class LevelSaveComponent extends Component {
  private playerVarsService = Service.inject(PlayerVariablesService);

  // Promise chain to serialize save operations — prevents race conditions
  // when _saveLevel and _saveRunCount fire concurrently (e.g. boss beaten + run advance).
  private _saveChain: Promise<void> = Promise.resolve();

  /** Queue an async save operation so it runs after any in-flight save completes. */
  private _queueSave(saveFn: () => Promise<void>): void {
    this._saveChain = this._saveChain.then(saveFn).catch(e => {
      console.log(`[LevelSaveComponent] Save chain error: ${e}`);
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) {
      // Server: load saved progress and send to owning client
      this._loadAndSendProgress();
    }
  }

  // ── Server: load progress from PlayerVariablesService ──────────────────────

  private async _loadAndSendProgress(): Promise<void> {
    try {
      const saved = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      let beatenStr = '';
      let runCount = 1;
      let relicsStr = '';
      let bossModState = '';
      if (saved) {
        if (saved.b) {
          beatenStr = JSON.stringify(saved.b);
        }
        if (saved.r !== undefined) {
          runCount = saved.r;
        }
        if (saved.rel && saved.rel.length > 0) {
          relicsStr = JSON.stringify(saved.rel);
        }
        if (saved.bm) {
          bossModState = saved.bm;
        }
      }
      console.log(`[LevelSaveComponent] Server loaded progress: beaten=${beatenStr || '(none)'}, runCount=${runCount}, relics=${relicsStr || '(none)'}, bossModState=${bossModState || '(none)'}`);

      // Send to owning client via NetworkEvent (plain object literal — required for serialization)
      this.sendEventToOwner(ProgressLoadedEvent, { beatenLevels: beatenStr, runCount, relics: relicsStr, bossModState });
    } catch (e) {
      console.log(`[LevelSaveComponent] Error loading progress: ${e}`);
    }
  }

  // ── Client: receive loaded progress ────────────────────────────────────────

  @subscribe(ProgressLoadedEvent, { execution: ExecuteOn.Owner })
  onProgressLoaded(payload: ProgressLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Client received progress: beaten=${payload.beatenLevels || '(none)'}, runCount=${payload.runCount}, relics=${payload.relics || '(none)'}, bossModState=${payload.bossModState || '(none)'}`);

    // Restore run count to LevelGeneratorService
    LevelGeneratorService.get().setRunCount(payload.runCount);

    // Restore boss modifier bag state to LevelGeneratorService
    if (payload.bossModState) {
      try {
        const bagState: { bag: number[]; idx: number } = JSON.parse(payload.bossModState);
        LevelGeneratorService.get().restoreBagState(bagState);
      } catch (e) {
        console.log(`[LevelSaveComponent] Error parsing bossModState: ${e}`);
      }
    }

    // Restore relics to RelicService
    if (payload.relics) {
      try {
        const relicIds: string[] = JSON.parse(payload.relics);
        RelicService.get().restoreRelics(relicIds);
      } catch (e) {
        console.log(`[LevelSaveComponent] Error parsing relics: ${e}`);
      }
    }

    // Broadcast locally so OverworldHud can restore node states
    const lp = new Events.ProgressRestoredPayload();
    lp.beatenLevels = payload.beatenLevels;
    lp.runCount = payload.runCount;
    lp.relics = payload.relics;
    lp.bossModState = payload.bossModState;
    EventService.sendLocally(Events.ProgressRestored, lp);
  }

  // ── Client: on level completed, request save ───────────────────────────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Client requesting save for level ${payload.levelIndex}`);

    // Send to all replicants (including server) via NetworkEvent
    this.sendEventToEveryone(SaveLevelProgressEvent, { levelIndex: payload.levelIndex });
  }

  // ── Server: handle save request ────────────────────────────────────────────

  @subscribe(SaveLevelProgressEvent, { execution: ExecuteOn.Everywhere })
  onSaveRequest(payload: SaveLevelProgressPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Server saving level ${payload.levelIndex} as beaten`);
    this._queueSave(() => this._saveLevel(payload.levelIndex));
  }

  // ── Client: on run advanced, request run count save ─────────────────────────

  @subscribe(Events.RunAdvanced, { execution: ExecuteOn.Everywhere })
  onRunAdvanced(payload: Events.RunAdvancedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const bagState = LevelGeneratorService.get().getBagState();
    const bossModState = JSON.stringify(bagState);
    console.log(`[LevelSaveComponent] Client requesting save for run count ${payload.runCount}, bossModState=${bossModState}`);
    this.sendEventToEveryone(SaveRunCountEvent, { runCount: payload.runCount, bossModState });
  }

  // ── Server: handle run count save request ──────────────────────────────────

  @subscribe(SaveRunCountEvent, { execution: ExecuteOn.Everywhere })
  onSaveRunCount(payload: SaveRunCountPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Server saving run count ${payload.runCount}`);
    this._queueSave(() => this._saveRunCount(payload.runCount, payload.bossModState));
  }

  // ── Client: on boss modifier assigned (at generation time), save immediately ────

  @subscribe(Events.BossModAssigned, { execution: ExecuteOn.Everywhere })
  onBossModAssigned(payload: Events.BossModAssignedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] BossModAssigned, saving bossModState=${payload.bossModState}`);
    this.sendEventToEveryone(SaveBossModEvent, { bossModState: payload.bossModState });
  }

  // ── Server: handle boss mod save request ──────────────────────────────────

  @subscribe(SaveBossModEvent, { execution: ExecuteOn.Everywhere })
  onSaveBossMod(payload: SaveBossModPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Server saving boss mod state: ${payload.bossModState}`);
    this._queueSave(() => this._saveBossMod(payload.bossModState));
  }

  // ── Client: on relic chosen, request save ──────────────────────────────────

  @subscribe(Events.RelicChosen, { execution: ExecuteOn.Everywhere })
  onRelicChosen(payload: Events.RelicChosenPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Gather current active relics (the newly chosen one was already activated by RelicChoiceHud)
    const activeRelics = RelicService.get().getActiveRelicIds();
    const relicsStr = JSON.stringify(activeRelics);
    console.log(`[LevelSaveComponent] Client requesting save for relics: ${relicsStr}`);
    this.sendEventToEveryone(SaveRelicsEvent, { relics: relicsStr });
  }

  // ── Server: handle relic save request ──────────────────────────────────────

  @subscribe(SaveRelicsEvent, { execution: ExecuteOn.Everywhere })
  onSaveRelics(payload: SaveRelicsPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Server saving relics: ${payload.relics}`);
    this._queueSave(() => this._saveRelics(payload.relics));
  }

  // ── Private save methods ───────────────────────────────────────────────────

  private async _saveRunCount(runCount: number, bossModState: string): Promise<void> {
    try {
      // Advancing a run resets beaten flags AND relics — new run means fresh levels and no relics.
      const beaten: boolean[] = [];
      const rel: string[] = [];

      const saveData: LevelSaveData = { b: beaten, r: runCount, rel, bm: bossModState };
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, saveData);
      console.log(`[LevelSaveComponent] Server saved run count (beaten+relics reset): ${JSON.stringify(saveData)}`);
    } catch (e) {
      console.log(`[LevelSaveComponent] Error saving run count: ${e}`);
    }
  }

  private async _saveLevel(levelIndex: number): Promise<void> {
    try {
      // Fetch current state
      const existing = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      let beaten: boolean[] = [];
      let rel: string[] = [];
      let bm = '';

      if (existing) {
        if (existing.b) {
          beaten = existing.b;
        }
        if (existing.rel) {
          rel = existing.rel;
        }
        if (existing.bm) {
          bm = existing.bm;
        }
      }

      // Ensure array is large enough
      while (beaten.length < TOTAL_LEVELS) {
        beaten.push(false);
      }

      // Mark level as beaten
      if (levelIndex >= 0 && levelIndex < TOTAL_LEVELS) {
        beaten[levelIndex] = true;
      }

      // Preserve run count from existing save
      const runCount = (existing && existing.r !== undefined) ? existing.r : 1;
      const saveData: LevelSaveData = { b: beaten, r: runCount, rel, bm };
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, saveData);
      console.log(`[LevelSaveComponent] Server saved progress: ${JSON.stringify(saveData)}`);
    } catch (e) {
      console.log(`[LevelSaveComponent] Error saving progress: ${e}`);
    }
  }

  private async _saveRelics(relicsStr: string): Promise<void> {
    try {
      // Fetch current state and merge
      const existing = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      const beaten: boolean[] = (existing && existing.b) ? existing.b : [];
      const runCount = (existing && existing.r !== undefined) ? existing.r : 1;
      const bm = (existing && existing.bm) ? existing.bm : '';

      let rel: string[] = [];
      try {
        rel = JSON.parse(relicsStr);
      } catch (e) {
        console.log(`[LevelSaveComponent] Error parsing relics for save: ${e}`);
        return;
      }

      const saveData: LevelSaveData = { b: beaten, r: runCount, rel, bm };
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, saveData);
      console.log(`[LevelSaveComponent] Server saved relics: ${JSON.stringify(saveData)}`);
    } catch (e) {
      console.log(`[LevelSaveComponent] Error saving relics: ${e}`);
    }
  }

  private async _saveBossMod(bossModState: string): Promise<void> {
    try {
      // Fetch current state and merge — never overwrite the whole object
      const existing = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      const beaten: boolean[] = (existing && existing.b) ? existing.b : [];
      const runCount = (existing && existing.r !== undefined) ? existing.r : 1;
      const rel: string[] = (existing && existing.rel) ? existing.rel : [];

      const saveData: LevelSaveData = { b: beaten, r: runCount, rel, bm: bossModState };
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, saveData);
      console.log(`[LevelSaveComponent] Server saved boss mod state: ${JSON.stringify(saveData)}`);
    } catch (e) {
      console.log(`[LevelSaveComponent] Error saving boss mod state: ${e}`);
    }
  }
}
