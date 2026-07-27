/**
 * EnemyHitSfxService — Plays a one-shot sound effect when an enemy takes damage.
 *
 * Component Attachment: Scene Entity with a Sound component (sfx_hit_hammer_3.mp3 assigned)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.TakeDamage and calls SoundComponent.play()
 * on the same entity to trigger the hit SFX.
 * Volume is reduced and pitch is randomized per play for variety.
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

/** Volume for the hit SFX (0-1 range). */
const HIT_SFX_VOLUME = 0.25;

/** Pitch variation range — each play picks a random pitch between min and max. */
const HIT_SFX_MIN_PITCH = 0.85;
const HIT_SFX_MAX_PITCH = 1.15;

@component()
export class EnemyHitSfxService extends Component {
  private _sound: Maybe<SoundComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._sound = this.entity.getComponent(SoundComponent);
    if (!this._sound) {
      console.log('[EnemyHitSfxService] No SoundComponent found on entity');
    } else {
      this._sound.playVolume = HIT_SFX_VOLUME;
      console.log('[EnemyHitSfxService] Initialized with volume=' + HIT_SFX_VOLUME);
    }
  }

  @subscribe(Events.TakeDamage)
  onTakeDamage(_p: Events.TakeDamagePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._sound) return;

    // Randomize pitch each time for variety
    this._sound.minMaxPitch = new Vec2(HIT_SFX_MIN_PITCH, HIT_SFX_MAX_PITCH);

    const playInfo = new SoundPlayInfo();
    this._sound.play(playInfo);
  }
}
