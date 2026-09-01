/**
 * SkillPurchaseSfxService — Plays a one-shot "magical confirm" SFX when a skill tree node is purchased.
 *
 * Component Attachment: Scene Entity (SkillPurchaseSfxEntity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.SkillTreeNodePurchased (fired by SkillTreeHudController on successful buy)
 * and plays the SoundComponent on its entity (sfxlib_ui_MagicalConfirm_01.ogg).
 * Volume is 0.3, pitch varies 0.9–1.1 so rapid purchases don't sound repetitive.
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

/** Volume for the skill purchase SFX (0-1 range). */
const PURCHASE_SFX_VOLUME = 0.3;

/** Pitch randomisation range so consecutive purchases don't sound identical. */
const PURCHASE_PITCH_MIN = 0.9;
const PURCHASE_PITCH_MAX = 1.1;

@component()
export class SkillPurchaseSfxService extends Component {
  private _sound: Maybe<SoundComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._sound = this.entity.getComponent(SoundComponent);
    if (!this._sound) {
      console.log('[SkillPurchaseSfxService] No SoundComponent found on entity');
    } else {
      this._sound.playVolume = PURCHASE_SFX_VOLUME;
      this._sound.minMaxPitch = new Vec2(PURCHASE_PITCH_MIN, PURCHASE_PITCH_MAX);
      console.log('[SkillPurchaseSfxService] Initialized with volume=' + PURCHASE_SFX_VOLUME + ' pitch=' + PURCHASE_PITCH_MIN + '-' + PURCHASE_PITCH_MAX);
    }
  }

  @subscribe(Events.SkillTreeNodePurchased, { execution: ExecuteOn.Everywhere })
  onSkillPurchased(_p: Events.SkillTreeNodePurchasedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._sound) return;

    const playInfo = new SoundPlayInfo();
    playInfo.fadeInDuration = 0;
    this._sound.play(playInfo);
    console.log('[SkillPurchaseSfxService] Playing skill purchase SFX');
  }
}
