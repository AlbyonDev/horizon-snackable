/**
 * SaveService — Single owner of persistent save/load for the whole game.
 *
 * Component Attachment: none (@service() singleton)
 * Networking: server persists, client owns the authoritative in-memory copy
 *
 * ── Why a service, not a component ──────────────────────────────────────────
 * Persistence is global to the run, not bound to any scene entity. Making it a
 * singleton means adding a future field to the save is one line in TdSaveData +
 * one getter here — no editor wiring, no scattered fetch/set calls.
 *
 * ── Data flow (request/response handshake — no single-broadcast race) ─────────
 *   Client:
 *     requestLoad()        → sendGlobally(SaveLoadRequest)   [called from
 *                            GameManager.onStart, NOT onReady — see requestLoad]
 *     SaveLoaded (net)     → parse → hold in memory → sendLocally(SaveRestored)
 *     LevelCompleted       → mark beaten → request save
 *     ensureRunSeed()      → mint a seed if none / previous run finished → save
 *     markRunComplete()    → runCount++, flag run finished → save
 *   Server:
 *     OnPlayerCreate       → fetchVariable(SAVE_KEY) → store blob
 *     SaveLoadRequest (net)→ mark requested
 *     _tryRespondLoad()    → when BOTH ready → sendGlobally(SaveLoaded)
 *     SaveRequested (net)  → debounced setVariable  (rate-limit safe)
 *
 * PlayerVariablesService is SERVER-ONLY and rate-limited: every write is
 * debounced (PERSIST_DEBOUNCE_MS) so a burst of saves coalesces into one call,
 * and a throttled promise rejection is caught rather than thrown.
 *
 * The persisted shape is a single JSON blob under one key. The blob is passed
 * across the client↔server boundary as a string (NetworkEvents), so the shape
 * can evolve without changing any event definition.
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
// TOTAL_LEVELS is used only as the initial default for _levelCount;
// at runtime the actual level count comes from LevelGeneratorService via setLevelCount().
import { TOTAL_LEVELS } from '../Constants';

const SAVE_KEY = 'td_level_sav';

// Coalesce rapid saves (e.g. beating a level then immediately ending a run)
// into a single backend write. PlayerVariablesService is rate-limited.
const PERSIST_DEBOUNCE_MS = 400;

// Persisted shape. PERMANENT meta lives alongside runCount; current-run state
// lives alongside seed. Add future fields here (bestScore, unlocks, …) — nothing
// else needs to change.
interface TdSaveData {
  /** Number of completed runs — permanent across runs. */
  runCount: number;
  /** Current run's generation seed. 0 means "no active run — start fresh". */
  seed: number;
  /** Per-level beaten flags for the current run. */
  beaten: boolean[];
  /** Active relic ids for the current run (cleared when a new run starts). */
  relics: string[];
}

function defaultSave(): TdSaveData {
  return { runCount: 0, seed: 0, beaten: [], relics: [] };
}

@service()
export class SaveService extends Service {
  private readonly _playerVars = Service.inject(PlayerVariablesService);

  // ── Client-side authoritative copy ──────────────────────────────────────────
  private _data: TdSaveData = defaultSave();
  // The cloud is the source of truth for the initial load. NOTHING is minted or
  // written before it arrives — see the _loaded guards in ensureRunSeed() and
  // _requestSave(). This is what prevents a fast "Play" tap from overwriting the
  // real save with a fresh run.
  private _loaded: boolean = false;
  // Guards against sending the load request more than once (idempotent).
  private _loadReqSent: boolean = false;

  // ── Server-side persistence state ─────────────────────────────────────────────
  private _player: Maybe<Entity> = null;
  private _persistTimerId: ReturnType<typeof setTimeout> | null = null;
  private _pendingJson: string | null = null;
  // Handshake state: the fetched blob ('' for a new player) once ready, and
  // whether the client has asked for it. The server answers only when BOTH are
  // true, so the response can't race the client's subscription (either order
  // works: request-then-fetch or fetch-then-request).
  private _serverSaveJson: string | null = null;
  private _loadRequested: boolean = false;

  // ── Level count (set by LevelGeneratorService after generation) ───────────────
  private _levelCount: number = TOTAL_LEVELS;

  /** Update the expected level count for this run (called by LevelGeneratorService). */
  setLevelCount(count: number): void {
    this._levelCount = count;
    console.log(`[SaveService] Level count set to ${count}`);
  }

  /** Current level count for the run. */
  getLevelCount(): number { return this._levelCount; }

  // ── Public accessors (client) ─────────────────────────────────────────────────

  /** True once the save has been loaded (or confirmed empty) from the server. */
  get isLoaded(): boolean { return this._loaded; }

  getSeed(): number { return this._data.seed; }
  getRunCount(): number { return this._data.runCount; }
  getBeaten(): boolean[] { return this._data.beaten.slice(); }
  getRelics(): string[] { return this._data.relics.slice(); }

  /** True if every level of the current run has been beaten (run finished). */
  private _isRunComplete(): boolean {
    if (this._data.seed === 0) return false;
    const count = this._levelCount;
    if (this._data.beaten.length < count) return false;
    for (let i = 0; i < count; i++) {
      if (!this._data.beaten[i]) return false;
    }
    return true;
  }

  /**
   * Return the seed for the run to play. Resumes the saved run when one is in
   * progress; mints a fresh seed (and clears beaten flags) when there is no run
   * yet or the previous run was completed. Persists on mint.
   * Client-only — call before generating the run.
   */
  ensureRunSeed(): number {
    if (NetworkingService.get().isServerContext()) return this._data.seed;

    // Never mint before the cloud has spoken — that would overwrite the real
    // save with a fresh run. Callers must gate on isLoaded (the Play button
    // does). This is a defensive backstop.
    if (!this._loaded) {
      console.log('[SaveService] ensureRunSeed called before load — refusing to mint');
      return this._data.seed;
    }

    const needsNewRun = this._data.seed === 0 || this._isRunComplete();
    if (needsNewRun) {
      // Math.random() is fine to CHOOSE a seed — determinism only matters for
      // generation FROM the seed, which LevelGeneratorService handles.
      this._data.seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
      this._data.beaten = [];
      this._data.relics = [];
      console.log(`[SaveService] New run seed minted: ${this._data.seed}`);
      this._requestSave();
      // Tell run-scoped state (relics, …) to clear itself.
      EventService.sendLocally(Events.RunReset, new Events.RunResetPayload());
    }
    return this._data.seed;
  }

  /** Record a relic gained in the current run and persist. Client-only. */
  addRelic(relicId: string): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!relicId || this._data.relics.includes(relicId)) return;
    this._data.relics.push(relicId);
    console.log(`[SaveService] Relic recorded: ${relicId}`);
    this._requestSave();
  }

  /** Mark a level as beaten in the current run and persist. Client-only. */
  markLevelBeaten(levelIndex: number): void {
    if (NetworkingService.get().isServerContext()) return;
    const count = this._levelCount;
    if (levelIndex < 0 || levelIndex >= count) return;
    while (this._data.beaten.length < count) this._data.beaten.push(false);
    if (this._data.beaten[levelIndex]) return; // already recorded
    this._data.beaten[levelIndex] = true;
    console.log(`[SaveService] Level ${levelIndex} marked beaten`);
    this._requestSave();
  }

  /** Increment the completed-run counter and persist. Client-only. */
  markRunComplete(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._data.runCount += 1;
    console.log(`[SaveService] Run complete, runCount=${this._data.runCount}`);
    this._requestSave();
    // The next ensureRunSeed() sees a completed run and mints a fresh seed.
  }

  // ── Client: level completed → record beaten ─────────────────────────────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Owner })
  onLevelCompleted(p: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.markLevelBeaten(p.levelIndex);
  }

  // ── Client: receive loaded blob from server ─────────────────────────────────

  @subscribe(NetworkEvents.SaveLoaded, { execution: ExecuteOn.Owner })
  onSaveLoaded(p: NetworkEvents.SaveLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Apply the cloud load exactly once. Since nothing local is minted or
    // written before this arrives (Play is gated on isLoaded), the cloud is the
    // undisputed source of truth here. Ignore any later broadcast.
    if (this._loaded) {
      console.log('[SaveService] SaveLoaded ignored — already loaded this session');
      return;
    }

    this._data = this._decode(p.json);
    this._loaded = true;
    console.log(`[SaveService] Loaded: runCount=${this._data.runCount}, seed=${this._data.seed}, beaten=${JSON.stringify(this._data.beaten)}`);

    const restored = new Events.SaveRestoredPayload();
    restored.seed = this._data.seed;
    restored.runCount = this._data.runCount;
    restored.beaten = this._data.beaten.slice();
    restored.relics = this._data.relics.slice();
    EventService.sendLocally(Events.SaveRestored, restored);
  }

  // ── Client: ask the server for the save ─────────────────────────────────────
  //
  // MUST be called from a component's OnEntityStartEvent (GameManager), NOT from
  // OnServiceReadyEvent: the global event entity that sendGlobally needs does not
  // exist yet during service init ("no global event entity available").
  requestLoad(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._loaded || this._loadReqSent) return; // idempotent
    this._loadReqSent = true;
    EventService.sendGlobally(NetworkEvents.SaveLoadRequest, {});
    console.log('[SaveService] Load requested from server');
  }

  // ── Server: player joins → fetch, then answer any pending request ────────────

  @subscribe(OnPlayerCreateEvent)
  async onPlayerCreate(p: OnPlayerCreateEventPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!p.entity) return;
    this._player = p.entity;

    let save: TdSaveData | undefined;
    let fetchFailed = false;
    try {
      save = await this._playerVars.fetchVariable<TdSaveData>(p.entity, SAVE_KEY);
    } catch (e) {
      fetchFailed = true;
      console.log('[SaveService] fetchVariable failed:', e);
    }

    if (fetchFailed) {
      // Fetch errored (transient backend/rate-limit). Do NOT write an empty blob
      // — that would erase a real save on a flaky read. Serve an empty state to
      // the client but persist nothing until the player takes an explicit action.
      console.log('[SaveService] Fetch failed — serving empty state WITHOUT overwriting cloud');
      this._serverSaveJson = '';
    } else if (!save) {
      // Genuine first-time player (fetch succeeded, no data): write an empty blob
      // so a quick quit doesn't lose the initial record. Client sees json:'' →
      // seed 0 → mints on Play.
      this._pendingJson = JSON.stringify(defaultSave());
      this._flushNow();
      this._serverSaveJson = '';
    } else {
      this._serverSaveJson = JSON.stringify(save);
    }
    this._tryRespondLoad();
  }

  // ── Server: client asked for its save ────────────────────────────────────────

  @subscribe(NetworkEvents.SaveLoadRequest)
  onLoadRequest(_p: NetworkEvents.SaveLoadRequestPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    this._loadRequested = true;
    this._tryRespondLoad();
  }

  /** Send SaveLoaded once BOTH the blob is fetched and the client has asked.
   *  Either event may arrive first — this fires exactly when the last one does. */
  private _tryRespondLoad(): void {
    if (this._serverSaveJson === null) return; // fetch not done yet
    if (!this._loadRequested) return;           // client hasn't asked yet
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
    if (this._persistTimerId !== null) return; // a flush is already scheduled
    this._persistTimerId = setTimeout(() => {
      this._persistTimerId = null;
      this._flushNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  // ── Client: push current blob to server ─────────────────────────────────────

  private _requestSave(): void {
    if (NetworkingService.get().isServerContext()) return;
    // Absolute guard: never write before the cloud load has arrived, or we'd
    // overwrite the real save with pre-load defaults. Every mutation path
    // (ensureRunSeed / markLevelBeaten / markRunComplete / addRelic) is only
    // reachable after load in practice; this backstops the invariant.
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
    let value: TdSaveData;
    try {
      value = JSON.parse(json) as TdSaveData;
    } catch {
      console.log('[SaveService] flush skipped — pending blob not valid JSON');
      return;
    }
    this._playerVars
      .setVariable(this._player, SAVE_KEY, value)
      .then(() => console.log('[SaveService] Persisted'))
      .catch((e: unknown) => console.log('[SaveService] setVariable failed (rate-limit?):', e));
  }

  // ── Decode a stored/received blob into a normalized TdSaveData ──────────────

  private _decode(json: string): TdSaveData {
    if (!json) return defaultSave();
    try {
      const raw = JSON.parse(json) as Partial<TdSaveData>;
      return {
        runCount: typeof raw.runCount === 'number' ? raw.runCount : 0,
        seed: typeof raw.seed === 'number' ? raw.seed : 0,
        beaten: Array.isArray(raw.beaten) ? raw.beaten.map(Boolean) : [],
        relics: Array.isArray(raw.relics) ? raw.relics.filter((r): r is string => typeof r === 'string') : [],
      };
    } catch {
      console.log('[SaveService] Failed to parse save blob, starting fresh');
      return defaultSave();
    }
  }
}
