/**
 * MultiAttackNotifier
 *
 * Drives two TextItemViewModels in the XAML texts layer:
 *   - Cascade banner: "Multi-Attack" (x1) / "Multi-Attack xN" (x2+)
 *   - Match banner:   "Critical!" (match-4) / "Limit Break!" (match-5+)
 *
 * Both use the same elastic punch-in animation with a color flash.
 *
 * Animation timeline (ANIM_DURATION = 1.8s):
 *   0.00 – 0.18s  Slam in: scale 2.4 → 0.88 (cubic ease-out)
 *   0.18 – 0.32s  Settle:  scale 0.88 → 1.0 (smooth-step)
 *   0.00 – 0.15s  Color:   white → gold
 *   0.00 – 0.25s  Shake:   9px → 0 (linear decay)
 *   last 0.40s    Fade out → opacity 0
 */
import { TextItemViewModel } from './SpriteViewModel';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 800;

const NOTIFIER_W = CANVAS_WIDTH;  // full-width so HorizontalAlignment=Center works
const NOTIFIER_H = 100;
// Position the cascade banner center at canvas (240, 360)
const BASE_X = 0;
const BASE_Y = CANVAS_HEIGHT / 2 - NOTIFIER_H / 2 - 40;
// Match banner sits 80px above the cascade banner
const MATCH_BASE_Y = BASE_Y - 80;

const FONT_SIZE = 54;
const STROKE_THICKNESS = 5;
const ANIM_DURATION = 1.8;

const SHAKE_DURATION = 0.25;
const SHAKE_INTENSITY = 9;
const FADE_OUT_START = 0.4;

const PUNCH_END = 0.18;
const SETTLE_END = 0.32;
const PUNCH_START_SCALE = 2.4;
const PUNCH_TARGET_SCALE = 0.88;
const COLOR_FLASH_DURATION = 0.15;

function makeNotifierVm(y: number, fontSize: number): TextItemViewModel {
  const vm = new TextItemViewModel();
  vm.width = NOTIFIER_W;
  vm.height = NOTIFIER_H;
  vm.fontSize = fontSize;
  vm.strokeColor = '#000000';
  vm.strokeThickness = STROKE_THICKNESS;
  vm.zIndex = 2000;
  vm.opacity = 0;
  vm.x = BASE_X;
  vm.y = y;
  return vm;
}

/** Shared punch-in animation state. */
interface BannerState {
  vm: TextItemViewModel;
  baseY: number;
  timer: number;
  isActive: boolean;
  /** Override final-settled color (white flash start is always #FFFFFF). */
  settledColor: string;
}

function triggerBanner(state: BannerState, text: string, settledColor: string): void {
  state.vm.text = text;
  state.vm.scale = PUNCH_START_SCALE;
  state.vm.fontColor = '#FFFFFF';
  state.vm.opacity = 1;
  state.vm.x = BASE_X;
  state.vm.y = state.baseY;
  state.timer = ANIM_DURATION;
  state.isActive = true;
  state.settledColor = settledColor;
}

function clearBanner(state: BannerState): void {
  state.isActive = false;
  state.timer = 0;
  state.vm.opacity = 0;
}

function updateBanner(state: BannerState, dt: number): void {
  if (!state.isActive) return;

  state.timer -= dt;
  if (state.timer <= 0) {
    state.isActive = false;
    state.vm.opacity = 0;
    return;
  }

  const elapsed = ANIM_DURATION - state.timer;

  // Elastic punch-in scale
  let scale: number;
  if (elapsed < PUNCH_END) {
    const t = elapsed / PUNCH_END;
    const eased = 1 - Math.pow(1 - t, 3);
    scale = PUNCH_START_SCALE + (PUNCH_TARGET_SCALE - PUNCH_START_SCALE) * eased;
  } else if (elapsed < SETTLE_END) {
    const t = (elapsed - PUNCH_END) / (SETTLE_END - PUNCH_END);
    const smooth = t * t * (3 - 2 * t);
    scale = PUNCH_TARGET_SCALE + (1.0 - PUNCH_TARGET_SCALE) * smooth;
  } else {
    scale = 1.0;
  }
  state.vm.scale = scale;

  // Shake: strong on entry, decays to zero
  if (elapsed < SHAKE_DURATION) {
    const intensity = SHAKE_INTENSITY * (1 - elapsed / SHAKE_DURATION);
    state.vm.x = BASE_X + (Math.random() - 0.5) * 2 * intensity;
    state.vm.y = state.baseY + (Math.random() - 0.5) * 2 * intensity;
  } else {
    state.vm.x = BASE_X;
    state.vm.y = state.baseY;
  }

  // Fade out in last FADE_OUT_START seconds
  state.vm.opacity = state.timer < FADE_OUT_START ? state.timer / FADE_OUT_START : 1.0;

  // Color: white → settledColor over COLOR_FLASH_DURATION
  // Parse settledColor (#RRGGBB) for interpolation
  const flashT = Math.min(1, elapsed / COLOR_FLASH_DURATION);
  const tr = parseInt(state.settledColor.slice(1, 3), 16);
  const tg = parseInt(state.settledColor.slice(3, 5), 16);
  const tb = parseInt(state.settledColor.slice(5, 7), 16);
  const r = Math.round(255 + (tr - 255) * flashT);
  const g = Math.round(255 + (tg - 255) * flashT);
  const b = Math.round(255 + (tb - 255) * flashT);
  const hex2 = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0').toUpperCase();
  state.vm.fontColor = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export class MultiAttackNotifier {
  private cascade: BannerState;
  private match: BannerState;

  constructor() {
    const cascadeVm = makeNotifierVm(BASE_Y, FONT_SIZE);
    this.cascade = { vm: cascadeVm, baseY: BASE_Y, timer: 0, isActive: false, settledColor: '#FFD700' };

    const matchVm = makeNotifierVm(MATCH_BASE_Y, 48);
    this.match = { vm: matchVm, baseY: MATCH_BASE_Y, timer: 0, isActive: false, settledColor: '#FFD700' };
  }

  getPool(): readonly TextItemViewModel[] {
    return [this.cascade.vm, this.match.vm];
  }

  trigger(cascadeCount: number): void {
    const text = cascadeCount === 1 ? 'Multi-Attack' : `Multi-Attack x${cascadeCount}`;
    triggerBanner(this.cascade, text, '#FFD700');
  }

  /** Show a JRPG match-size banner. isSuperCrit=true → "Limit Break!", false → "Critical!" */
  triggerMatchBanner(isSuperCrit: boolean): void {
    const text = isSuperCrit ? 'Limit Break!' : 'Critical!';
    const color = isSuperCrit ? '#FF9030' : '#FFD700';
    triggerBanner(this.match, text, color);
  }

  clear(): void {
    clearBanner(this.cascade);
    clearBanner(this.match);
  }

  update(dt: number): void {
    updateBanner(this.cascade, dt);
    updateBanner(this.match, dt);
  }
}
