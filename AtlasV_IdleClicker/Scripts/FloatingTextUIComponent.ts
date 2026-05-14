/**
 * FloatingTextUIComponent — drives "+gold" floating text animation.
 *
 * Component Attachment: Scene Entity (FloatingText template with CustomUiComponent)
 * Component Networking: Local (client-only rendering)
 * Component Ownership: Not Networked
 *
 * Uses dynamic particle array pattern (like CrystalShardController):
 * - Internal _particles[] tracks active floating text instances
 * - Each tick: update position/opacity/scale, remove expired, rebuild ViewModel array
 * - No slot limit — array grows/shrinks naturally
 * - All animation driven by TypeScript (no XAML storyboards)
 */
import {
  Component, OnEntityStartEvent,
  NetworkingService,
  CustomUiComponent,
  UiViewModel, uiViewModel,
  ExecuteOn,
  component, subscribe,
} from 'meta/worlds';
import { Events, GainSource } from './Types';
import { FloatingTextItemViewModel } from './FloatingTextItemViewModel';

const VERBOSE_LOG = false;

// --- Animation constants (same as original) ---
const ANIMATION_DURATION = 0.7;
const BASE_OFFSET_X = 350;
const BASE_OFFSET_Y = 350;
const RANDOM_OFFSET_X = 80;
const FLOAT_DISTANCE = 150;

// --- Scale pop animation constants (replicates old XAML storyboard) ---
// 0.5 → 1.2 (BackEase out over 0.15s) → 1.0 (settle by 0.25s)
const SCALE_POP_DURATION = 0.25;
const SCALE_START = 0.5;
const SCALE_OVERSHOOT = 1.2;
const SCALE_FINAL = 1.0;
const SCALE_OVERSHOOT_TIME = 0.15; // time to reach overshoot

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/** BackEase-out approximation: overshoot then settle */
function scaleEase(t: number): number {
  if (t >= 1) return SCALE_FINAL;
  if (t <= 0) return SCALE_START;

  // Phase 1: 0 → SCALE_OVERSHOOT_TIME → overshoot to 1.2
  const overshootNorm = SCALE_OVERSHOOT_TIME / SCALE_POP_DURATION;
  if (t < overshootNorm) {
    const phase = t / overshootNorm;
    // BackEase out approximation
    const eased = 1 - Math.pow(1 - phase, 2) * (1 - 2.5 * phase);
    return SCALE_START + (SCALE_OVERSHOOT - SCALE_START) * Math.min(1, Math.max(0, eased));
  }

  // Phase 2: SCALE_OVERSHOOT_TIME → SCALE_POP_DURATION → settle to 1.0
  const phase = (t - overshootNorm) / (1 - overshootNorm);
  return SCALE_OVERSHOOT + (SCALE_FINAL - SCALE_OVERSHOOT) * phase;
}

const SUFFIXES: [number, string][] = [
  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
  [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'],  [1e9, 'B'],   [1e6, 'M'],   [1e3, 'k'],
];

function formatAmount(value: number): string {
  const n = Math.floor(value);
  for (const [threshold, suffix] of SUFFIXES) {
    if (n >= threshold) {
      const scaled = n / threshold;
      const formatted = scaled >= 100 ? Math.floor(scaled).toString()
                      : scaled >= 10  ? scaled.toFixed(1).replace(/\.0$/, '')
                      :                 scaled.toFixed(2).replace(/\.?0+$/, '');
      return `${formatted}${suffix}`;
    }
  }
  return n >= 10 ? n.toString() : value.toFixed(1).replace(/\.0$/, '');
}

function _blendHex(a: string, b: string, t: number): string {
  const r = Math.round(parseInt(a.slice(1, 3), 16) * (1 - t) + parseInt(b.slice(1, 3), 16) * t);
  const g = Math.round(parseInt(a.slice(3, 5), 16) * (1 - t) + parseInt(b.slice(3, 5), 16) * t);
  const bl = Math.round(parseInt(a.slice(5, 7), 16) * (1 - t) + parseInt(b.slice(5, 7), 16) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Internal particle state */
interface FloatingTextParticle {
  text: string;
  startX: number;
  startY: number;
  color: string;
  startTime: number;
}

/**
 * Simple ViewModel that holds a dynamic array of FloatingTextItemViewModel instances.
 * The array is reassigned each frame to trigger XAML binding update.
 */
@uiViewModel()
class FloatingTextUIViewModel extends UiViewModel {
  public floatingTexts: readonly FloatingTextItemViewModel[] = [];
}

@component()
export class FloatingTextUIComponent extends Component {

  private _viewModel = new FloatingTextUIViewModel();
  private _particles: FloatingTextParticle[] = [];
  private _currentTime: number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) ui.dataContext = this._viewModel;
    console.log('[FloatingTextUIComponent] onStart — dynamic ItemsControl mode');
  }

  private _colorForGain(source: GainSource, isCrit: boolean, isFrenzy: boolean): string {
    const base = this._baseColor(source);
    if (isCrit && isFrenzy) return _blendHex(base, '#FF2200', 0.7);
    if (isCrit)             return '#FF6600';
    if (isFrenzy)           return _blendHex(base, '#FFFF00', 0.4);
    return base;
  }

  private _baseColor(source: GainSource): string {
    switch (source) {
      case GainSource.Passive:     return '#90EE90';
      case GainSource.Interest:    return '#00BFFF';
      case GainSource.VaultPayout: return '#DA70D6';
      default:                     return '#FFD700';
    }
  }

  @subscribe(Events.GainApplied, { execution: ExecuteOn.Everywhere })
  onGainApplied(payload: Events.GainAppliedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (payload.amount <= 0) return;

    const offsetX = BASE_OFFSET_X + (Math.random() - 0.5) * 2 * RANDOM_OFFSET_X;
    const color = this._colorForGain(payload.source, payload.isCrit, payload.isFrenzy);

    this._particles.push({
      text: `+${formatAmount(payload.amount)}`,
      startX: offsetX,
      startY: BASE_OFFSET_Y,
      color,
      startTime: this._currentTime,
    });

    if (VERBOSE_LOG) {
      console.log(`[FloatingTextUIComponent] Spawned particle: +${formatAmount(payload.amount)}`);
    }
  }

  @subscribe(Events.Tick, { execution: ExecuteOn.Everywhere })
  onTick(payload: Events.TickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentTime += payload.dt;

    if (this._particles.length === 0) {
      if (this._viewModel.floatingTexts.length > 0) {
        this._viewModel.floatingTexts = [];
      }
      return;
    }

    // Build new ViewModel array and remove expired particles (iterate backwards)
    const items: FloatingTextItemViewModel[] = [];

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      const elapsed = this._currentTime - p.startTime;

      if (elapsed >= ANIMATION_DURATION) {
        this._particles.splice(i, 1);
        continue;
      }

      const t = elapsed / ANIMATION_DURATION;
      const easedT = easeOutQuad(t);

      // Position: float upward
      const posY = p.startY - FLOAT_DISTANCE * easedT;

      // Opacity: full for first 50%, then fade out
      const fadeStartT = 0.5;
      let opacity: number;
      if (t < fadeStartT) {
        opacity = 1;
      } else {
        const fadeT = (t - fadeStartT) / (1 - fadeStartT);
        opacity = 1 - fadeT;
      }

      // Scale: pop animation over first SCALE_POP_DURATION seconds
      const scaleT = Math.min(elapsed / SCALE_POP_DURATION, 1);
      const scale = scaleEase(scaleT);

      const item = new FloatingTextItemViewModel();
      item.text = p.text;
      item.positionX = p.startX;
      item.positionY = posY;
      item.opacity = opacity;
      item.scale = scale;
      item.color = p.color;
      items.push(item);
    }

    // Reassign array to trigger binding update
    this._viewModel.floatingTexts = items;
  }
}
