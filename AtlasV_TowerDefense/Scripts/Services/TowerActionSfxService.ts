/**
 * TowerActionSfxService — Plays one-shot SFX for tower placement, upgrade, and sell actions.
 *
 * Component Attachment: Scene Entity (dedicated entity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.TowerPlaced, Events.TowerUpgraded, and Events.TowerSold,
 * and plays the corresponding SFX via AudioManager's playSound2D.
 * Volumes are balanced in the 0.25–0.4 range to match the cartoony medieval style.
 */
import {
  Component,
  NetworkingService,
  OnEntityStartEvent,
  component,
  property,
  subscribe,
} from 'meta/worlds';
import type { Maybe, SoundAsset } from 'meta/worlds';
import { Events } from '../Types';
import { playSound2D } from '../Audio/AudioManager';

/** Volume for tower placed SFX. */
const PLACE_VOLUME = 0.25;

/** Volume for tower upgraded SFX. */
const UPGRADE_VOLUME = 0.35;

/** Volume for tower sold SFX. */
const SELL_VOLUME = 0.45;

@component()
export class TowerActionSfxService extends Component {
  /** Sound played when a tower is placed on the grid. */
  @property() towerPlacedSound: Maybe<SoundAsset> = null;

  /** Sound played when a tower is upgraded. */
  @property() towerUpgradedSound: Maybe<SoundAsset> = null;

  /** Sound played when a tower is sold. */
  @property() towerSoldSound: Maybe<SoundAsset> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[TowerActionSfxService] Initialized');
  }

  @subscribe(Events.TowerPlaced)
  onTowerPlaced(_p: Events.TowerPlacedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.towerPlacedSound) return;
    console.log('[TowerActionSfxService] Playing tower placed SFX');
    playSound2D(this.towerPlacedSound, { playVolume: PLACE_VOLUME });
  }

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(_p: Events.TowerUpgradedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.towerUpgradedSound) return;
    console.log('[TowerActionSfxService] Playing tower upgraded SFX');
    playSound2D(this.towerUpgradedSound, { playVolume: UPGRADE_VOLUME });
  }

  @subscribe(Events.TowerSold)
  onTowerSold(_p: Events.TowerSoldPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.towerSoldSound) return;
    console.log('[TowerActionSfxService] Playing tower sold SFX');
    playSound2D(this.towerSoldSound, { playVolume: SELL_VOLUME });
  }
}
