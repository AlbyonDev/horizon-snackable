/**
 * SnowBiomeAudioController — Plays a looping cold wind ambient sound
 * while the Snow biome is active during gameplay phases.
 *
 * Component Attachment: Scene entity (e.g. AudioManager in space.hstf)
 * Component Networking: Local (client-only audio)
 * Component Ownership: Server-owned scene entity, audio logic runs on client via ExecuteOn.Owner
 *
 * Starts playing when the snow biome is active and the game is in Overworld,
 * Build, Wave, or WaveClear phases. Stops on biome change, GameOver, Victory,
 * or returning to the title/idle screen.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  Vec3,
  component,
  subscribe,
  property,
} from 'meta/worlds';
import type { Maybe, SoundAsset } from 'meta/worlds';

import { Events, GamePhase } from '../Types';
import { playLoopingSound, stopLoopingSound } from '../Audio/AudioManager';

const SNOW_BIOME_ID = 'snow';

@component()
export class SnowBiomeAudioController extends Component {
  /** The looping winter wind sound asset (set via template property) */
  @property() snowAmbientSound: Maybe<SoundAsset> = null;

  /** Volume for the snow ambient loop (0–1) */
  @property() volume: number = 0.6;

  // --- Internal state (local, not networked) ---

  /** Whether the game is in a phase where biome ambient should play */
  private isBiomeActive: boolean = false;

  /** The currently active biome ID */
  private activeBiomeId: string = 'grass';

  /** ID of the currently playing looping sound (null if not playing) */
  private loopId: number | null = null;

  // --- Lifecycle ---

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[SnowBiomeAudioController] Initialized');
  }

  // --- Event handlers ---

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const wasActive = this.isBiomeActive;
    // Play during Overworld, Build, Wave, and WaveClear phases
    this.isBiomeActive =
      payload.phase === GamePhase.Overworld ||
      payload.phase === GamePhase.Build ||
      payload.phase === GamePhase.Wave ||
      payload.phase === GamePhase.WaveClear;

    if (this.isBiomeActive && !wasActive) {
      console.log(`[SnowBiomeAudioController] Entered active phase (${payload.phase}), biome=${this.activeBiomeId}`);
      this._updatePlayback();
    } else if (!this.isBiomeActive && wasActive) {
      console.log(`[SnowBiomeAudioController] Left active phase (${payload.phase}), stopping ambient`);
      this._stopAmbient();
    }
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const prevBiome = this.activeBiomeId;
    this.activeBiomeId = payload.biomeId;

    if (prevBiome !== payload.biomeId) {
      console.log(`[SnowBiomeAudioController] Biome changed: ${prevBiome} -> ${payload.biomeId}`);
      this._updatePlayback();
    }
  }

  // --- Private helpers ---

  /** Start or stop playback based on current state */
  private _updatePlayback(): void {
    const shouldPlay = this.isBiomeActive && this.activeBiomeId === SNOW_BIOME_ID;

    if (shouldPlay && this.loopId === null) {
      this._startAmbient();
    } else if (!shouldPlay && this.loopId !== null) {
      this._stopAmbient();
    }
  }

  /** Start the snow ambient loop */
  private async _startAmbient(): Promise<void> {
    if (!this.snowAmbientSound) {
      console.log('[SnowBiomeAudioController] No snowAmbientSound asset assigned, cannot play');
      return;
    }
    if (this.loopId !== null) return; // already playing

    console.log(`[SnowBiomeAudioController] Starting snow ambient loop (vol=${this.volume})`);
    this.loopId = await playLoopingSound(this.snowAmbientSound, Vec3.zero, {
      playVolume: this.volume,
    });
    console.log(`[SnowBiomeAudioController] Loop started, id=${this.loopId}`);
  }

  /** Stop the snow ambient loop */
  private _stopAmbient(): void {
    if (this.loopId === null) return;
    console.log(`[SnowBiomeAudioController] Stopping snow ambient loop (id=${this.loopId})`);
    stopLoopingSound(this.loopId);
    this.loopId = null;
  }
}
