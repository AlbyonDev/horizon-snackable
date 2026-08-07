/**
 * GrassBiomeAudioController — Plays a looping gentle cricket ambient sound
 * while the Grass biome is active during gameplay phases.
 *
 * Component Attachment: Scene entity (e.g. AudioManager in space.hstf)
 * Component Networking: Local (client-only audio)
 * Component Ownership: Server-owned scene entity, audio logic runs on client via ExecuteOn.Owner
 *
 * Starts playing when the grass biome is active and the game is in Overworld,
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

const GRASS_BIOME_ID = 'grass';

@component()
export class GrassBiomeAudioController extends Component {
  /** The looping grass ambient sound asset (set via template property) */
  @property() grassAmbientSound: Maybe<SoundAsset> = null;

  /** Volume for the grass ambient loop (0–1) */
  @property() volume: number = 0.75;

  // --- Internal state (local, not networked) ---

  /** Whether the game is in a phase where biome ambient should play */
  private isBiomeActive: boolean = false;

  /** The currently active biome ID */
  private activeBiomeId: string = 'grass';

  /** ID of the currently playing looping sound (null if not playing) */
  private loopId: number | null = null;

  /** Whether a start is in progress (prevents double-start during async gap) */
  private _starting: boolean = false;

  /** Promise from the last stop call — awaited before starting to prevent pool reuse race */
  private _stopPromise: Promise<void> | null = null;

  // --- Lifecycle ---

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GrassBiomeAudioController] Initialized');
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
      console.log(`[GrassBiomeAudioController] Entered active phase (${payload.phase}), biome=${this.activeBiomeId}`);
      this._updatePlayback();
    } else if (!this.isBiomeActive && wasActive) {
      console.log(`[GrassBiomeAudioController] Left active phase (${payload.phase}), stopping ambient`);
      this._stopAmbient();
    }
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const prevBiome = this.activeBiomeId;
    this.activeBiomeId = payload.biomeId;

    if (prevBiome !== payload.biomeId) {
      console.log(`[GrassBiomeAudioController] Biome changed: ${prevBiome} -> ${payload.biomeId}`);
      this._updatePlayback();
    }
  }

  // --- Private helpers ---

  /** Start or stop playback based on current state */
  private _updatePlayback(): void {
    const shouldPlay = this.isBiomeActive && this.activeBiomeId === GRASS_BIOME_ID;

    if (shouldPlay && this.loopId === null && !this._starting) {
      this._startAmbient();
    } else if (!shouldPlay && this.loopId !== null) {
      this._stopAmbient();
    }
  }

  /** Start the grass ambient loop */
  private _startAmbient(): void {
    if (!this.grassAmbientSound) {
      console.log('[GrassBiomeAudioController] No grassAmbientSound asset assigned, cannot play');
      return;
    }
    if (this.loopId !== null || this._starting) return;

    this._starting = true;
    console.log(`[GrassBiomeAudioController] Starting grass ambient loop (vol=${this.volume})`);

    const doStart = async (): Promise<number> => {
      // Wait for any pending stop to fully complete before starting,
      // preventing the audio engine from reusing a pool component
      // that hasn't fully flushed its previous playback state.
      if (this._stopPromise) {
        await this._stopPromise;
        this._stopPromise = null;
      }
      return playLoopingSound(this.grassAmbientSound!, Vec3.zero, {
        playVolume: this.volume,
      });
    };

    doStart()
      .then(id => {
        this._starting = false;
        // Re-check whether we should still be playing (state may have changed
        // while the promise was in flight — e.g. biome switched away during await)
        const stillShouldPlay = this.isBiomeActive && this.activeBiomeId === GRASS_BIOME_ID;
        if (stillShouldPlay) {
          this.loopId = id;
          console.log(`[GrassBiomeAudioController] Loop started, id=${this.loopId}`);
        } else {
          // State changed while the promise was in flight — stop immediately
          console.log('[GrassBiomeAudioController] Grass ambient resolved but no longer needed, stopping');
          stopLoopingSound(id);
        }
      })
      .catch(() => {
        this._starting = false;
      });
  }

  /** Stop the grass ambient loop */
  private _stopAmbient(): void {
    if (this.loopId === null) return;
    console.log(`[GrassBiomeAudioController] Stopping grass ambient loop (id=${this.loopId})`);
    this._stopPromise = stopLoopingSound(this.loopId);
    this.loopId = null;
  }
}
