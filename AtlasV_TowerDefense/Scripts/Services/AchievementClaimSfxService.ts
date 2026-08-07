/**
 * AchievementClaimSfxService — Plays a one-shot "coin collect" SFX when an
 * achievement tier reward is claimed in the Trophies/Achievements panel.
 *
 * Component Attachment: Scene Entity (AchievementClaimSfxEntity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.AchievementRewardClaimed (fired by AchievementHudController
 * on successful tier claim) and plays the SoundComponent on its entity.
 * Volume is 0.3, pitch varies 0.9–1.1 so rapid claims don't sound repetitive.
 */
import {
  Component,
  ExecuteOn,
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

/** Volume for the achievement claim SFX (0-1 range). */
const CLAIM_SFX_VOLUME = 0.3;

/** Pitch randomisation range so consecutive claims don't sound identical. */
const CLAIM_PITCH_MIN = 0.9;
const CLAIM_PITCH_MAX = 1.1;

@component()
export class AchievementClaimSfxService extends Component {
  private _sound: Maybe<SoundComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._sound = this.entity.getComponent(SoundComponent);
    if (!this._sound) {
      console.log('[AchievementClaimSfxService] No SoundComponent found on entity');
    } else {
      this._sound.playVolume = CLAIM_SFX_VOLUME;
      this._sound.minMaxPitch = new Vec2(CLAIM_PITCH_MIN, CLAIM_PITCH_MAX);
      console.log('[AchievementClaimSfxService] Initialized with volume=' + CLAIM_SFX_VOLUME + ' pitch=' + CLAIM_PITCH_MIN + '-' + CLAIM_PITCH_MAX);
    }
  }

  @subscribe(Events.AchievementRewardClaimed, { execution: ExecuteOn.Everywhere })
  onRewardClaimed(_p: Events.AchievementRewardClaimedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._sound) return;

    const playInfo = new SoundPlayInfo();
    playInfo.fadeInDuration = 0;
    this._sound.play(playInfo);
    console.log('[AchievementClaimSfxService] Playing achievement claim SFX');
  }
}
