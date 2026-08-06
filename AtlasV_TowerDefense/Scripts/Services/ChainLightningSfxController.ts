/**
 * ChainLightningSfxController — Plays an electric zap SFX each time a chain
 * lightning arc bounces between enemies.
 *
 * Component Attachment: Scene Entity (same entity as the EnemyHitSfxService pattern)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.ChainArcSpawned (fired by ChainLightningService) and
 * calls SoundComponent.play() with randomized pitch for variety.
 * Volume kept at ~0.25 to match the hammer hit SFX level.
 */
import {
  Component,
  NetworkingService,
  SoundComponent,
  SoundPlayInfo,
  Vec2,
  component,
  subscribe,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import { Events } from '../Types';

/** Volume for the chain zap SFX (0-1 range), matches hammer hit level. */
const CHAIN_ZAP_VOLUME = 0.25;

/** Pitch variation range — each play picks a random pitch between min and max. */
const CHAIN_ZAP_MIN_PITCH = 0.80;
const CHAIN_ZAP_MAX_PITCH = 1.20;

@component()
export class ChainLightningSfxController extends Component {
  private _sound: Maybe<SoundComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._sound = this.entity.getComponent(SoundComponent);
    if (!this._sound) {
      console.log('[ChainLightningSfxController] No SoundComponent found on entity');
    } else {
      this._sound.playVolume = CHAIN_ZAP_VOLUME;
      console.log('[ChainLightningSfxController] Initialized with volume=' + CHAIN_ZAP_VOLUME);
    }
  }

  @subscribe(Events.ChainArcSpawned)
  onChainArcSpawned(_p: Events.ChainArcSpawnedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._sound) return;

    // Randomize pitch each time for variety
    this._sound.minMaxPitch = new Vec2(CHAIN_ZAP_MIN_PITCH, CHAIN_ZAP_MAX_PITCH);

    const playInfo = new SoundPlayInfo();
    this._sound.play(playInfo);
  }
}
