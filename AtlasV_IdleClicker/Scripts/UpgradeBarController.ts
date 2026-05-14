/**
 * UpgradeBarController
 *
 * Component Attachment: Scene Entity (with CustomUiComponent)
 * Component Networking: Local (client-side UI only)
 *
 * Binds the 4 UpgradeBar slots to live service state:
 *   - CRITICAL: chance% / x multiplier — once crit.unlock purchased
 *   - INCOME:   interest rate% + countdown until next payout (InterestService)
 *   - VAULT:    locked amount + remaining countdown (VaultService)
 *   - FRENZY:   active timer OR taps progress toward threshold (FrenzyService)
 *
 * Slots whose underlying feature is not unlocked are hidden (isVisible = false)
 * rather than showing a "Locked" label.
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
} from 'meta/worlds';

import { Events, GainSource } from './Types';
import { createUpgradeBarViewModel } from './UpgradeBarViewModel';
import type { UpgradeBarViewModel, UpgradeSlotViewModel } from './UpgradeBarViewModel';
import { CritService } from './Services/CritService';
import { InterestService } from './Services/InterestService';
import { VaultService } from './Services/VaultService';
import { FrenzyService } from './Services/FrenzyService';

// Signature colors used to highlight each slot's border when its upgrade fires.
// RGB components only — alpha is composed at runtime (constant for persistent
// states, animated for crit/interest flashes).
const CRIT_RGB     = 'FF3D9A';
const INTEREST_RGB = 'FFD700';
const VAULT_RGB    = '50C8FF';
const FRENZY_RGB   = 'E74C3C';
const IDLE_BORDER  = '#00000000';

const FLASH_DURATION = 0.8;   // seconds — total visible time for a flash
const FLASH_FADE_IN  = 0.15;  // seconds — ramp-up at the very start of the flash
const PERSISTENT_ALPHA = 0xCC; // ~80% — alpha for vault/frenzy steady borders
const FLASH_PEAK_ALPHA = 0xE6; // ~90% — peak alpha at the top of a flash

function alphaHex(v: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(v)));
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}

/** Build an ARGB color string for a flash given its remaining time. */
function flashColor(rgb: string, timeLeft: number): string {
  if (timeLeft <= 0) return IDLE_BORDER;
  const fadeInElapsed = FLASH_DURATION - timeLeft;
  const ratio = fadeInElapsed < FLASH_FADE_IN
    ? fadeInElapsed / FLASH_FADE_IN                              // fade-in
    : timeLeft / (FLASH_DURATION - FLASH_FADE_IN);               // fade-out
  return `#${alphaHex(FLASH_PEAK_ALPHA * Math.max(0, Math.min(1, ratio)))}${rgb}`;
}

/** Steady alpha for borders that stay on while a state is active. */
function persistentColor(rgb: string): string {
  return `#${alphaHex(PERSISTENT_ALPHA)}${rgb}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}k`;
  if (n >= 10)            return Math.floor(n).toString();
  return n.toFixed(1).replace(/\.0$/, '');
}

function formatSeconds(seconds: number): string {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

@component()
export class UpgradeBarController extends Component {
  private viewModel: UpgradeBarViewModel = createUpgradeBarViewModel();

  // Remaining flash time per slot (in seconds). 0 = idle border.
  private _critFlashLeft     : number = 0;
  private _interestFlashLeft : number = 0;
  private _vaultFlashLeft    : number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    if (NetworkingService.get().isServerContext()) return;
    const uiComponent = this.entity.getComponent(CustomUiComponent);
    if (uiComponent) {
      uiComponent.dataContext = this.viewModel;
    }
    this._refreshAll();
  }

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._critFlashLeft     = Math.max(0, this._critFlashLeft     - p.dt);
    this._interestFlashLeft = Math.max(0, this._interestFlashLeft - p.dt);
    this._vaultFlashLeft    = Math.max(0, this._vaultFlashLeft    - p.dt);
    this._refreshAll();
  }

  @subscribe(Events.GainApplied)
  onGainApplied(p: Events.GainAppliedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (p.isCrit)                         this._critFlashLeft     = FLASH_DURATION;
    if (p.source === GainSource.Interest) this._interestFlashLeft = FLASH_DURATION;
  }

  @subscribe(Events.ResourceChanged)
  onResourceChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshAll();
  }

  @subscribe(Events.StatsChanged)
  onStatsChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshAll();
  }

  private _refreshAll(): void {
    const slots = this.viewModel.slots;
    if (slots.length < 4) return;
    this._refreshCrit(slots[0]);
    this._refreshInterest(slots[1]);
    this._refreshVault(slots[2]);
    this._refreshFrenzy(slots[3]);
  }

  private _refreshCrit(slot: UpgradeSlotViewModel): void {
    const crit = CritService.get();
    if (!crit.isPurchased()) {
      slot.isVisible = false;
      return;
    }
    slot.isVisible = true;
    slot.value = `${Math.round(crit.getChance() * 100)}% / x${crit.getMultiplier()}`;
    slot.progressVisible = false;
    slot.borderColor = flashColor(CRIT_RGB, this._critFlashLeft);
  }

  private _refreshInterest(slot: UpgradeSlotViewModel): void {
    const interest = InterestService.get();
    if (!interest.isPurchased()) {
      slot.isVisible = false;
      return;
    }
    slot.isVisible = true;
    slot.value = `${(interest.getRate() * 100).toFixed(1)}%`;

    const total = interest.getInterval();
    const left  = interest.getTimeUntilNext();
    const elapsed = Math.max(0, total - left);
    slot.progressVisible = true;
    slot.progressPercent = Math.round((elapsed / total) * 100);
    slot.progressText    = formatSeconds(left);
    slot.borderColor = flashColor(INTEREST_RGB, this._interestFlashLeft);
  }

  private _refreshVault(slot: UpgradeSlotViewModel): void {
    const vault = VaultService.get();
    if (!vault.isPurchased()) {
      slot.isVisible = false;
      return;
    }
    slot.isVisible = true;
    if (vault.isLocked()) {
      slot.value = `${formatNumber(vault.getLockedAmount())}`;
      const total = vault.getDuration();
      const left  = vault.getTimeLeft();
      const elapsed = Math.max(0, total - left);
      slot.progressVisible = true;
      slot.progressPercent = Math.round((elapsed / total) * 100);
      slot.progressText    = formatSeconds(left);
      slot.borderColor     = persistentColor(VAULT_RGB);
    } else {
      slot.value = 'Ready';
      slot.progressVisible = false;
      slot.borderColor     = IDLE_BORDER;
    }
  }

  private _refreshFrenzy(slot: UpgradeSlotViewModel): void {
    const frenzy = FrenzyService.get();
    if (!frenzy.isPurchased()) {
      slot.isVisible = false;
      return;
    }
    slot.isVisible = true;
    if (frenzy.isActive()) {
      // Active phase: bar fills 0 → 1 in red as the trance burns down.
      slot.value = `x${frenzy.getMultiplier()}`;
      const total = frenzy.getDuration();
      const left  = frenzy.getTimeLeft();
      slot.progressVisible  = true;
      slot.progressPercent  = Math.round(((total - left) / total) * 100);
      slot.progressText     = formatSeconds(left);
      slot.progressBarColor = '#E74C3C';
      slot.borderColor      = persistentColor(FRENZY_RGB);
    } else {
      // Charging phase: bar drains 1 → 0 in orange as the player taps it down.
      slot.value = `x${frenzy.getMultiplier()}`;
      const tapCount  = frenzy.getTapCount();
      const threshold = frenzy.getThreshold();
      const remaining = Math.max(0, threshold - tapCount);
      slot.progressVisible  = true;
      slot.progressPercent  = Math.round((remaining / threshold) * 100);
      slot.progressText     = `${remaining} taps`;
      slot.progressBarColor = '#FF6B35';
      slot.borderColor      = IDLE_BORDER;
    }
  }
}
