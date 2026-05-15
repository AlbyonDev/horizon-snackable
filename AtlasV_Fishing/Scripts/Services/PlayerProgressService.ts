import {
  EventService,
  ExecuteOn,
  NetworkingService,
  PlayerVariablesService,
  Service,
  service,
  subscribe,
  serializable,
  type Entity,
} from 'meta/worlds';

import { Events, NetworkEvents } from '../Types';
import {
  LINE_MAX_LEVEL, HOOK_MAX_LEVEL,
  lineDepthAtLevel, hookMaxFishAtLevel, upgradeCost,
} from '../Constants';
import { FISH_DEFS } from '../FishDefs';

// ─── Persisted shape ─────────────────────────────────────────────────────────
@serializable()
class SaveData {
  readonly catchDefIds : readonly number[] = [];
  readonly catchCounts : readonly number[] = [];
  readonly gold        : number            = 0;
  readonly lineLevel   : number            = 0;
  readonly hookLevel   : number            = 0;
}

const SAVE_KEY = 'fishCollection';

// Coalesce rapid setVariable calls (e.g. a Launch dropping N fish back-to-back
// blasts the rate-limited backend). We flag dirty and flush a single write
// at the end of the burst.
const PERSIST_DEBOUNCE_MS = 400;

// =============================================================================
//  PlayerProgressService
//
//  Single entry point for persistence. Single-player world — one player at a time.
//
//  Server:
//    - OnPlayerCreate → fetchVariable → sendGlobally(ProgressData)
//    - ReportCatch    → update counts + award gold → setVariable
//    - ReportBuyUpgrade → validate cost, deduct gold, bump level → setVariable + UpgradeResult
//
//  Client:
//    - ProgressData   → Events.ProgressLoaded (local) → services seed themselves
//    - FishCollected  → sendGlobally(ReportCatch) → server persists + sends gold reward
//    - BuyUpgrade     → sendGlobally(ReportBuyUpgrade) → server validates + responds
//    - UpgradeResult  → Events.GoldChanged + Events.UpgradesChanged
// =============================================================================

@service()
export class PlayerProgressService extends Service {

  private _player    : Entity | null       = null;
  private _counts    : Map<number, number> = new Map();
  private _gold      : number              = 0;
  private _lineLevel : number              = 0;
  private _hookLevel : number              = 0;

  // Debounced persist state (server-side only).
  private _persistTimerId: ReturnType<typeof setTimeout> | null = null;
  private _persistDirty  : boolean                              = false;

  // ── Server: player joins ─────────────────────────────────────────────────────

  async loadForPlayer(player: Entity): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    this._player = player;
    let save: SaveData | undefined;
    try {
      save = await PlayerVariablesService.get().fetchVariable<SaveData>(player, SAVE_KEY);
    } catch (e) {
      console.error('[PlayerProgressService] fetchVariable failed:', e);
    }

    if (save) {
      this._counts    = new Map();
      for (let i = 0; i < save.catchDefIds.length; i++) {
        this._counts.set(save.catchDefIds[i], save.catchCounts[i]);
      }
      this._gold      = save.gold      ?? 0;
      this._lineLevel = save.lineLevel ?? 0;
      this._hookLevel = save.hookLevel ?? 0;
    } else {
      // First-time player: write the empty save immediately so a quick quit
      // does not lose the initial record.
      this._persistNow();
    }

    const catchDefIds = Array.from(this._counts.keys());
    EventService.sendGlobally(NetworkEvents.ProgressData, {
      catchDefIds,
      catchCounts: catchDefIds.map(id => this._counts.get(id)!),
      gold:        this._gold,
      lineLevel:   this._lineLevel,
      hookLevel:   this._hookLevel,
    });
  }

  // ── Server: client reports a catch ──────────────────────────────────────────

  @subscribe(NetworkEvents.ReportCatch)
  onReportCatch(p: NetworkEvents.ReportCatchPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    this._counts.set(p.defId, (this._counts.get(p.defId) ?? 0) + 1);
    const def = FISH_DEFS.find(d => d.id === p.defId);
    if (def) {
      this._gold += def.gold;
    }
    this._persist();
    // Send updated gold to client
    EventService.sendGlobally(NetworkEvents.UpgradeResult, {
      success:   true,
      gold:      this._gold,
      lineLevel: this._lineLevel,
      hookLevel: this._hookLevel,
    });
  }

  // ── Server: client requests an upgrade ──────────────────────────────────────

  @subscribe(NetworkEvents.ReportBuyUpgrade)
  onReportBuyUpgrade(p: NetworkEvents.ReportBuyUpgradePayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    let success = false;

    if (p.upgrade === 'line') {
      const nextLevel = this._lineLevel + 1;
      const cost      = upgradeCost(nextLevel);
      if (nextLevel <= LINE_MAX_LEVEL && this._gold >= cost) {
        this._gold      -= cost;
        this._lineLevel  = nextLevel;
        success = true;
      }
    } else if (p.upgrade === 'hook') {
      const nextLevel = this._hookLevel + 1;
      const cost      = upgradeCost(nextLevel);
      if (nextLevel <= HOOK_MAX_LEVEL && this._gold >= cost) {
        this._gold      -= cost;
        this._hookLevel  = nextLevel;
        success = true;
      }
    }

    if (success) this._persist();

    EventService.sendGlobally(NetworkEvents.UpgradeResult, {
      success,
      gold:      this._gold,
      lineLevel: this._lineLevel,
      hookLevel: this._hookLevel,
    });
  }

  // ── Client: receive loaded data ──────────────────────────────────────────────

  @subscribe(NetworkEvents.ProgressData, { execution: ExecuteOn.Everywhere })
  onProgressData(p: NetworkEvents.ProgressDataPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.ProgressLoaded, {
      catchDefIds: p.catchDefIds,
      catchCounts: p.catchCounts,
      gold:        p.gold,
      lineLevel:   p.lineLevel,
      hookLevel:   p.hookLevel,
    });
  }

  // ── Client: receive upgrade result ──────────────────────────────────────────

  @subscribe(NetworkEvents.UpgradeResult, { execution: ExecuteOn.Everywhere })
  onUpgradeResult(p: NetworkEvents.UpgradeResultPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.GoldChanged, { gold: p.gold });
    EventService.sendLocally(Events.UpgradesChanged, {
      lineLevel: p.lineLevel,
      hookLevel: p.hookLevel,
      maxDepth:  lineDepthAtLevel(p.lineLevel),
      maxFish:   hookMaxFishAtLevel(p.hookLevel),
    });
  }

  // ── Client: forward catch to server ─────────────────────────────────────────

  @subscribe(Events.FishCollected)
  onFishCollected(p: Events.FishCollectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendGlobally(NetworkEvents.ReportCatch, { defId: p.defId });
    // Notify local UI/services immediately so collection grid + HUD update in real-time
    EventService.sendLocally(Events.FishCaught, { fishId: p.fishId, defId: p.defId });
  }

  // ── Client: forward buy upgrade to server ────────────────────────────────────

  @subscribe(Events.BuyUpgrade)
  onBuyUpgrade(p: Events.BuyUpgradePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendGlobally(NetworkEvents.ReportBuyUpgrade, { upgrade: p.upgrade });
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  /**
   * Schedule a persist. Coalesces bursts (e.g. N fish collected in quick
   * succession during Launch) into a single setVariable call.
   */
  private _persist(): void {
    this._persistDirty = true;
    if (this._persistTimerId !== null) return;
    this._persistTimerId = setTimeout(() => {
      this._persistTimerId = null;
      if (this._persistDirty) this._persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  private _persistNow(): void {
    if (!this._player) return;
    this._persistDirty = false;
    const catchDefIds = Array.from(this._counts.keys());
    const save: SaveData = {
      catchDefIds,
      catchCounts: catchDefIds.map(id => this._counts.get(id)!),
      gold:        this._gold,
      lineLevel:   this._lineLevel,
      hookLevel:   this._hookLevel,
    };
    PlayerVariablesService.get()
      .setVariable(this._player, SAVE_KEY, save)
      .catch(e => console.error('[PlayerProgressService] setVariable failed:', e));
  }
}
