/**
 * BlizzardService — Periodic snow-gust VFX + SFX for the Snow biome.
 *
 * Every 5 seconds (when the biome is "snow" and the game is in Build/Wave/WaveClear),
 * triggers a blizzard VFX burst and plays a cold wind gust SFX.
 * Every 3rd gust (15s cycle) is a "super intense" blizzard with extra VFX layers,
 * louder/layered wind SFX, and longer duration for a dramatic effect.
 * The intense cycle scales with the player's run count (every 5th gust on early
 * runs down to every gust at run 100+).
 *
 * The VFX uses the snow_blizzard_local PopcornFX asset spawned as a local-only entity
 * positioned at grid center. It is played/stopped on each gust cycle for a punchy burst.
 *
 * Component Attachment: Force-instantiated in GameManager._startGame() (service singleton)
 * Component Networking: Local (client-only visual/audio effect)
 * Component Ownership: Not networked — runs on client via ExecuteOn.Owner
 */
import {
  Service,
  WorldService,
  NetworkMode,
  Vec3,
  Vec2,
  Quaternion,
  TransformComponent,
  NetworkingService,
  OnWorldUpdateEvent,
  ExecuteOn,
  VfxComponent,
  TemplateAsset,
  EventService,
  service,
  subscribe,
} from 'meta/worlds';
import type { Entity, OnWorldUpdateEventPayload } from 'meta/worlds';

import { Events, GamePhase } from '../Types';
import { playSound2D } from '../Audio/AudioManager';
import { LevelGeneratorService } from './LevelGeneratorService';

import { SoundAsset } from 'meta/worlds';

// --- Tuning constants ---
const BLIZZARD_INTERVAL = 5.0;      // seconds between gusts
const VFX_PLAY_DURATION = 3.0;      // seconds the VFX plays per normal gust
const INTENSE_VFX_PLAY_DURATION = 6.0; // seconds the VFX plays during intense burst (whiteout)
const INTENSE_EXTRA_LAYERS = 6;     // additional VFX entities spawned for intense burst (total whiteout)
const SFX_LEAD_TIME = 1.25;         // seconds SFX plays BEFORE the intense VFX burst starts
const GRID_CENTER = new Vec3(0, 0.5, 0); // center of the 11x14 grid, slightly above ground
const FREEZE_DURATION = 6.0; // seconds towers are frozen during intense burst

// SoundAsset for cold wind gust
const WIND_GUST_SOUND = new SoundAsset('@SFX/sfxlib_wnd_coldGust_01.wav:sound');

// Template for the blizzard VFX entity
const BLIZZARD_VFX_TEMPLATE = new TemplateAsset('@Templates/VFX/BlizzardVfx.hstf');

// Offset positions for extra intense VFX layers (spread around grid center for whiteout)
const INTENSE_OFFSETS: Vec3[] = [
  new Vec3(-3.0, 0.5, -2.5),
  new Vec3(3.0, 0.5, 2.5),
  new Vec3(0.0, 1.0, -3.0),
  new Vec3(0.0, 0.3, 3.0),
  new Vec3(-2.0, 0.8, 1.5),
  new Vec3(2.0, 0.2, -1.5),
];

@service()
export class BlizzardService extends Service {
  private _vfxEntity: Entity | null = null;
  private _vfxComponent: VfxComponent | null = null;

  // Extra VFX entities pre-spawned for intense bursts
  private _intenseVfxEntities: Entity[] = [];
  private _intenseVfxComponents: VfxComponent[] = [];

  private _active: boolean = false;
  private _isSnowBiome: boolean = false;
  private _phaseActive: boolean = false;
  private _prewarmed: boolean = false; // true once VFX entities are spawned
  private _timer: number = 0;
  private _vfxPlayTimer: number = 0;
  private _vfxPlaying: boolean = false;
  private _gustCounter: number = 0; // tracks which gust we're on for the intense cycle
  private _intenseCycle: number = 5; // computed at activation time based on run count
  private _currentPlayDuration: number = VFX_PLAY_DURATION; // active duration for current burst
  private _sfxLeadPending: boolean = false; // true when SFX fired, waiting for VFX to start
  private _sfxLeadTimer: number = 0; // countdown until VFX starts after SFX lead

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    // CRITICAL: Only spawn VFX entities when biome is confirmed snow.
    // Spawning on non-snow biomes causes a brief particle flash because the VFX
    // template auto-plays for ~1 frame before stop() takes effect.
    if (!this._isSnowBiome) {
      console.log('[BlizzardService] Skipping prewarm — not snow biome');
      return;
    }
    if (this._prewarmed) {
      console.log('[BlizzardService] Already prewarmed, skipping');
      return;
    }
    this._prewarmed = true;
    console.log('[BlizzardService] Prewarming VFX entities (snow biome confirmed)');

    try {
      // Spawn main VFX entity
      this._vfxEntity = await WorldService.get().spawnTemplate({
        templateAsset: BLIZZARD_VFX_TEMPLATE,
        position: GRID_CENTER,
        rotation: Quaternion.identity,
        scale: new Vec3(1, 1, 1),
        networkMode: NetworkMode.LocalOnly,
      });

      if (this._vfxEntity) {
        this._vfxComponent = this._findVfxComponent(this._vfxEntity);
        if (this._vfxComponent) {
          this._vfxComponent.autoPlay = false;
          this._vfxComponent.stop();
          console.log('[BlizzardService] Main VFX entity ready');
        } else {
          console.warn('[BlizzardService] VFX entity spawned but no VfxComponent found');
        }
      }

      // Spawn extra VFX entities for intense bursts (pre-allocated pool)
      for (let i = 0; i < INTENSE_EXTRA_LAYERS; i++) {
        const pos = INTENSE_OFFSETS[i] ?? GRID_CENTER;
        // Massive scales for overwhelming whiteout (4x-5x)
        const scaleOptions = [4.0, 4.5, 5.0, 4.5, 5.0, 4.0];
        const layerScale = scaleOptions[i % scaleOptions.length];
        const extraEntity = await WorldService.get().spawnTemplate({
          templateAsset: BLIZZARD_VFX_TEMPLATE,
          position: pos,
          rotation: Quaternion.identity,
          scale: new Vec3(layerScale, layerScale, layerScale),
          networkMode: NetworkMode.LocalOnly,
        });

        if (extraEntity) {
          const vfx = this._findVfxComponent(extraEntity);
          if (vfx) {
            vfx.autoPlay = false;
            vfx.stop();
            this._intenseVfxEntities.push(extraEntity);
            this._intenseVfxComponents.push(vfx);
          }
        }
      }
      console.log(`[BlizzardService] ${this._intenseVfxComponents.length} intense VFX layers ready`);
    } catch (e) {
      console.error(`[BlizzardService] Failed to spawn VFX entities: ${String(e)}`);
    }
  }

  // --- Event handlers ---

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(p: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const wasSnow = this._isSnowBiome;
    this._isSnowBiome = p.biomeId === 'snow';
    if (wasSnow !== this._isSnowBiome) {
      console.log(`[BlizzardService] Biome changed to '${p.biomeId}', snow=${this._isSnowBiome}`);
      this._updateActive();
    }
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(p: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const wasActive = this._phaseActive;
    this._phaseActive =
      p.phase === GamePhase.Build ||
      p.phase === GamePhase.Wave ||
      p.phase === GamePhase.WaveClear;
    if (wasActive !== this._phaseActive) {
      console.log(`[BlizzardService] Phase ${p.phase}, gameplay active=${this._phaseActive}`);
      this._updateActive();
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._stopAllVfx();
    this._timer = 0;
    this._gustCounter = 0;
    this._active = false;
    this._phaseActive = false;
    this._isSnowBiome = false;
    this._prewarmed = false;
    this._sfxLeadPending = false;
    this._sfxLeadTimer = 0;
  }

  // --- Update loop ---

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;

    // Handle SFX lead-in: when SFX has fired, count down to VFX start
    if (this._sfxLeadPending) {
      this._sfxLeadTimer -= dt;
      if (this._sfxLeadTimer <= 0) {
        this._sfxLeadPending = false;
        this._startIntenseVfx();
      }
    }

    // Manage VFX play duration (stop after burst)
    if (this._vfxPlaying) {
      this._vfxPlayTimer += dt;
      if (this._vfxPlayTimer >= this._currentPlayDuration) {
        this._stopAllVfx();
      }
    }

    // Trigger blizzard gusts on interval
    if (this._active) {
      this._timer += dt;
      if (this._timer >= BLIZZARD_INTERVAL) {
        this._timer -= BLIZZARD_INTERVAL;
        this._gustCounter++;
        const isIntense = this._gustCounter % this._intenseCycle === 0;
        if (isIntense) {
          this._triggerIntenseGust();
        } else {
          this._triggerGust();
        }
      }
    }
  }

  // --- Private helpers ---

  private _findVfxComponent(entity: Entity): VfxComponent | null {
    let vfx = entity.getComponent(VfxComponent);
    if (!vfx) {
      const children = entity.getChildrenWithComponent(VfxComponent, true);
      if (children.length > 0) {
        vfx = children[0].getComponent(VfxComponent);
      }
    }
    return vfx;
  }

  private _updateActive(): void {
    const shouldBeActive = this._isSnowBiome && this._phaseActive;
    if (shouldBeActive && !this._active) {
      this._active = true;
      this._timer = BLIZZARD_INTERVAL - 1; // first gust arrives ~1s after activation
      this._gustCounter = 0;
      this._intenseCycle = this._computeIntenseCycle();
      console.log(`[BlizzardService] Activated — intense cycle = ${this._intenseCycle} (run ${LevelGeneratorService.get().runCount})`);
      // Lazy prewarm: only spawn VFX entities once snow biome is confirmed active
      if (!this._prewarmed) {
        void this.prewarm();
      }
    } else if (!shouldBeActive && this._active) {
      this._active = false;
      this._timer = 0;
      this._gustCounter = 0;
      this._stopAllVfx();
      this._sfxLeadPending = false;
      console.log('[BlizzardService] Deactivated');
    }
  }

  /**
   * Compute the effective intense-cycle (every Nth gust is intense) based on run count.
   * Scales with progression so later runs get more frequent intense bursts.
   */
  private _computeIntenseCycle(): number {
    const runCount = LevelGeneratorService.get().runCount;
    if (runCount >= 100) return 2;
    if (runCount >= 60) return 3;
    if (runCount >= 30) return 4;
    if (runCount >= 10) return 5;
    return 6; // default for runs 1-9
  }

  private _triggerGust(): void {
    console.log('[BlizzardService] Triggering normal blizzard gust');

    // No SFX for normal gusts — ambient audio is sufficient

    // Play main VFX burst only
    this._currentPlayDuration = VFX_PLAY_DURATION;
    this._playMainVfx();
  }

  private _triggerIntenseGust(): void {
    console.log('[BlizzardService] >>> INTENSE BLIZZARD BURST \u2014 SFX lead-in <<<');

    // Fire SFX immediately (before VFX) to build anticipation
    // Layer 1: Loud primary wind gust
    playSound2D(WIND_GUST_SOUND, { playVolume: 1.0, minMaxPitch: new Vec2(0.7, 0.9) });

    // Layer 2: Second wind layer (higher pitch howl)
    playSound2D(WIND_GUST_SOUND, { playVolume: 0.9, minMaxPitch: new Vec2(1.1, 1.3) });

    // Layer 3: Deep rumble layer (very low pitch)
    playSound2D(WIND_GUST_SOUND, { playVolume: 0.8, minMaxPitch: new Vec2(0.5, 0.65) });

    // Layer 4: Extra howling mid-range for fullness
    playSound2D(WIND_GUST_SOUND, { playVolume: 0.75, minMaxPitch: new Vec2(0.9, 1.05) });

    // Schedule VFX to start after SFX_LEAD_TIME
    this._sfxLeadPending = true;
    this._sfxLeadTimer = SFX_LEAD_TIME;

    // Delay freeze so players see the VFX hit THEN feel the effect
    // VFX starts after SFX_LEAD_TIME; freeze fires 1.5s after that
    const freezeDelay = (SFX_LEAD_TIME + 1.5) * 1000;
    setTimeout(() => {
      // Guard: biome may have changed during the delay
      if (!this._isSnowBiome) {
        console.log('[BlizzardService] Freeze cancelled — no longer snow biome');
        return;
      }
      console.log('[BlizzardService] Emitting BlizzardFreeze active=true (delayed)');
      const freezeOn = new Events.BlizzardFreezePayload();
      freezeOn.active = true;
      EventService.sendLocally(Events.BlizzardFreeze, freezeOn);
    }, freezeDelay);

    // Schedule unfreeze: freeze delay + FREEZE_DURATION so freeze lasts full duration
    setTimeout(() => {
      // Guard: biome may have changed during the delay
      if (!this._isSnowBiome) {
        console.log('[BlizzardService] Unfreeze cancelled — no longer snow biome');
        return;
      }
      console.log('[BlizzardService] Emitting BlizzardFreeze active=false');
      const freezeOff = new Events.BlizzardFreezePayload();
      freezeOff.active = false;
      EventService.sendLocally(Events.BlizzardFreeze, freezeOff);
    }, freezeDelay + FREEZE_DURATION * 1000);
  }

  private _startIntenseVfx(): void {
    console.log('[BlizzardService] >>> INTENSE VFX WHITEOUT starting <<<');

    // Scale up main VFX entity to 3x for the whiteout
    if (this._vfxEntity) {
      const transform = this._vfxEntity.getComponent(TransformComponent);
      if (transform) {
        transform.localScale = new Vec3(3.0, 3.0, 3.0);
      }
    }

    // Play ALL VFX layers (main + intense extras) for extended duration
    this._currentPlayDuration = INTENSE_VFX_PLAY_DURATION;
    this._playMainVfx();
    this._playIntenseVfx();
  }

  private _playMainVfx(): void {
    if (!this._vfxComponent) return;
    this._vfxComponent.play(null);
    this._vfxPlaying = true;
    this._vfxPlayTimer = 0;
  }

  private _playIntenseVfx(): void {
    for (const vfx of this._intenseVfxComponents) {
      vfx.play(null);
    }
  }

  private _stopAllVfx(): void {
    // Stop main VFX and reset scale to normal
    if (this._vfxComponent && this._vfxPlaying) {
      this._vfxComponent.stop();
    }
    if (this._vfxEntity) {
      const transform = this._vfxEntity.getComponent(TransformComponent);
      if (transform) {
        transform.localScale = new Vec3(1, 1, 1);
      }
    }
    // Stop intense extra layers
    for (const vfx of this._intenseVfxComponents) {
      vfx.stop();
    }
    this._vfxPlaying = false;
    this._vfxPlayTimer = 0;
  }
}
