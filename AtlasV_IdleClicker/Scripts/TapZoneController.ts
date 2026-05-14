/**
 * TapZoneController
 *
 * Component Attachment: Scene Entity (with CustomUiComponent)
 * Component Networking: Local (client-side UI only)
 *
 * Drives the tap zone visuals:
 *   - Resource counter from ResourceChanged
 *   - Cursor sprites count from TapService (one per owned cursor, capped)
 *   - Gem deposit pop/wiggle on PlayerTap (TODO: anim)
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
  TextureAsset,
  WorldService,
} from 'meta/worlds';

import { Events, ResourceType } from './Types';
import { createTapZoneViewModel, TapZoneCursorViewModel } from './TapZoneViewModel';
import type { TapZoneViewModel } from './TapZoneViewModel';
import { TapService } from './Services/TapService';
import { cursorIcon } from './Assets';

const MAX_VISIBLE_CURSORS = 10;

function cursorLayout(i: number): { x: number; y: number; r: number; s: number; dir: number } {
  const h = (n: number) => { let v = n * 2654435761; v ^= v >>> 16; return (v & 0xFFFF) / 0xFFFF; };

  const dir  = (i % 2 === 0) ? 1 : -1;
  const slot = Math.floor(i / 2);

  // X: each slot drifts outward; small per-side jitter
  const baseX   = 60 + slot * 14;
  const xJitter = (h(slot * 7 + (dir > 0 ? 1 : 3)) - 0.5) * 16;
  const x       = dir * Math.min(baseX + xJitter, 130);

  // Y: same base per slot so left/right pairs sit at the same height,
  // then a tiny per-side nudge (±8px) to avoid perfect mirroring.
  const yBase   = -55 + h(slot * 13 + 5) * 130;   // −55..75, shared per pair
  const yNudge  = (h(i * 31 + 9) - 0.5) * 16;     // ±8 individual nudge
  const y       = yBase + yNudge;

  // Rotation: face inward; slight per-cursor variation
  const r = 10 + slot * 6 + (h(i * 17 + 2) - 0.5) * 24;

  const s = 0.78 + h(i * 23 + 7) * 0.16;

  return { x, y, r, s, dir };
}

const COMPACT_SUFFIXES: [number, string][] = [
  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
  [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'],  [1e9, 'B'],   [1e6, 'M'],   [1e3, 'k'],
];

function formatNumber(n: number): string {
  const v = Math.floor(n);
  for (const [threshold, suffix] of COMPACT_SUFFIXES) {
    if (v >= threshold) {
      const scaled = v / threshold;
      const body = scaled >= 100 ? Math.floor(scaled).toString()
                 : scaled >= 10  ? scaled.toFixed(1).replace(/\.0$/, '')
                 :                 scaled.toFixed(2).replace(/\.?0+$/, '');
      return `${body}${suffix}`;
    }
  }
  return v.toString();
}

@component()
export class TapZoneController extends Component {
  private viewModel: TapZoneViewModel = createTapZoneViewModel();
  private _lastCursorCount: number = -1;

  /** Tracks the last tap time for "TAP TO EARN" visibility logic */
  private _lastTapTime: number = 0;
  private _tapToEarnHidden: boolean = false;
  private static readonly TAP_INACTIVITY_THRESHOLD = 5.0; // seconds

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    if (NetworkingService.get().isServerContext()) return;
    const uiComponent = this.entity.getComponent(CustomUiComponent);
    if (uiComponent) {
      uiComponent.dataContext = this.viewModel;
    }
    this._refreshCursors();
  }

  @subscribe(Events.ResourceChanged)
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (payload.type !== ResourceType.Gold) return;
    this.viewModel.resourceText = formatNumber(payload.amount);
  }

  @subscribe(Events.StatsChanged)
  onStatsChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshCursors();
  }

  /** Round-robin index across visible cursors for auto-proc animation. */
  private _nextCursorAnimIndex: number = 0;

  @subscribe(Events.PlayerTap)
  onPlayerTap(p: Events.PlayerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._lastTapTime = WorldService.get().getWorldTime();
    if (!this._tapToEarnHidden) {
      this._tapToEarnHidden = true;
      this.viewModel.tapToEarnVisible = false;
    }

    if (p.isAuto) {
      // One cursor reacts per auto-proc (round-robin for visual variety).
      const cursors = this.viewModel.cursors;
      if (cursors.length > 0) {
        const idx = this._nextCursorAnimIndex % cursors.length;
        cursors[idx].animationTrigger++;
        this._nextCursorAnimIndex = (idx + 1) % cursors.length;
      }
    } else {
      // Manual tap → move pickaxe to tap position (clamped to row 1 area) then swing.
      // Row 1: y=128..510 in the 480×850 canvas. Default anchor (Bottom+40+halfSprite):
      //   centerX=240+30(margin)=270, centerY=510-40-48=422.
      const clampedX = Math.max(40,  Math.min(440, p.tapX!)) - 270;
      const clampedY = Math.max(128, Math.min(510, p.tapY!)) - 422;
      this.viewModel.playerPickaxeX    = clampedX;
      this.viewModel.playerPickaxeY    = clampedY;
      if (p.tapX! < 240) {
        this.viewModel.playerPickaxeFlip = 1;
        this.viewModel.playerPickaxeTriggerLeft++;
      } else {
        this.viewModel.playerPickaxeFlip = -1;
        this.viewModel.playerPickaxeTrigger++;
      }
    }

    // Gem deposit reacts to every tap, regardless of source.
    this.viewModel.gemAnimationTrigger++;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._tapToEarnHidden) return;

    const now = WorldService.get().getWorldTime();
    if (now - this._lastTapTime >= TapZoneController.TAP_INACTIVITY_THRESHOLD) {
      this._tapToEarnHidden = false;
      this.viewModel.tapToEarnVisible = true;
    }
  }

  private _refreshCursors(): void {
    const count = Math.min(MAX_VISIBLE_CURSORS, TapService.get().getCursorCount());
    if (count === this._lastCursorCount) return;
    this._lastCursorCount = count;

    const cursors: TapZoneCursorViewModel[] = [];
    for (let i = 0; i < count; i++) {
      const layout = cursorLayout(i);
      const c = new TapZoneCursorViewModel();
      c.positionX    = layout.x;
      c.positionY    = layout.y;
      c.rotation     = layout.r;
      c.scale        = layout.s;
      c.swingWindup  = -30 * layout.dir;
      c.swingStrike  =  20 * layout.dir;
      c.lungeWindup  = -10 * layout.dir;
      c.lungeStrike  =  18 * layout.dir;
      c.flipX        = layout.dir < 0 ? -1 : 1;
      c.icon         = cursorIcon;
      cursors.push(c);
    }
    this.viewModel.cursors = cursors;
  }
}
