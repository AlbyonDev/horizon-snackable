/**
 * GameEndSfxService — Plays a one-shot victory or defeat SFX when the game ends.
 *
 * Component Attachment: Scene Entity (dedicated entity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.GameOver and calls playSound2D() from the AudioManager
 * to play the appropriate sound based on whether the player won or lost.
 */
import {
  Component,
  ExecuteOn,
  NetworkingService,
  component,
  property,
  subscribe,
} from 'meta/worlds';
import type { Maybe, SoundAsset } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import { Events } from '../Types';
import { playSound2D } from '../../scripts/Audio/AudioManager';

@component()
export class GameEndSfxService extends Component {
  /** Sound to play when the player wins a level. */
  @property()
  victorySfx: Maybe<SoundAsset> = null;

  /** Sound to play when the player loses a level. */
  @property()
  defeatSfx: Maybe<SoundAsset> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GameEndSfxService] Initialized');
  }

  @subscribe(Events.GameOver, { execution: ExecuteOn.Everywhere })
  onGameOver(payload: Events.GameOverPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    if (payload.won) {
      if (this.victorySfx) {
        console.log('[GameEndSfxService] Playing victory SFX');
        playSound2D(this.victorySfx, { playVolume: 0.468 });
      }
    } else {
      if (this.defeatSfx) {
        console.log('[GameEndSfxService] Playing defeat SFX');
        playSound2D(this.defeatSfx, { playVolume: 0.7 });
      }
    }
  }
}
