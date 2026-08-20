/**
 * LifeLossSfxService — Plays a short punchy impact SFX when a life is lost.
 *
 * Component Attachment: Scene Entity (AudioManager entity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.EnemyReachedEnd (fired when an enemy reaches the end
 * of the path and a life is deducted) and plays a non-spatial 2D one-shot
 * SFX via the AudioManager pool.
 */
import {
  Component,
  NetworkingService,
  Vec2,
  component,
  property,
  subscribe,
} from 'meta/worlds';
import type { Maybe, SoundAsset } from 'meta/worlds';
import { Events } from '../Types';
import { playSound2D } from '../Audio/AudioManager';

/** Slight pitch variation for each play so it doesn't sound robotic. */
const PITCH_MIN = 0.95;
const PITCH_MAX = 1.05;

/**
 * @component
 * Plays a punchy impact SFX each time an enemy reaches the end (life lost).
 */
@component()
export class LifeLossSfxService extends Component {
  /** The SFX asset to play on life loss. */
  @property()
  lossSfx: Maybe<SoundAsset> = null;

  /** Loudness-normalized volume from marketplace copy. */
  @property()
  volume: number = 0.7943282127380371;

  // -- Event handler --

  @subscribe(Events.EnemyReachedEnd)
  onLifeLost(_p: Events.EnemyReachedEndPayload): void {
    // Audio is client-only
    if (NetworkingService.get().isServerContext()) return;
    if (!this.lossSfx) {
      console.log('[LifeLossSfxService] No lossSfx asset assigned');
      return;
    }

    console.log('[LifeLossSfxService] Playing life-loss SFX');
    playSound2D(this.lossSfx, {
      playVolume: this.volume,
      minMaxPitch: new Vec2(PITCH_MIN, PITCH_MAX),
    });
  }
}
