/**
 * BiomeMusicController — Dual-music-per-biome system.
 *
 * Each biome has TWO music tracks:
 *   1. Overworld music — plays during the overworld/level-select phase (looping, vol 0.4)
 *   2. Wave music — plays when the first wave starts (replaces overworld music)
 *
 * Transitions:
 *   - WaveStarted (waveIndex === 0) → stop overworld, start wave music
 *   - LevelCompleted / GameOver / RestartGame / ShowTitleScreen → stop wave, resume overworld
 *   - BiomeChanged → restart the appropriate track for the current phase
 *
 * Component Attachment: Scene entity (e.g. AudioManager in space.hstf)
 * Component Networking: Local (client-only audio)
 * Component Ownership: Server-owned scene entity, audio logic runs on client via ExecuteOn.Owner
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  Vec3,
  SoundAsset,
  component,
  subscribe,
  property,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase } from '../Types';
import { OverworldNodeType } from '../Defs/NodeDefs';
import { playLoopingSound, stopLoopingSound } from '../Audio/AudioManager';

// --- Sound Assets (static string literals) ---

// Grass overworld: abstract textural forest atmosphere (wind through foliage, rustling branches, no birds/instruments)
const GRASS_OVERWORLD_MUSIC: SoundAsset = new SoundAsset(
  '@SFX/VEGETree_Branches_Movement_Foliage_Rustling.ogg:sound',
);

// Grass biome wave music: Phantoms & Fantasies (dark/mysterious/psychedelic, ~108 BPM)
const GRASS_WAVE_MUSIC: SoundAsset = new SoundAsset(
  '@Music/phantoms_fantasies.ogg:sound',
);

// Volcano biome wave music: One Groove (energetic house, A minor, ~110 BPM, punchy bass)
const VOLCANO_WAVE_MUSIC: SoundAsset = new SoundAsset(
  '@Music/one_groove.ogg:sound',
);

// Snow biome wave music: Mister Mystery (dark/mysterious electronic, ~105 BPM)
const SNOW_WAVE_MUSIC: SoundAsset = new SoundAsset(
  '@Music/mister_mystery.ogg:sound',
);

// Boss level music: Sewers Loop Epic 1 (dark aggressive orchestral, heavy percussion + brass, full energy from first beat)
// Overrides normal wave music on boss levels across all biomes
const BOSS_WAVE_MUSIC: SoundAsset = new SoundAsset(
  '@Music/Sewers_Loop_EPIC_1.ogg:sound',
);

// --- Per-biome music configuration ---

interface IBiomeMusicConfig {
  overworld: SoundAsset | null;
  wave: SoundAsset;
}

/**
 * Snow and Volcano biomes don't have dedicated overworld music managed by THIS
 * controller (their ambient sounds are handled by BiomeAmbientAudioService).
 * Snow uses Mister Mystery (dark/mysterious electronic ~105 BPM).
 * Volcano uses One Groove (energetic house, A minor, ~110 BPM, punchy bass).
 * All wave tracks are by The Polish Ambassador.
 */
const BIOME_MUSIC: Record<string, IBiomeMusicConfig> = {
  grass: {
    overworld: GRASS_OVERWORLD_MUSIC,
    wave: GRASS_WAVE_MUSIC,
  },
  snow: {
    overworld: null, // ambient handled by BiomeAmbientAudioService
    wave: SNOW_WAVE_MUSIC,
  },
  volcano: {
    overworld: null, // handled by OverworldHud volcano ambient
    wave: VOLCANO_WAVE_MUSIC,
  },
};

const MUSIC_VOLUME = 1.2;
const BOSS_MUSIC_VOLUME = 2.8;

@component()
export class BiomeMusicController extends Component {
  // --- Internal state ---

  /** Currently active biome ID */
  private activeBiomeId: string = 'grass';

  /** Whether the game is in the overworld phase */
  private isOverworld: boolean = false;

  /** Whether the game is currently in wave phase */
  private isWavePhase: boolean = false;

  /** Whether the current level is a boss level */
  private isBossLevel: boolean = false;

  /** Looping sound ID for the overworld music (-1 = not playing) */
  private overworldMusicId: number = -1;

  /** Looping sound ID for the wave music (-1 = not playing) */
  private waveMusicId: number = -1;

  /** Guard: an overworld start is in progress */
  private overworldStarting: boolean = false;

  /** Guard: a wave start is in progress */
  private waveStarting: boolean = false;

  /** Stop promise for overworld (await before restarting) */
  private overworldStopPromise: Promise<void> | null = Promise.resolve();

  /** Stop promise for wave (await before restarting) */
  private waveStopPromise: Promise<void> | null = Promise.resolve();

  /** Prime flag for overworld audio pool component */
  private overworldPrimed: boolean = false;

  /** Prime flag for wave audio pool component */
  private wavePrimed: boolean = false;

  // --- Lifecycle ---

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeMusicController] Initialized');
  }

  // --- Event handlers ---

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const prevOverworld = this.isOverworld;
    const prevWavePhase = this.isWavePhase;

    this.isOverworld = payload.phase === GamePhase.Overworld;
    this.isWavePhase =
      payload.phase === GamePhase.Wave || payload.phase === GamePhase.WaveClear;

    console.log(
      `[BiomeMusicController] Phase changed: ${payload.phase}, isOverworld=${this.isOverworld}, isWave=${this.isWavePhase}`,
    );

    // Entered Overworld → stop wave music, start overworld music
    if (this.isOverworld && !prevOverworld) {
      this._stopWaveMusic();
      this._startOverworldMusic();
    }

    // Left active phases entirely (Idle, GameOver, Victory, BiomeSelect) → stop everything
    if (
      payload.phase === GamePhase.Idle ||
      payload.phase === GamePhase.BiomeSelect
    ) {
      this._stopOverworldMusic();
      this._stopWaveMusic();
    }
  }

  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Only transition music on the FIRST wave (waveIndex === 0).
    // Subsequent waves keep wave music playing.
    if (payload.waveIndex === 0) {
      console.log('[BiomeMusicController] First wave started — switching to wave music');
      this._stopOverworldMusic();
      this._startWaveMusic();
    }
  }

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Owner })
  onLevelCompleted(_payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeMusicController] Level completed — stopping wave music');
    this._stopWaveMusic();
    // Overworld music will resume via GamePhaseChanged → Overworld
  }

  @subscribe(Events.GameOver, { execution: ExecuteOn.Owner })
  onGameOver(_payload: Events.GameOverPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeMusicController] Game over — stopping wave music');
    this._stopWaveMusic();
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestartGame(_payload: Events.RestartGamePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeMusicController] Restart game — stopping wave music');
    this._stopWaveMusic();
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_payload: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[BiomeMusicController] Show title screen — stopping all music');
    this._stopOverworldMusic();
    this._stopWaveMusic();
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(payload: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.isBossLevel = payload.nodeType === OverworldNodeType.Boss;
    console.log(`[BiomeMusicController] Level selected, isBoss=${this.isBossLevel}`);
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const prevBiome = this.activeBiomeId;
    this.activeBiomeId = payload.biomeId;

    if (prevBiome !== payload.biomeId) {
      console.log(`[BiomeMusicController] Biome changed: ${prevBiome} -> ${payload.biomeId}`);
      // Stop current music and restart appropriate track for the new biome
      if (this.overworldMusicId !== -1 || this.overworldStarting) {
        this._stopOverworldMusic();
        if (this.isOverworld) {
          this._startOverworldMusic();
        }
      }
      if (this.waveMusicId !== -1 || this.waveStarting) {
        this._stopWaveMusic();
        if (this.isWavePhase) {
          this._startWaveMusic();
        }
      }
    }
  }

  // --- Private helpers ---

  private _startOverworldMusic(): void {
    const config = BIOME_MUSIC[this.activeBiomeId];
    if (!config || !config.overworld) {
      // This biome has no overworld music managed by this controller
      return;
    }
    if (this.overworldMusicId !== -1 || this.overworldStarting) return;

    this.overworldStarting = true;
    const sound = config.overworld;

    const doStart = async (): Promise<number> => {
      if (this.overworldStopPromise) {
        await this.overworldStopPromise;
        this.overworldStopPromise = null;
      }

      // Prime cycle on first play to ensure playVolume sticks
      if (!this.overworldPrimed) {
        this.overworldPrimed = true;
        const primeId = await playLoopingSound(sound, Vec3.zero, { playVolume: MUSIC_VOLUME });
        await stopLoopingSound(primeId);
      }

      return playLoopingSound(sound, Vec3.zero, { playVolume: MUSIC_VOLUME });
    };

    doStart()
      .then(id => {
        this.overworldStarting = false;
        // Re-check if we should still be playing
        const stillShouldPlay = this.isOverworld && BIOME_MUSIC[this.activeBiomeId]?.overworld === sound;
        if (stillShouldPlay) {
          this.overworldMusicId = id;
          console.log(`[BiomeMusicController] Overworld music started (id=${id})`);
        } else {
          console.log('[BiomeMusicController] Overworld music resolved but no longer needed, stopping');
          stopLoopingSound(id);
        }
      })
      .catch(() => {
        this.overworldStarting = false;
      });
  }

  private _stopOverworldMusic(): void {
    if (this.overworldMusicId === -1) return;
    console.log(`[BiomeMusicController] Stopping overworld music (id=${this.overworldMusicId})`);
    this.overworldStopPromise = stopLoopingSound(this.overworldMusicId);
    this.overworldMusicId = -1;
  }

  private _startWaveMusic(): void {
    const config = BIOME_MUSIC[this.activeBiomeId];
    if (!config) return;
    if (this.waveMusicId !== -1 || this.waveStarting) return;

    this.waveStarting = true;
    // Use boss music override if this is a boss level
    const sound = this.isBossLevel ? BOSS_WAVE_MUSIC : config.wave;
    const vol = this.isBossLevel ? BOSS_MUSIC_VOLUME : MUSIC_VOLUME;

    const doStart = async (): Promise<number> => {
      if (this.waveStopPromise) {
        await this.waveStopPromise;
        this.waveStopPromise = null;
      }

      // Prime cycle on first play
      if (!this.wavePrimed) {
        this.wavePrimed = true;
        const primeId = await playLoopingSound(sound, Vec3.zero, { playVolume: vol });
        await stopLoopingSound(primeId);
      }

      return playLoopingSound(sound, Vec3.zero, { playVolume: vol });
    };

    doStart()
      .then(id => {
        this.waveStarting = false;
        // Check if we should still be playing: must be in wave phase AND the
        // expected sound for the current state matches what we started
        const expectedSound = this.isBossLevel ? BOSS_WAVE_MUSIC : BIOME_MUSIC[this.activeBiomeId]?.wave;
        const stillShouldPlay = this.isWavePhase && expectedSound === sound;
        if (stillShouldPlay) {
          this.waveMusicId = id;
          console.log(`[BiomeMusicController] Wave music started (id=${id}, boss=${this.isBossLevel})`);
        } else {
          console.log('[BiomeMusicController] Wave music resolved but no longer needed, stopping');
          stopLoopingSound(id);
        }
      })
      .catch(() => {
        this.waveStarting = false;
      });
  }

  private _stopWaveMusic(): void {
    if (this.waveMusicId === -1) return;
    console.log(`[BiomeMusicController] Stopping wave music (id=${this.waveMusicId})`);
    this.waveStopPromise = stopLoopingSound(this.waveMusicId);
    this.waveMusicId = -1;
  }
}
