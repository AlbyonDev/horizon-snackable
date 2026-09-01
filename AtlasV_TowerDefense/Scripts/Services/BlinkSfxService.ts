/**
 * BlinkSfxService — Plays spatial SFX when a Phase Shifter enemy blinks (teleports).
 *
 * Component Attachment: Scene Entity (same entity as other SFX services in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.EnemyBlinked and plays:
 *   - blinkDisappearSound at the old position (vanish whoosh)
 *   - blinkAppearSound at the new position (materialize sound)
 */
import {
  Component,
  NetworkingService,
  Vec2,
  Vec3,
  component,
  property,
  subscribe,
} from 'meta/worlds';
import type { Maybe, SoundAsset } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import { Events } from '../Types';
import { playSoundAtPosition } from '../Audio/AudioManager';

const BLINK_SFX_VOLUME = 0.35;
const BLINK_SFX_MIN_PITCH = 0.9;
const BLINK_SFX_MAX_PITCH = 1.1;

@component()
export class BlinkSfxService extends Component {
  @property() blinkDisappearSound: Maybe<SoundAsset> = null;
  @property() blinkAppearSound: Maybe<SoundAsset> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BlinkSfxService] Initialized');
  }

  @subscribe(Events.EnemyBlinked)
  onEnemyBlinked(p: Events.EnemyBlinkedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Play disappear SFX at old position
    if (this.blinkDisappearSound) {
      playSoundAtPosition(this.blinkDisappearSound, new Vec3(p.oldWorldX, 0.3, p.oldWorldZ), {
        playVolume: BLINK_SFX_VOLUME,
        minMaxPitch: new Vec2(BLINK_SFX_MIN_PITCH, BLINK_SFX_MAX_PITCH),
      });
    }

    // Play appear SFX at new position
    if (this.blinkAppearSound) {
      playSoundAtPosition(this.blinkAppearSound, new Vec3(p.newWorldX, 0.3, p.newWorldZ), {
        playVolume: BLINK_SFX_VOLUME,
        minMaxPitch: new Vec2(BLINK_SFX_MIN_PITCH, BLINK_SFX_MAX_PITCH),
      });
    }
  }
}
