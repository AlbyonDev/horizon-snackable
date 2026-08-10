/**
 * BiomeAmbientAudioService — Unified ambient audio controller for ALL biomes.
 * Plays a single looping ambient sound based on the currently active biome
 * during gameplay phases (Overworld, Build, Wave, WaveClear).
 *
 * Component Attachment: Scene entity (AudioManager in space.hstf)
 * Component Networking: Local (client-only audio)
 * Component Ownership: Server-owned scene entity, audio logic runs on client via ExecuteOn.Owner
 *
 * Replaces the previous per-biome approach:
 *   - GrassBiomeAudioController (removed)
 *   - SnowBiomeAudioController (removed)
 *   - Volcano ambient in OverworldHud (removed)
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  SoundAsset,
  Vec3,
  component,
  subscribe,
  property,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase } from '../Types';
import { playLoopingSound, stopLoopingSound } from '../Audio/AudioManager';

@component()
export class BiomeAmbientAudioService extends Component {
  // --- Configurable sound assets per biome (set via template properties) ---

  /** Looping ambient sound for the Grass biome */
  @property() grassAmbientSound: Maybe<SoundAsset> = null;
  /** Volume for the grass ambient loop (0–1) */
  @property() grassVolume: number = 1;

  /** Looping ambient sound for the Snow biome */
  @property() snowAmbientSound: Maybe<SoundAsset> = null;
  /** Volume for the snow ambient loop (0–1) */
  @property() snowVolume: number = 7;

  /** Looping ambient sound for the Volcano biome */
  @property() volcanoAmbientSound: Maybe<SoundAsset> = null;
  /** Volume for the volcano ambient loop (0–1) */
  @property() volcanoVolume: number = 1;

  // --- Internal state (local, not networked) ---

  /** Whether the game is in a phase where biome ambient should play */
  private _phaseActive: boolean = false;

  /** The currently active biome ID */
  private _activeBiomeId: string = 'grass';

  /** ID of the currently playing looping sound (-1 = not playing) */
  private _loopId: number = -1;

  /** Which biome's sound is currently playing (empty string = none) */
  private _playingBiome: string = '';

  /** Whether a start is in progress (prevents double-start during async gap) */
  private _starting: boolean = false;

  /** Promise from the last stop call — awaited before starting to prevent pool reuse race.
   *  Initialized to a resolved promise so the FIRST play goes through the same await path. */
  private _stopPromise: Promise<void> | null = Promise.resolve();

  /** Per-biome primed flags (first play cycle caches asset on the audio pool component) */
  private _primed: Record<string, boolean> = {};

  // --- Lifecycle ---

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeAmbientAudioService] Initialized');
  }

  // --- Event handlers ---

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const wasActive = this._phaseActive;
    this._phaseActive =
      payload.phase === GamePhase.Overworld ||
      payload.phase === GamePhase.Build ||
      payload.phase === GamePhase.Wave ||
      payload.phase === GamePhase.WaveClear;

    if (this._phaseActive && !wasActive) {
      console.log(`[BiomeAmbientAudioService] Entered active phase (${payload.phase}), biome=${this._activeBiomeId}`);
      this._updatePlayback();
    } else if (!this._phaseActive && wasActive) {
      console.log(`[BiomeAmbientAudioService] Left active phase (${payload.phase}), stopping ambient`);
      this._stopAmbient();
    }
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const prevBiome = this._activeBiomeId;
    this._activeBiomeId = payload.biomeId;

    if (prevBiome !== payload.biomeId) {
      console.log(`[BiomeAmbientAudioService] Biome changed: ${prevBiome} -> ${payload.biomeId}`);
      this._updatePlayback();
    }
  }

  // --- Private helpers ---

  /** Get the sound asset for the given biome, or null if not configured */
  private _getSoundForBiome(biomeId: string): Maybe<SoundAsset> {
    switch (biomeId) {
      case 'grass': return this.grassAmbientSound;
      case 'snow': return this.snowAmbientSound;
      case 'volcano': return this.volcanoAmbientSound;
      default: return null;
    }
  }

  /** Get the volume for the given biome */
  private _getVolumeForBiome(biomeId: string): number {
    switch (biomeId) {
      case 'grass': return this.grassVolume;
      case 'snow': return this.snowVolume;
      case 'volcano': return this.volcanoVolume;
      default: return 0.7;
    }
  }

  /** Start or stop playback based on current state */
  private _updatePlayback(): void {
    const targetBiome = this._activeBiomeId;
    const sound = this._getSoundForBiome(targetBiome);
    const shouldPlay = this._phaseActive && sound !== null;

    // If the wrong biome is playing, stop first
    if (this._loopId !== -1 && this._playingBiome !== targetBiome) {
      this._stopAmbient();
    }

    if (shouldPlay && this._loopId === -1 && !this._starting) {
      this._startAmbient(targetBiome);
    } else if (!shouldPlay && this._loopId !== -1) {
      this._stopAmbient();
    }
  }

  /** Start the ambient loop for a specific biome */
  private _startAmbient(biomeId: string): void {
    const sound = this._getSoundForBiome(biomeId);
    if (!sound) {
      console.log(`[BiomeAmbientAudioService] No ambient sound assigned for biome '${biomeId}', skipping`);
      return;
    }
    if (this._loopId !== -1 || this._starting) return;

    this._starting = true;
    const volume = this._getVolumeForBiome(biomeId);
    console.log(`[BiomeAmbientAudioService] Starting ${biomeId} ambient loop (vol=${volume})`);

    const doStart = async (): Promise<number> => {
      // Wait for any pending stop to fully complete before starting
      if (this._stopPromise) {
        await this._stopPromise;
        this._stopPromise = null;
      }

      // Prime cycle: first play/stop/play caches the asset and volume sticks
      if (!this._primed[biomeId]) {
        this._primed[biomeId] = true;
        const primeId = await playLoopingSound(sound!, Vec3.zero, { playVolume: volume });
        await stopLoopingSound(primeId);
      }

      return playLoopingSound(sound!, Vec3.zero, { playVolume: volume });
    };

    doStart()
      .then(id => {
        this._starting = false;
        // Re-check whether we should still be playing this biome
        const stillShouldPlay = this._phaseActive && this._activeBiomeId === biomeId;
        if (stillShouldPlay) {
          this._loopId = id;
          this._playingBiome = biomeId;
          console.log(`[BiomeAmbientAudioService] ${biomeId} loop started, id=${this._loopId}`);
        } else {
          console.log(`[BiomeAmbientAudioService] ${biomeId} ambient resolved but no longer needed, stopping`);
          stopLoopingSound(id);
          // State changed while we were starting — re-evaluate so the correct biome can start
          this._updatePlayback();
        }
      })
      .catch(() => {
        this._starting = false;
        // Async start failed — re-evaluate in case the biome/phase is still valid
        this._updatePlayback();
      });
  }

  /** Stop the current ambient loop */
  private _stopAmbient(): void {
    if (this._loopId === -1) return;
    console.log(`[BiomeAmbientAudioService] Stopping ${this._playingBiome} ambient loop (id=${this._loopId})`);
    this._stopPromise = stopLoopingSound(this._loopId);
    this._loopId = -1;
    this._playingBiome = '';
  }
}
