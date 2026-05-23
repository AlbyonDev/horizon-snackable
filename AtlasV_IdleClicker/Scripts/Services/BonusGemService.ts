/**
 * BonusGemService — Spawns a tappable mini-gem in the tap zone.
 *
 * DISABLED: the feature is currently off (ENABLED = false). The full
 * implementation is kept intact as the canonical example for adding a
 * clickable thing — see Docs/GAMEPLAY.md "Add a clickable thing" and
 * scripts/Utils/hitTest.ts. Flip ENABLED to true to re-enable.
 *
 * Lifecycle (when enabled):
 *   IDLE  (timer 5–15s, uniform random) → ACTIVE (timer 8–12s, uniform random) → IDLE …
 *
 * On player tap:
 *   - Hit-test PlayerTap.tapX/tapY against the bonus gem bbox (480×850 canvas).
 *   - On hit: addGain(currentTapValue * BONUS_GEM_MULTIPLIER, Tap),
 *             increment 'taps' stat by 1 (so Frenzy can still tick),
 *             increment 'bonus_gem.collected' stat,
 *             return to IDLE immediately.
 *   - Hit-test ignores PlayerTap.isAuto — auto-cursors cannot collect the bonus.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import {
  BONUS_GEM_MULTIPLIER,
  BONUS_GEM_SPAWN_DELAY_MIN,
  BONUS_GEM_SPAWN_DELAY_MAX,
  BONUS_GEM_LIFETIME_MIN,
  BONUS_GEM_LIFETIME_MAX,
  BONUS_GEM_SIZE,
  BONUS_GEM_SPAWN_X_MIN,
  BONUS_GEM_SPAWN_X_MAX,
  BONUS_GEM_SPAWN_Y_MIN,
  BONUS_GEM_SPAWN_Y_MAX,
} from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { TapService } from './TapService';
import { StatsService } from './StatsService';
import { isHitCentered } from '../Utils/hitTest';

function uniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Master switch — set to true to re-enable the bonus mini-gem feature. */
const ENABLED = false;

@service()
export class BonusGemService extends Service {

  private _active   : boolean = false;
  private _timeLeft : number  = 0;
  private _x        : number  = 240;
  private _y        : number  = 320;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    if (!ENABLED) return;
    this._timeLeft = uniform(BONUS_GEM_SPAWN_DELAY_MIN, BONUS_GEM_SPAWN_DELAY_MAX);
  }

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!ENABLED) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft > 0) return;

    if (this._active) {
      // Lifetime expired → despawn, schedule next.
      this._active   = false;
      this._timeLeft = uniform(BONUS_GEM_SPAWN_DELAY_MIN, BONUS_GEM_SPAWN_DELAY_MAX);
    } else {
      // Spawn: pick random position, set lifetime.
      this._x        = uniform(BONUS_GEM_SPAWN_X_MIN, BONUS_GEM_SPAWN_X_MAX);
      this._y        = uniform(BONUS_GEM_SPAWN_Y_MIN, BONUS_GEM_SPAWN_Y_MAX);
      this._active   = true;
      this._timeLeft = uniform(BONUS_GEM_LIFETIME_MIN, BONUS_GEM_LIFETIME_MAX);
    }
  }

  @subscribe(Events.PlayerTap)
  onPlayerTap(p: Events.PlayerTapPayload): void {
    if (!ENABLED) return;
    if (!this._active) return;
    if (p.isAuto) return; // Auto-cursors don't collect the bonus.
    if (p.tapX == null || p.tapY == null) return;
    if (!isHitCentered(p.tapX, p.tapY, this._x, this._y, BONUS_GEM_SIZE, BONUS_GEM_SIZE)) return;

    // Reward: 10× current tap value as a single Tap-source gain.
    const reward = TapService.get().getClickValue() * BONUS_GEM_MULTIPLIER;
    ResourceService.get().addGain(reward, GainSource.Tap);
    StatsService.get().increment('taps', 1);
    StatsService.get().increment('bonus_gem.collected', 1);

    // Despawn + reschedule.
    this._active   = false;
    this._timeLeft = uniform(BONUS_GEM_SPAWN_DELAY_MIN, BONUS_GEM_SPAWN_DELAY_MAX);
  }

  isActive() : boolean { return this._active; }
  getX()     : number  { return this._x; }
  getY()     : number  { return this._y; }
  getSize()  : number  { return BONUS_GEM_SIZE; }
}
