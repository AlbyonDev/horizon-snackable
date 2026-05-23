/**
 * CrystalShardController
 *
 * Component Attachment: Scene Entity (same entity as TapZoneController, with CustomUiComponent)
 * Component Networking: Local (client-side UI only)
 * Component Ownership: Not Networked
 *
 * Spawns crystal shard particles on every PlayerTap event and simulates
 * them with per-frame physics (velocity, gravity, rotation, lifetime fade).
 * Updates the TapZoneViewModel.shards array each frame.
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
  TextureAsset,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from './Types';
import { CrystalShardViewModel } from './CrystalShardViewModel';
import { currencyIcon } from './Assets';
import type { TapZoneViewModel } from './TapZoneViewModel';

// --- Constants ---
const SHARDS_PER_TAP_MIN = 2;
const SHARDS_PER_TAP_MAX = 3;
const SHARD_UPWARD_SPEED_MIN = 250;   // px/s upward (will be negated for Y-down coords)
const SHARD_UPWARD_SPEED_MAX = 550;   // px/s upward
const SHARD_HORIZONTAL_SPREAD = 150;  // px/s max horizontal deviation
const SHARD_GRAVITY = 600;    // px/s² downward (positive = down in screen coords)
const SHARD_LIFETIME = 1.5;   // seconds (allows time for fall + bounce + fade)
const SHARD_INITIAL_SCALE_MIN = 0.4;
const SHARD_INITIAL_SCALE_MAX = 0.85;
const SHARD_ROTATION_SPEED_MIN = -540; // deg/s
const SHARD_ROTATION_SPEED_MAX = 540;  // deg/s
const FLOOR_Y = 57;           // pixels below spawn point where shards "land" (shard center visible above gem bottom)
const BOUNCE_DAMPING = 0.35;  // velocity retention on bounce (multiplier)
const FADE_DURATION = 0.3;    // seconds to fade out after bounce
const SHARD_SPAWN_OFFSET_X = 20; // pixels max horizontal spawn offset
const SHARD_SPAWN_OFFSET_Y = 10; // pixels max vertical spawn offset

const SHARD_TEXTURE: TextureAsset = currencyIcon;

/** Internal particle state (not exposed to XAML directly). */
interface ShardParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  lifetime: number;
  maxLifetime: number;
  icon: TextureAsset;
  hasBounced: boolean;
  fadeTimer: number;
}

@component()
export class CrystalShardController extends Component {
  private viewModel: Maybe<TapZoneViewModel> = null;
  private particles: ShardParticle[] = [];
  private lastTime: number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  /**
   * Lazy getter for the TapZoneViewModel. Reads from CustomUiComponent.dataContext
   * and caches once found. This eliminates the race condition where CrystalShardController
   * starts before TapZoneController has set dataContext.
   */
  private getViewModel(): Maybe<TapZoneViewModel> {
    if (this.viewModel) return this.viewModel;

    const uiComponent = this.entity.getComponent(CustomUiComponent);
    if (uiComponent && uiComponent.dataContext) {
      this.viewModel = uiComponent.dataContext as TapZoneViewModel;
    }
    return this.viewModel;
  }

  @subscribe(Events.PlayerTap, { execution: ExecuteOn.Everywhere })
  onPlayerTap(payload: Events.PlayerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.getViewModel()) return;

    // Auto-pickaxe taps spawn exactly 1 shard; manual taps spawn 2-3
    const count = payload.isAuto
      ? 1
      : SHARDS_PER_TAP_MIN + Math.floor(Math.random() * (SHARDS_PER_TAP_MAX - SHARDS_PER_TAP_MIN + 1));

    for (let i = 0; i < count; i++) {
      // Upward burst: strong negative vy (up in screen coords) with horizontal spread
      const vx = (Math.random() * 2 - 1) * SHARD_HORIZONTAL_SPREAD;
      const vy = -(SHARD_UPWARD_SPEED_MIN + Math.random() * (SHARD_UPWARD_SPEED_MAX - SHARD_UPWARD_SPEED_MIN));
      const scale = SHARD_INITIAL_SCALE_MIN + Math.random() * (SHARD_INITIAL_SCALE_MAX - SHARD_INITIAL_SCALE_MIN);
      const rotationSpeed = SHARD_ROTATION_SPEED_MIN + Math.random() * (SHARD_ROTATION_SPEED_MAX - SHARD_ROTATION_SPEED_MIN);
      const icon = SHARD_TEXTURE;

      this.particles.push({
        x: (Math.random() * 2 - 1) * SHARD_SPAWN_OFFSET_X,
        y: (Math.random() * 2 - 1) * SHARD_SPAWN_OFFSET_Y,
        vx,
        vy,
        rotation: Math.random() * 360,
        rotationSpeed,
        scale,
        lifetime: SHARD_LIFETIME,
        maxLifetime: SHARD_LIFETIME,
        icon,
        hasBounced: false,
        fadeTimer: FADE_DURATION,
      });
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const vm = this.getViewModel();
    if (!vm) return;
    if (this.particles.length === 0) {
      // Only clear the VM array if it has entries
      if (vm.shards.length > 0) {
        vm.shards = [];
      }
      return;
    }

    // Compute delta time
    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    // Update particles (iterate backwards for safe removal)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (!p.hasBounced) {
        // Pre-bounce: normal physics
        p.x += p.vx * dt;
        p.vy += SHARD_GRAVITY * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        // Floor collision check
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = -Math.abs(p.vy) * BOUNCE_DAMPING; // reverse with damping
          p.vx *= BOUNCE_DAMPING;
          p.hasBounced = true;
          p.fadeTimer = FADE_DURATION;
        }
      } else {
        // Post-bounce: continue physics briefly and fade out
        p.x += p.vx * dt;
        p.vy += SHARD_GRAVITY * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * 0.3 * dt; // slow rotation after bounce

        // Keep on floor if falls back
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.vx *= 0.9;
        }

        p.fadeTimer -= dt;
        if (p.fadeTimer <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    // Build ViewModel array (reassign to trigger binding update)
    const shards: CrystalShardViewModel[] = [];
    for (const p of this.particles) {
      let opacity: number;
      let scaleFade: number;

      if (!p.hasBounced) {
        // Before bounce: fully opaque, no shrink
        opacity = 1.0;
        scaleFade = p.scale;
      } else {
        // After bounce: fade from 1 → 0 over FADE_DURATION
        const fadeProgress = 1 - (p.fadeTimer / FADE_DURATION);
        opacity = 1 - fadeProgress;
        scaleFade = p.scale * (1 - fadeProgress * 0.3); // slight shrink during fade
      }

      const shard = new CrystalShardViewModel();
      shard.positionX = p.x;
      shard.positionY = p.y;
      shard.rotation = p.rotation;
      shard.scale = scaleFade;
      shard.opacity = opacity;
      shard.icon = p.icon;
      shards.push(shard);
    }
    vm.shards = shards;
  }
}
