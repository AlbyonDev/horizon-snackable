/**
 * UiClickSfxService — Plays a one-shot click SFX when any UI button is tapped.
 *
 * Component Attachment: Scene Entity (UiClickSfxEntity in space.hstf)
 * Component Networking: Local (audio is client-side only)
 * Component Ownership: Not Networked — runs on client
 *
 * Subscribes to Events.UiButtonClick (fired by all HUD controllers on button tap)
 * and plays the SoundComponent on its entity (sfxlib_ui_WoodConfirm_01.ogg).
 * Volume is set to 0.3 per art direction specs.
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

/** Volume for the UI click SFX (0-1 range). */
const CLICK_SFX_VOLUME = 0.3;

/** Pitch randomisation range so consecutive clicks don't sound identical. */
const CLICK_PITCH_MIN = 0.85;
const CLICK_PITCH_MAX = 1.15;

@component()
export class UiClickSfxService extends Component {
  private _sound: Maybe<SoundComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._sound = this.entity.getComponent(SoundComponent);
    if (!this._sound) {
      console.log('[UiClickSfxService] No SoundComponent found on entity');
    } else {
      this._sound.playVolume = CLICK_SFX_VOLUME;
      this._sound.minMaxPitch = new Vec2(CLICK_PITCH_MIN, CLICK_PITCH_MAX);
      console.log('[UiClickSfxService] Initialized with volume=' + CLICK_SFX_VOLUME + ' pitch=' + CLICK_PITCH_MIN + '-' + CLICK_PITCH_MAX);
    }
  }

  @subscribe(Events.UiButtonClick, { execution: ExecuteOn.Everywhere })
  onButtonClick(_p: Events.UiButtonClickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._sound) return;

    const playInfo = new SoundPlayInfo();
    playInfo.fadeInDuration = 0;
    this._sound.play(playInfo);
  }
}
