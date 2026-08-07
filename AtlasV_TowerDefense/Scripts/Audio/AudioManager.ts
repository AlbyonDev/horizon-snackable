/**
 * AGENTS: DO NOT MODIFY THIS FILE
 */
import {
  AudioEmitterType,
  Component,
  component,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  property,
  SoundComponent,
  subscribe,
  TransformComponent,
  Vec2,
  Vec3,
  WorldService,
} from "meta/worlds";
import type { Maybe, SoundAsset, TemplateAsset } from "meta/worlds";

/** Optional configuration for one-shot sound playback */
export interface SoundPlayConfig {
  /** Volume level (0.0 to 1.0). Default uses template value. */
  playVolume?: number;
  /** Pitch range [min, max]. Random pitch chosen between values. 1.0 is normal. */
  minMaxPitch?: Vec2;
  /** Distance attenuation [minDist, maxDist]. Full volume within min, inaudible beyond max. */
  minMaxDistance?: Vec2;
  /** Reverb send level (0.0 to 1.0). */
  reverbSendLevel?: number;
}

/** Optional configuration for looping sound playback */
export interface LoopingPlayConfig {
  /** Volume level (0.0 to 1.0). */
  playVolume?: number;
  /** Distance attenuation [minDist, maxDist]. Full volume within min, inaudible beyond max. */
  minMaxDistance?: Vec2;
  /** Reverb send level (0.0 to 1.0). */
  reverbSendLevel?: number;
}

/** Optional configuration for music playback (non-positional) */
export interface MusicPlayConfig {
  /** Volume level (0.0 to 1.0). */
  volume?: number;
}

/** Default values for resetting sound components */
const DEFAULT_PLAY_VOLUME = 1.0;
const DEFAULT_MIN_MAX_PITCH = new Vec2(1.0, 1.0);
const DEFAULT_MIN_MAX_DISTANCE = new Vec2(1.0, 50.0);
const DEFAULT_REVERB_SEND_LEVEL = 0.0;
const DEFAULT_LOOP = false;

// ==================== MODULE-LEVEL STATE ====================

let _instance: AudioManager | null = null;

// Separate ready states for different subsystems
let _musicReady: boolean = false;
let _poolsReady: boolean = false;

// Separate resolver arrays for music vs pools
const _musicResolvers: Array<(inst: AudioManager) => void> = [];
const _poolsResolvers: Array<(inst: AudioManager) => void> = [];

/**
 * Check if running on server - audio only works on client
 */
function isServer(): boolean {
  return NetworkingService.get().isServerContext();
}

function waitForMusic(): Promise<AudioManager> {
  if (_instance && _musicReady) {
    return Promise.resolve(_instance);
  }
  return new Promise((resolve) => {
    _musicResolvers.push(resolve);
  });
}

function waitForPools(): Promise<AudioManager> {
  if (_instance && _poolsReady) {
    return Promise.resolve(_instance);
  }
  return new Promise((resolve) => {
    _poolsResolvers.push(resolve);
  });
}

function resolveMusicWaiters(): void {
  _musicReady = true;
  for (const resolve of _musicResolvers) {
    resolve(_instance!);
  }
  _musicResolvers.length = 0;
}

function resolvePoolsWaiters(): void {
  _poolsReady = true;
  for (const resolve of _poolsResolvers) {
    resolve(_instance!);
  }
  _poolsResolvers.length = 0;
}

// ==================== PUBLIC EXPORTED API ====================

/**
 * Play a one-shot sound at the specified world position.
 * Use for weapon impacts, explosions, footsteps, or any sound tied to a location in the world.
 * @param sound The SoundAsset to play
 * @param position World position to play the sound at
 * @param config Optional playback configuration
 */
export async function playSoundAtPosition(
  sound: SoundAsset,
  position: Vec3,
  config?: SoundPlayConfig
): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] playSoundAtPosition called on server - audio only works on client");
    return;
  }
  const inst = await waitForPools();
  inst.playSoundAtPositionInternal(sound, position, config);
}

/**
 * Play a one-shot non-spatial (2D) sound. Plays at full volume regardless of listener position.
 * Use for UI clicks, menu sounds, achievement notifications, or any sound not tied to a location.
 * @param sound The SoundAsset to play
 * @param config Optional playback configuration
 */
export async function playSound2D(
  sound: SoundAsset,
  config?: SoundPlayConfig
): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] playSound2D called on server - audio only works on client");
    return;
  }
  const inst = await waitForPools();
  inst.playSound2DInternal(sound, config);
}

/**
 * Play music (non-positional, replaces current track).
 * Use for background music, menu themes, or gameplay tracks. Automatically loops.
 * @param sound The SoundAsset to play
 * @param config Optional playback configuration
 */
export async function playMusic(
  sound: SoundAsset,
  config?: MusicPlayConfig
): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] playMusic called on server - audio only works on client");
    return;
  }
  const inst = await waitForMusic();
  inst.playMusicInternal(sound, config);
}

/**
 * Stop the currently playing music.
 * Use when transitioning between scenes or when the player pauses/exits.
 */
export async function stopMusic(): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] stopMusic called on server - audio only works on client");
    return;
  }
  const inst = await waitForMusic();
  inst.stopMusicInternal();
}

/**
 * Set the music volume.
 * @param volume Volume level (0.0 to 1.0)
 */
export async function setMusicVolume(volume: number): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] setMusicVolume called on server - audio only works on client");
    return;
  }
  const inst = await waitForMusic();
  inst.setMusicVolumeInternal(volume);
}

/**
 * Get the current music volume.
 */
export async function getMusicVolume(): Promise<number> {
  if (isServer()) {
    console.warn("[AudioManager] getMusicVolume called on server - audio only works on client");
    return 0;
  }
  const inst = await waitForMusic();
  return inst.getMusicVolumeInternal();
}

/**
 * Play a looping sound at the specified world position.
 * Use for ambient sounds like fires, waterfalls, machinery, or persistent effects.
 * @param sound The SoundAsset to play
 * @param position World position to play the sound at
 * @param config Optional playback configuration
 * @returns ID to use for stopping the sound, or -1 if failed
 */
export async function playLoopingSound(
  sound: SoundAsset,
  position: Vec3,
  config?: LoopingPlayConfig
): Promise<number> {
  if (isServer()) {
    console.warn("[AudioManager] playLoopingSound called on server - audio only works on client");
    return -1;
  }
  const inst = await waitForPools();
  return inst.playLoopingSoundInternal(sound, position, config);
}

/**
 * Stop a looping sound by ID.
 * Use when an ambient source is destroyed, a door closes, or an effect ends.
 * @param id The ID returned from playLoopingSound
 */
export async function stopLoopingSound(id: number): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] stopLoopingSound called on server - audio only works on client");
    return;
  }
  const inst = await waitForPools();
  inst.stopLoopingSoundInternal(id);
}

/**
 * Update the position of a looping sound.
 * Use for moving sound sources like vehicles, flying enemies, or projectiles with trails.
 * @param id The ID returned from playLoopingSound
 * @param position New world position
 */
export async function updateLoopingSoundPosition(
  id: number,
  position: Vec3
): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] updateLoopingSoundPosition called on server - audio only works on client");
    return;
  }
  const inst = await waitForPools();
  inst.updateLoopingSoundPositionInternal(id, position);
}

/**
 * Stop all active looping sounds.
 * Use when resetting the game, changing levels, or cleaning up before scene transition.
 */
export async function stopAllLoopingSounds(): Promise<void> {
  if (isServer()) {
    console.warn("[AudioManager] stopAllLoopingSounds called on server - audio only works on client");
    return;
  }
  const inst = await waitForPools();
  inst.stopAllLoopingSoundsInternal();
}

// ==================== AUDIO MANAGER COMPONENT ====================

/**
 * Client-side audio manager for playing sounds using pooled SoundComponents.
 *
 * **IMPORTANT: This component only runs on the client.**
 * - The component returns early on server context
 * - All public API functions warn and return early if called on server
 * - All sound sources are spawned with NetworkMode.LocalOnly
 *
 * ## Pools
 * - **One-shot pool** (`poolSize`, default 32): For fire-and-forget sounds via
 *   `playSoundAtPosition()` and `playSound2D()`. Uses round-robin cycling.
 * - **Looping pool** (`loopingPoolSize`, default 8): For ambient/looping sounds via
 *   `playLoopingSound()`. Tracked by ID for stop/position updates.
 * - **Music** (1 dedicated source): For background music via `playMusic()`.
 *   Non-positional, auto-loops, only one track at a time.
 *
 * ## Fast Startup
 * To minimize startup latency, the manager spawns sources in two phases:
 * 1. **Initial batch** (`initialOneShotCount` + `initialLoopingCount`): Spawned first,
 *    then waiters are resolved so sounds can play immediately.
 * 2. **Remaining sources**: Spawned in the background while the game runs.
 *
 * Music is spawned before all other pools for fastest music startup.
 *
 * ## Usage
 * Import the exported functions directly - no need to access the class:
 *
 * ```typescript
 * import {
 *   playSoundAtPosition,
 *   playSound2D,
 *   playMusic,
 *   stopMusic,
 *   playLoopingSound,
 *   stopLoopingSound
 * } from './AudioManager';
 *
 * // One-shot 3D sound at position (fire-and-forget)
 * playSoundAtPosition(impactSound, hitPosition);
 * playSoundAtPosition(explosionSound, pos, { minMaxPitch: new Vec2(0.9, 1.1) });
 *
 * // One-shot 2D sound for UI (fire-and-forget)
 * playSound2D(clickSound);
 * playSound2D(errorSound, { playVolume: 0.5 });
 *
 * // Background music (fire-and-forget, replaces current track)
 * playMusic(menuMusic, { volume: 0.5 });
 * stopMusic();
 *
 * // Looping ambient sound (must await to get ID for later control)
 * const fireId = await playLoopingSound(fireSound, firePosition);
 * updateLoopingSoundPosition(fireId, newPosition);
 * stopLoopingSound(fireId);
 * ```
 *
 * ## Server Safety
 * All API functions check for server context and return early with a warning.
 * This allows shared code to call audio functions without explicit client checks.
 *
 * Component Attachment: Attached to a dedicated entity in the scene (singleton pattern)
 * Component Networking: Local only (all sound sources spawned with NetworkMode.LocalOnly)
 * Component Ownership: Client only (component exits early on server context)
 */
@component()
export class AudioManager extends Component {
  /** Template entity with a SoundComponent to use for pools */
  @property()
  soundSourceTemplate: Maybe<TemplateAsset> = null;

  /** Number of sound sources for one-shot pool */
  @property()
  poolSize: number = 32;

  /** Number of sound sources for looping pool */
  @property()
  loopingPoolSize: number = 8;

  /** Number of initial one-shot sources to spawn before resolving (for fast startup) */
  @property()
  initialOneShotCount: number = 4;

  /** Number of initial looping sources to spawn before resolving (for fast startup) */
  @property()
  initialLoopingCount: number = 2;

  // One-shot pool
  private soundComponents: SoundComponent[] = [];
  private currentIndex: number = 0;
  private poolLocation: Vec3 = new Vec3(0, -100, 0);

  // Looping pool
  private loopingComponents: SoundComponent[] = [];
  private activeLoops: Map<number, SoundComponent> = new Map();
  private nextLoopId: number = 1;

  // Music (single dedicated source)
  private musicComponent: Maybe<SoundComponent> = null;
  private currentMusicVolume: number = 1.0;

  // ==================== LIFECYCLE ====================

  @subscribe(OnEntityStartEvent)
  async onStart() {

    // Does not run on server
    if (NetworkingService.get().isServerContext()) {
      return;
    }

    if (_instance && _instance !== this) {
      console.warn("[AudioManager] Multiple instances detected, using first instance");
      return;
    }
    _instance = this;

    if (!this.soundSourceTemplate) {
      console.warn("[AudioManager] No sound source template assigned");
      resolveMusicWaiters();
      resolvePoolsWaiters();
      return;
    }

    // Spawn dedicated music source FIRST - allows music to play early
    this.musicComponent = await this.spawnSoundSource(WorldService.get());
    console.log(`[AudioManager] Music source ready: ${this.musicComponent ? "yes" : "no"}`);
    resolveMusicWaiters();

    // Spawn initial batch of one-shot sources (for fast startup)
    const initialOneShot = Math.min(this.initialOneShotCount, this.poolSize);
    for (let i = 0; i < initialOneShot; i++) {
      const soundComponent = await this.spawnSoundSource(WorldService.get());
      if (soundComponent) {
        this.soundComponents.push(soundComponent);
      }
    }

    // Spawn initial batch of looping sources (for fast startup)
    const initialLooping = Math.min(this.initialLoopingCount, this.loopingPoolSize);
    for (let i = 0; i < initialLooping; i++) {
      const soundComponent = await this.spawnSoundSource(WorldService.get());
      if (soundComponent) {
        this.loopingComponents.push(soundComponent);
      }
    }

    console.log(
      `[AudioManager] Initial pools ready: ${this.soundComponents.length} one-shot, ` +
        `${this.loopingComponents.length} looping - resolving waiters`
    );

    // Resolve pool waiters - sounds can now play with initial batch
    resolvePoolsWaiters();

    // Continue spawning remaining one-shot sources in background
    for (let i = initialOneShot; i < this.poolSize; i++) {
      const soundComponent = await this.spawnSoundSource(WorldService.get());
      if (soundComponent) {
        this.soundComponents.push(soundComponent);
      }
    }

    // Continue spawning remaining looping sources in background
    for (let i = initialLooping; i < this.loopingPoolSize; i++) {
      const soundComponent = await this.spawnSoundSource(WorldService.get());
      if (soundComponent) {
        this.loopingComponents.push(soundComponent);
      }
    }

    console.log(
      `[AudioManager] All pools ready: ${this.soundComponents.length} one-shot, ` +
        `${this.loopingComponents.length} looping`
    );
  }

  private async spawnSoundSource(world: WorldService): Promise<Maybe<SoundComponent>> {
    if (!this.soundSourceTemplate) return null;

    try {
      const entity = await world.spawnTemplate({
        templateAsset: this.soundSourceTemplate,
        networkMode: NetworkMode.LocalOnly,
        position: this.poolLocation,
      });

      let soundComponent = entity.getComponent(SoundComponent);
      if (!soundComponent) {
        const children = entity.getChildrenWithComponent(SoundComponent, true);
        if (children.length > 0) {
          soundComponent = children[0].getComponent(SoundComponent);
        }
      }
      if (!soundComponent) {
        console.warn(`[AudioManager] Spawned entity missing SoundComponent`);
        return null;
      }
      return soundComponent;
    } catch (error: unknown) {
      console.error(`[AudioManager] Failed to spawn sound source: ${String(error)}`);
      return null;
    }
  }

  // ==================== INTERNAL: ONE-SHOT ====================

  playSoundAtPositionInternal(sound: SoundAsset, position: Vec3, config?: SoundPlayConfig): void {
    if (this.soundComponents.length === 0) {
      console.warn("[AudioManager] No sound sources available");
      return;
    }

    const soundComponent = this.getNextSoundComponent();
    if (!soundComponent) return;

    // Ensure spatial mode
    (soundComponent as any).soundEmitterType = AudioEmitterType.Spatial;

    // Move sound source to target position
    const transform = soundComponent.entity.getComponent(TransformComponent);
    if (transform) {
      transform.worldPosition = position;
    }

    // Apply config if provided
    if (config) {
      if (config.playVolume !== undefined) {
        soundComponent.playVolume = config.playVolume;
      }
      if (config.minMaxPitch !== undefined) {
        soundComponent.minMaxPitch = config.minMaxPitch;
      }
      if (config.minMaxDistance !== undefined) {
        soundComponent.minMaxDistance = config.minMaxDistance;
      }
      if (config.reverbSendLevel !== undefined) {
        soundComponent.reverbSendLevel = config.reverbSendLevel;
      }
    }

    // Set asset and play
    (soundComponent as any).soundAsset = (sound as any).getId();
    soundComponent.play();
  }

  playSound2DInternal(sound: SoundAsset, config?: SoundPlayConfig): void {
    if (this.soundComponents.length === 0) {
      console.warn("[AudioManager] No sound sources available");
      return;
    }

    const soundComponent = this.getNextSoundComponent();
    if (!soundComponent) return;

    // Set to non-spatial mode
    (soundComponent as any).soundEmitterType = AudioEmitterType.NonSpatial;

    // Apply config if provided
    if (config) {
      if (config.playVolume !== undefined) {
        soundComponent.playVolume = config.playVolume;
      }
      if (config.minMaxPitch !== undefined) {
        soundComponent.minMaxPitch = config.minMaxPitch;
      }
      if (config.reverbSendLevel !== undefined) {
        soundComponent.reverbSendLevel = config.reverbSendLevel;
      }
    }

    // Set asset and play
    (soundComponent as any).soundAsset = (sound as any).getId();
    soundComponent.play();
  }

  private getNextSoundComponent(): Maybe<SoundComponent> {
    if (this.soundComponents.length === 0) return null;

    const component = this.soundComponents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.soundComponents.length;

    // Reset to defaults before returning
    component.playVolume = DEFAULT_PLAY_VOLUME;
    component.minMaxPitch = DEFAULT_MIN_MAX_PITCH;
    component.minMaxDistance = DEFAULT_MIN_MAX_DISTANCE;
    component.reverbSendLevel = DEFAULT_REVERB_SEND_LEVEL;

    return component;
  }

  // ==================== INTERNAL: LOOPING ====================

  playLoopingSoundInternal(sound: SoundAsset, position: Vec3, config?: LoopingPlayConfig): number {
    const soundComponent = this.getAvailableLoopingComponent();
    if (!soundComponent) {
      console.warn("[AudioManager] No looping sources available");
      return -1;
    }

    // Move to position
    const transform = soundComponent.entity.getComponent(TransformComponent);
    if (transform) {
      transform.worldPosition = position;
    }

    // Reset and apply config
    this.resetSoundComponent(soundComponent);
    (soundComponent as any).soundEmitterType = AudioEmitterType.Spatial;
    soundComponent.loop = true;

    if (config) {
      if (config.playVolume !== undefined) {
        soundComponent.playVolume = config.playVolume;
      }
      if (config.minMaxDistance !== undefined) {
        soundComponent.minMaxDistance = config.minMaxDistance;
      }
      if (config.reverbSendLevel !== undefined) {
        soundComponent.reverbSendLevel = config.reverbSendLevel;
      }
    }

    // Set asset and play
    (soundComponent as any).soundAsset = (sound as any).getId();
    soundComponent.play();

    // Track and return ID
    const id = this.nextLoopId++;
    this.activeLoops.set(id, soundComponent);
    return id;
  }

  stopLoopingSoundInternal(id: number): void {
    const soundComponent = this.activeLoops.get(id);
    if (!soundComponent) {
      return;
    }

    soundComponent.stop();
    soundComponent.loop = false;
    this.activeLoops.delete(id);

    // Move back to pool location
    const transform = soundComponent.entity.getComponent(TransformComponent);
    if (transform) {
      transform.worldPosition = this.poolLocation;
    }
  }

  stopAllLoopingSoundsInternal(): void {
    for (const [id] of this.activeLoops) {
      this.stopLoopingSoundInternal(id);
    }
  }

  updateLoopingSoundPositionInternal(id: number, position: Vec3): void {
    const soundComponent = this.activeLoops.get(id);
    if (!soundComponent) return;

    const transform = soundComponent.entity.getComponent(TransformComponent);
    if (transform) {
      transform.worldPosition = position;
    }
  }

  private getAvailableLoopingComponent(): Maybe<SoundComponent> {
    // Find first component not currently in use
    for (const component of this.loopingComponents) {
      let inUse = false;
      for (const activeComponent of this.activeLoops.values()) {
        if (activeComponent === component) {
          inUse = true;
          break;
        }
      }
      if (!inUse) {
        return component;
      }
    }
    return null;
  }

  // ==================== INTERNAL: MUSIC ====================

  playMusicInternal(sound: SoundAsset, config?: MusicPlayConfig): void {
    if (!this.musicComponent) {
      console.warn("[AudioManager] No music source available");
      return;
    }

    // Stop current music if playing
    this.musicComponent.stop();

    // Reset and configure
    this.resetSoundComponent(this.musicComponent);
    (this.musicComponent as any).soundEmitterType = AudioEmitterType.NonSpatial;
    this.musicComponent.loop = true;

    // Apply config
    this.currentMusicVolume = config?.volume ?? 1.0;
    this.musicComponent.playVolume = this.currentMusicVolume;

    // Set asset and play
    (this.musicComponent as any).soundAsset = (sound as any).getId();
    this.musicComponent.play();
  }

  stopMusicInternal(): void {
    if (!this.musicComponent) return;

    this.musicComponent.stop();
    this.musicComponent.loop = false;
  }

  setMusicVolumeInternal(volume: number): void {
    this.currentMusicVolume = volume;
    if (this.musicComponent) {
      this.musicComponent.playVolume = volume;
    }
  }

  getMusicVolumeInternal(): number {
    return this.currentMusicVolume;
  }

  // ==================== INTERNAL: UTILITIES ====================

  private resetSoundComponent(component: SoundComponent): void {
    component.playVolume = DEFAULT_PLAY_VOLUME;
    component.minMaxPitch = DEFAULT_MIN_MAX_PITCH;
    component.minMaxDistance = DEFAULT_MIN_MAX_DISTANCE;
    component.reverbSendLevel = DEFAULT_REVERB_SEND_LEVEL;
    component.loop = DEFAULT_LOOP;
    component.stop();
  }
}
