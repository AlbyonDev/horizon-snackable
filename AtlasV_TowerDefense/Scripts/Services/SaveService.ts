/**
 * SaveService — Single owner of persistent save/load for the whole game.
 *
 * Component Attachment: none (@service() singleton)
 * Networking: server persists, client owns the authoritative in-memory copy
 *
 * ── V2 Biome-Aware Save Format ──────────────────────────────────────────────
 * The save blob is now versioned. V2 stores per-biome progression (runCount,
 * seed, beaten, relics) independently, while global state (skulls, skill tree)
 * is shared. The `switchBiome()` method saves the current biome's state and
 * restores the target biome's state, firing appropriate events.
 *
 * Migration: If the loaded blob has no `v` field, it is V1 (flat format).
 * The old data is migrated under the 'grass' biome in V2.
 *
 * ── Data flow (request/response handshake — no single-broadcast race) ─────────
 *   Client:
 *     requestLoad()        → sendGlobally(SaveLoadRequest)
 *     SaveLoaded (net)     → parse → hold in memory → sendLocally(SaveRestored)
 *     LevelCompleted       → mark beaten → request save
 *     ensureRunSeed()      → mint a seed if none / previous run finished → save
 *     markRunComplete()    → runCount++, flag run finished → save
 *     switchBiome(id)      → commit current → restore target → fire events
 *   Server:
 *     OnPlayerCreate       → fetchVariable(SAVE_KEY) → store blob
 *     SaveLoadRequest (net)→ mark requested
 *     _tryRespondLoad()    → when BOTH ready → sendGlobally(SaveLoaded)
 *     SaveRequested (net)  → debounced setVariable  (rate-limit safe)
 */
import {
  Service,
  PlayerVariablesService,
  NetworkingService,
  EventService,
  OnPlayerCreateEvent,
  ExecuteOn,
  service,
  subscribe,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import type { OnPlayerCreateEventPayload } from 'meta/worlds';

import { Events, NetworkEvents } from '../Types';
import { TOTAL_LEVELS } from '../Constants';
import { OverworldNodeType } from '../Defs/NodeDefs';

const SAVE_KEY = 'td_level_sav';

// Coalesce rapid saves into a single backend write.
const PERSIST_DEBOUNCE_MS = 400;

// ── Per-biome save slice ────────────────────────────────────────────────────────
interface TdBiomeSave {
  runCount: number;
  seed: number;
  beaten: boolean[];
  relics: string[];
  bossModBag: number[];
  bossModIdx: number;
}

// ── V2 save format (biome-aware) ────────────────────────────────────────────────
interface TdSaveDataV2 {
  v: 2;
  global: { sk: number; st: number[] };
  biomes: Record<string, TdBiomeSave>;
  activeBiome: string;
}

// Legacy V1 shape (no `v` field) — used only for migration detection
interface TdSaveDataV1 {
  runCount: number;
  seed: number;
  beaten: boolean[];
  relics: string[];
  sk: number;
  st: number[];
}

function defaultBiomeSave(): TdBiomeSave {
  return { runCount: 0, seed: 0, beaten: [], relics: [], bossModBag: [], bossModIdx: 0 };
}

function defaultSaveV2(): TdSaveDataV2 {
  return { v: 2, global: { sk: 0, st: [] }, biomes: {}, activeBiome: 'grass' };
}

@service()
export class SaveService extends Service {
  private readonly _playerVars = Service.inject(PlayerVariablesService);

  // ── Client-side authoritative copy ──────────────────────────────────────────
  private _data: TdSaveDataV2 = defaultSaveV2();
  private _loaded: boolean = false;
  private _loadReqSent: boolean = false;

  // ── Server-side persistence state ───────────────────────────────────────────
  private _player: Maybe<Entity> = null;
  private _persistTimerId: ReturnType<typeof setTimeout> | null = null;
  private _pendingJson: string | null = null;
  private _serverSaveJson: string | null = null;
  private _loadRequested: boolean = false;

  // ── Level count (set by LevelGeneratorService after generation) ─────────────
  private _levelCount: number = TOTAL_LEVELS;

  /** Node type of the currently-playing level (set on LevelSelected). */
  private _currentNodeType: string = OverworldNodeType.Combat;

  // ── Active biome ────────────────────────────────────────────────────────────
  private _activeBiome: string = 'grass';

  /** The currently active biome id. */
  get activeBiome(): string { return this._activeBiome; }

  /** Update the expected level count for this run. */
  setLevelCount(count: number): void {
    this._levelCount = count;
    console.log(`[SaveService] Level count set to ${count}`);
  }

  /** Current level count for the run. */
  getLevelCount(): number { return this._levelCount; }

  // ── Helper: get or create the biome save slice for active biome ─────────────
  private _biome(): TdBiomeSave {
    if (!this._data.biomes[this._activeBiome]) {
      this._data.biomes[this._activeBiome] = defaultBiomeSave();
    }
    return this._data.biomes[this._activeBiome];
  }

  // ── Public accessors (client) ───────────────────────────────────────────────

  get isLoaded(): boolean { return this._loaded; }

  getSeed(): number { return this._biome().seed; }
  getRunCount(): number { return this._biome().runCount; }
  getBeaten(): boolean[] { return this._biome().beaten.slice(); }
  getRelics(): string[] { return this._biome().relics.slice(); }
  getSkullCount(): number { return this._data.global.sk; }
  getSkillTreeState(): number[] { return this._data.global.st.slice(); }

  /** Get the boss modifier shuffle-bag state for the active biome. */
  getBossBagState(): { bag: number[]; idx: number } {
    const biome = this._biome();
    return { bag: biome.bossModBag.slice(), idx: biome.bossModIdx };
  }

  /** Persist the boss modifier shuffle-bag state for the active biome. Client-only. */
  setBossBagState(state: { bag: number[]; idx: number }): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    biome.bossModBag = state.bag.slice();
    biome.bossModIdx = state.idx;
    console.log(`[SaveService] Boss mod bag persisted for biome ${this._activeBiome}: [${state.bag.join(',')}] idx=${state.idx}`);
    this._requestSave();
  }

  /** Deduct skulls for a skill tree purchase. Client-only. */
  spendSkulls(amount: number): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._data.global.sk < amount) return;
    this._data.global.sk -= amount;
    console.log(`[SaveService] Skulls spent: -${amount} (remaining: ${this._data.global.sk})`);
    this._requestSave();
  }

  /** Update the skill tree unlock state and persist. Client-only. */
  setSkillTreeState(indices: number[]): void {
    if (NetworkingService.get().isServerContext()) return;
    this._data.global.st = indices.slice();
    console.log(`[SaveService] Skill tree state saved: [${indices.join(',')}]`);
    this._requestSave();
  }

  /** True if every level of the current run has been beaten (run finished). */
  private _isRunComplete(): boolean {
    const biome = this._biome();
    if (biome.seed === 0) return false;
    const count = this._levelCount;
    if (biome.beaten.length < count) return false;
    for (let i = 0; i < count; i++) {
      if (!biome.beaten[i]) return false;
    }
    return true;
  }

  /**
   * Return the seed for the run to play. Resumes the saved run when one is in
   * progress; mints a fresh seed when there is no run yet or the previous run
   * was completed. Persists on mint. Client-only.
   */
  ensureRunSeed(): number {
    if (NetworkingService.get().isServerContext()) return this._biome().seed;

    if (!this._loaded) {
      console.log('[SaveService] ensureRunSeed called before load — refusing to mint');
      return this._biome().seed;
    }

    const biome = this._biome();
    const needsNewRun = biome.seed === 0 || this._isRunComplete();
    if (needsNewRun) {
      biome.seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
      biome.beaten = [];
      biome.relics = [];
      console.log(`[SaveService] New run seed minted: ${biome.seed}`);
      this._requestSave();
      EventService.sendLocally(Events.RunReset, new Events.RunResetPayload());
    }
    return biome.seed;
  }

  /** Clear all relics for the active biome and persist. Client-only. */
  clearRelics(): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    biome.relics = [];
    console.log(`[SaveService] Relics cleared for biome ${this._activeBiome}`);
    this._requestSave();
  }

  /** Clear the beaten array for the active biome and persist. Client-only.
   *  Call this when advancing to a new run so that stale all-beaten state
   *  does not cause repeated overworld resets or relic pool exhaustion. */
  clearBeaten(): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    biome.beaten = [];
    console.log(`[SaveService] Beaten cleared for biome ${this._activeBiome}`);
    this._requestSave();
  }

  /** Record a relic gained in the current run and persist. Client-only. */
  addRelic(relicId: string): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    if (!relicId || biome.relics.includes(relicId)) return;
    biome.relics.push(relicId);
    console.log(`[SaveService] Relic recorded: ${relicId}`);
    this._requestSave();
  }

  /** Mark a level as beaten in the current run and persist. Client-only. */
  markLevelBeaten(levelIndex: number): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    const count = this._levelCount;
    if (levelIndex < 0 || levelIndex >= count) return;
    while (biome.beaten.length < count) biome.beaten.push(false);
    if (biome.beaten[levelIndex]) return;
    biome.beaten[levelIndex] = true;
    console.log(`[SaveService] Level ${levelIndex} marked beaten`);
    this._requestSave();
  }

  /** Increment the completed-run counter and persist. Client-only. */
  markRunComplete(): void {
    if (NetworkingService.get().isServerContext()) return;
    const biome = this._biome();
    biome.runCount += 1;
    console.log(`[SaveService] Run complete, runCount=${biome.runCount}`);
    this._requestSave();
  }

  // ── Biome switching ─────────────────────────────────────────────────────────

  /**
   * Switch to a different biome. Commits current biome state and restores the
   * target biome's state. Fires BiomeChanged + SaveRestored (no RunReset).
   * Client-only.
   */
  switchBiome(targetBiomeId: string): void {
    if (NetworkingService.get().isServerContext()) return;
    if (targetBiomeId === this._activeBiome) {
      console.log(`[SaveService] Already on biome ${targetBiomeId}, ignoring`);
      return;
    }

    console.log(`[SaveService] Switching biome: ${this._activeBiome} → ${targetBiomeId}`);

    // ALWAYS update the active biome state immediately so that UI reads
    // (e.g. _updateBiomeArrow) see the correct biome even before the save
    // has finished loading from the server.
    this._activeBiome = targetBiomeId;
    this._data.activeBiome = targetBiomeId;

    if (!this._loaded) {
      console.log('[SaveService] switchBiome: save not loaded yet — state updated but skipping events/persist');
      return;
    }

    // Ensure target biome has a save slice
    if (!this._data.biomes[targetBiomeId]) {
      this._data.biomes[targetBiomeId] = defaultBiomeSave();
    }

    // Persist the switch
    this._requestSave();

    // Fire BiomeChanged so OverworldHud updates its background
    const bp = new Events.BiomeChangedPayload();
    bp.biomeId = targetBiomeId;
    EventService.sendLocally(Events.BiomeChanged, bp);

    // NOTE: We intentionally do NOT fire RunReset here. Switching biomes is
    // NOT starting a new run — it's resuming the target biome's existing run.
    // RelicService.restore() (triggered by SaveRestored below) already clears
    // the in-memory set before populating it with the target biome's relics.

    // Fire SaveRestored with the new biome's data so OverworldHud restores progress
    const biome = this._biome();
    const restored = new Events.SaveRestoredPayload();
    restored.seed = biome.seed;
    restored.runCount = biome.runCount;
    restored.beaten = biome.beaten.slice();
    restored.relics = biome.relics.slice();
    restored.skulls = this._data.global.sk;
    restored.skillTree = this._data.global.st.slice();
    EventService.sendLocally(Events.SaveRestored, restored);
  }

  // ── Client: level completed → record beaten ─────────────────────────────────

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentNodeType = p.nodeType;
  }

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Owner })
  onLevelCompleted(p: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.markLevelBeaten(p.levelIndex);

    // Award skulls: +5 for boss, +1 for combat
    const skullsEarned = this._currentNodeType === OverworldNodeType.Boss ? 5 : 1;
    this._data.global.sk += skullsEarned;
    console.log(`[SaveService] Skulls earned: +${skullsEarned} (total: ${this._data.global.sk})`);
    this._requestSave();
  }

  @subscribe(Events.BossModAssigned, { execution: ExecuteOn.Owner })
  onBossModAssigned(p: Events.BossModAssignedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._loaded) return;
    try {
      const state = JSON.parse(p.bossModState) as { bag: number[]; idx: number };
      this.setBossBagState(state);
    } catch {
      console.log('[SaveService] Failed to parse BossModAssigned payload');
    }
  }

  // ── Client: receive loaded blob from server ─────────────────────────────────

  @subscribe(NetworkEvents.SaveLoaded, { execution: ExecuteOn.Owner })
  onSaveLoaded(p: NetworkEvents.SaveLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    if (this._loaded) {
      console.log('[SaveService] SaveLoaded ignored — already loaded this session');
      return;
    }

    this._data = this._decode(p.json);
    this._activeBiome = this._data.activeBiome;
    this._loaded = true;

    const biome = this._biome();
    console.log(`[SaveService] Loaded V2: activeBiome=${this._activeBiome}, runCount=${biome.runCount}, seed=${biome.seed}, beaten=${JSON.stringify(biome.beaten)}`);

    const restored = new Events.SaveRestoredPayload();
    restored.seed = biome.seed;
    restored.runCount = biome.runCount;
    restored.beaten = biome.beaten.slice();
    restored.relics = biome.relics.slice();
    restored.skulls = this._data.global.sk;
    restored.skillTree = this._data.global.st.slice();
    EventService.sendLocally(Events.SaveRestored, restored);

    // Handle race: if StartGame fired before SaveLoaded, ensureRunSeed() bailed
    // because _loaded was false. Now that save is loaded, re-run it to detect
    // completed runs and clear stale relics (fires RunReset if needed).
    this.ensureRunSeed();
  }

  // ── Client: ask the server for the save ─────────────────────────────────────

  requestLoad(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._loaded || this._loadReqSent) return;
    this._loadReqSent = true;
    EventService.sendGlobally(NetworkEvents.SaveLoadRequest, {});
    console.log('[SaveService] Load requested from server');
  }

  // ── Server: player joins → fetch, then answer any pending request ───────────

  @subscribe(OnPlayerCreateEvent)
  async onPlayerCreate(p: OnPlayerCreateEventPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!p.entity) return;
    this._player = p.entity;

    let save: TdSaveDataV2 | TdSaveDataV1 | undefined;
    let fetchFailed = false;
    try {
      save = await this._playerVars.fetchVariable<TdSaveDataV2 | TdSaveDataV1>(p.entity, SAVE_KEY);
    } catch (e) {
      fetchFailed = true;
      console.log('[SaveService] fetchVariable failed:', e);
    }

    if (fetchFailed) {
      console.log('[SaveService] Fetch failed — serving empty state WITHOUT overwriting cloud');
      this._serverSaveJson = '';
    } else if (!save) {
      this._pendingJson = JSON.stringify(defaultSaveV2());
      this._flushNow();
      this._serverSaveJson = '';
    } else {
      this._serverSaveJson = JSON.stringify(save);
    }
    this._tryRespondLoad();
  }

  // ── Server: client asked for its save ───────────────────────────────────────

  @subscribe(NetworkEvents.SaveLoadRequest)
  onLoadRequest(_p: NetworkEvents.SaveLoadRequestPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    this._loadRequested = true;
    this._tryRespondLoad();
  }

  private _tryRespondLoad(): void {
    if (this._serverSaveJson === null) return;
    if (!this._loadRequested) return;
    EventService.sendGlobally(NetworkEvents.SaveLoaded, { json: this._serverSaveJson });
    console.log('[SaveService] SaveLoaded sent to client');
  }

  // ── Server: persist request from client (debounced) ─────────────────────────

  @subscribe(NetworkEvents.SaveRequested)
  onSaveRequested(p: NetworkEvents.SaveRequestedPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (p.json.length > 9500) {
      console.log(`[SaveService] WARNING: save blob ${p.json.length} chars (limit 10000)`);
    }
    this._pendingJson = p.json;
    if (this._persistTimerId !== null) return;
    this._persistTimerId = setTimeout(() => {
      this._persistTimerId = null;
      this._flushNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  // ── Client: push current blob to server ─────────────────────────────────────

  private _requestSave(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._loaded) {
      console.log('[SaveService] _requestSave skipped — not loaded yet');
      return;
    }
    EventService.sendGlobally(NetworkEvents.SaveRequested, { json: JSON.stringify(this._data) });
  }

  // ── Server: write pending blob ──────────────────────────────────────────────

  private _flushNow(): void {
    if (!this._player || this._pendingJson === null) return;
    const json = this._pendingJson;
    this._pendingJson = null;
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      console.log('[SaveService] flush skipped — pending blob not valid JSON');
      return;
    }
    this._playerVars
      .setVariable(this._player, SAVE_KEY, value as TdSaveDataV2)
      .then(() => console.log('[SaveService] Persisted'))
      .catch((e: unknown) => console.log('[SaveService] setVariable failed (rate-limit?):', e));
  }

  // ── Decode a stored/received blob into normalized V2 format ─────────────────

  private _decode(json: string): TdSaveDataV2 {
    if (!json) return defaultSaveV2();
    try {
      const raw = JSON.parse(json) as Record<string, unknown>;

      // V2 detection: has `v: 2`
      if (raw['v'] === 2) {
        return this._parseV2(raw);
      }

      // V1 migration: no `v` field → flat format, migrate to V2 under 'grass'
      console.log('[SaveService] Migrating V1 save to V2 format');
      return this._migrateV1(raw as unknown as Partial<TdSaveDataV1>);
    } catch {
      console.log('[SaveService] Failed to parse save blob, starting fresh');
      return defaultSaveV2();
    }
  }

  private _parseV2(raw: Record<string, unknown>): TdSaveDataV2 {
    const global = raw['global'] as { sk?: number; st?: number[] } | undefined;
    const biomes = raw['biomes'] as Record<string, Partial<TdBiomeSave>> | undefined;
    const activeBiome = typeof raw['activeBiome'] === 'string' ? raw['activeBiome'] : 'grass';

    const result: TdSaveDataV2 = {
      v: 2,
      global: {
        sk: typeof global?.sk === 'number' ? global.sk : 0,
        st: Array.isArray(global?.st) ? global.st.filter((n): n is number => typeof n === 'number') : [],
      },
      biomes: {},
      activeBiome,
    };

    if (biomes && typeof biomes === 'object') {
      for (const key of Object.keys(biomes)) {
        const b = biomes[key];
        result.biomes[key] = {
          runCount: typeof b?.runCount === 'number' ? b.runCount : 0,
          seed: typeof b?.seed === 'number' ? b.seed : 0,
          beaten: Array.isArray(b?.beaten) ? b.beaten.map(Boolean) : [],
          relics: Array.isArray(b?.relics) ? b.relics.filter((r): r is string => typeof r === 'string') : [],
          bossModBag: Array.isArray((b as Record<string, unknown> | undefined)?.['bossModBag']) ? ((b as Record<string, unknown>)['bossModBag'] as number[]).filter((n): n is number => typeof n === 'number') : [],
          bossModIdx: typeof (b as Record<string, unknown> | undefined)?.['bossModIdx'] === 'number' ? (b as Record<string, unknown>)['bossModIdx'] as number : 0,
        };
      }
    }

    return result;
  }

  private _migrateV1(raw: Partial<TdSaveDataV1>): TdSaveDataV2 {
    const grassBiome: TdBiomeSave = {
      runCount: typeof raw.runCount === 'number' ? raw.runCount : 0,
      seed: typeof raw.seed === 'number' ? raw.seed : 0,
      beaten: Array.isArray(raw.beaten) ? raw.beaten.map(Boolean) : [],
      relics: Array.isArray(raw.relics) ? raw.relics.filter((r): r is string => typeof r === 'string') : [],
      bossModBag: [],
      bossModIdx: 0,
    };

    return {
      v: 2,
      global: {
        sk: typeof raw.sk === 'number' ? raw.sk : 0,
        st: Array.isArray(raw.st) ? raw.st.filter((n): n is number => typeof n === 'number') : [],
      },
      biomes: { grass: grassBiome },
      activeBiome: 'grass',
    };
  }
}
