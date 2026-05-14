/**
 * FishDataService — Pure data-driven fish manager.
 *
 * Replaces FishPoolService (slot-based spawning/recycling) and
 * SimpleFishController (per-entity swim AI). Fish are plain data objects
 * (FishInstance) with no entity backing — rendered as sprites by FishSpriteRenderer.
 *
 * Component Attachment: Service (singleton, auto-instantiated)
 * Component Networking: Local (client-side only, no entities spawned)
 * Component Ownership: Not Networked
 */
import {
  NetworkingService,
  OnWorldUpdateEvent,
  Service,
  WorldService,
  service,
  subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

import {
  FISH_LEFT, FISH_RIGHT,
  FISH_PAUSE_DUR_MIN, FISH_PAUSE_DUR_MAX, FISH_BOB_AMP, FISH_BOB_FREQ, FISH_MIN_MOVE_DIST,
  HALF_SCREEN_WORLD_HEIGHT,
  POOL_COUNT_COMMON, POOL_COUNT_RARE, POOL_COUNT_LEGENDARY,
  POOL_SLOT_COUNT, POOL_SLOT_SPREAD, POOL_SLOT_TOLERANCE, POOL_SLOT_DRIFT_MAX,
  POOL_SCALE_VARIANCE, FISH_SIZE_RANGE_COMPRESSION,
  WATER_SURFACE_Y,
  BUBBLE_INTERVAL_MIN, BUBBLE_INTERVAL_MAX,
  BUBBLE_SPAWN_OFFSET_X, BUBBLE_SPAWN_OFFSET_Y,
  HOOK_COLLECT_RADIUS,
} from '../Constants';
import { Events, FishInstance, type IFishDef } from '../Types';
import { FISH_DEFS } from '../FishDefs';
import { BubblePool } from './BubblePool';

// Rarity order for roll priority: commons first, legendaries last.
const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, legendary: 2 };
const DEFS_BY_RARITY = [...FISH_DEFS].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

// Spawn tuning: prevents empty zones during descent
const WAVE_FLOOR = 0.12;            // Minimum effective wave value — prevents complete dead zones
const FALLBACK_SPAWN_CHANCE = 0.35;  // Chance to force-spawn when all normal rolls fail

let _nextFishId = 1;

// =============================================================================
@service()
export class FishDataService extends Service {

  // All fish instances (active + benched)
  private _allFish: FishInstance[] = [];

  // Per-defId bench queues (inactive fish available for reuse)
  private _bench = new Map<number, FishInstance[]>();

  // Set of fishIds currently benched — prevents double-entries
  private _benchedIds = new Set<number>();

  // Camera center Y (set by GameCameraService each frame)
  private _camCenterY = 0;

  // fishId assigned to each slot (0 = vacant)
  private _slotFishId = new Array<number>(POOL_SLOT_COUNT).fill(0);

  // ── Init ───────────────────────────────────────────────────────────────────

  @subscribe(Events.GameStarted)
  onReady(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[FishDataService] Creating fish pool data objects');
    this._createPool();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Called by GameCameraService each frame. */
  setCameraY(centerY: number): void {
    this._camCenterY = centerY;
  }

  /** Get a fish instance by ID. */
  getInstance(fishId: number): FishInstance | undefined {
    return this._allFish.find(f => f.fishId === fishId);
  }

  /** Iterate all active (non-benched) fish. */
  *allActive(): IterableIterator<FishInstance> {
    for (const f of this._allFish) {
      if (f.active || f.isHooked || f.isFlying) yield f;
    }
  }

  /** Return a fish to the bench after launch collection. */
  returnToBench(fish: FishInstance): void {
    this._benchFish(fish);
  }

  /**
   * Find all free fish within collision range of the hook.
   */
  findHits(hx: number, hy: number): FishInstance[] {
    const hits: FishInstance[] = [];
    for (const fish of this._allFish) {
      if (!fish.active) continue;
      if (fish.isHooked || fish.isFlying) continue;
      const dx = hx - fish.worldX;
      const dy = hy - fish.worldY;
      if (Math.sqrt(dx * dx + dy * dy) < HOOK_COLLECT_RADIUS * fish.size) {
        hits.push(fish);
      }
    }
    return hits;
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = p.deltaTime;
    if (dt <= 0) return;

    // Tick swim AI and flying physics for all active fish
    this._tickFishAI(dt);

    // Run slot-based spawn/recycle logic
    this._tickSlots();
  }

  // ── Private: Pool creation ─────────────────────────────────────────────────

  private _createPool(): void {
    for (const def of FISH_DEFS) {
      const count = def.rarity === 'legendary' ? POOL_COUNT_LEGENDARY
                  : def.rarity === 'rare'      ? POOL_COUNT_RARE
                  :                              POOL_COUNT_COMMON;

      if (!this._bench.has(def.id)) this._bench.set(def.id, []);

      for (let i = 0; i < count; i++) {
        const fish = new FishInstance(_nextFishId++, def.id);
        fish.active = false;
        fish.bubbleTimer = Math.random() * BUBBLE_INTERVAL_MAX * 2;
        this._allFish.push(fish);
        this._bench.get(def.id)!.push(fish);
        this._benchedIds.add(fish.fishId);
      }
    }
    console.log(`[FishDataService] Pool created: ${this._allFish.length} fish`);
  }

  // ── Private: Swim AI ───────────────────────────────────────────────────────

  private _tickFishAI(dt: number): void {
    const t = WorldService.get().getWorldTime();

    for (const fish of this._allFish) {
      if (fish.isFlying) {
        this._tickFlying(fish, dt);
        continue;
      }
      if (fish.isHooked) continue; // position driven by HookController
      if (!fish.active) continue;

      // Movement AI
      this._tickMovement(fish, dt);

      // Bob
      fish.worldY = fish.baseY + Math.sin(t * FISH_BOB_FREQ + fish.size * 10) * FISH_BOB_AMP;

      // Bubbles
      this._tickBubble(fish, dt);
    }
  }

  private _tickFlying(fish: FishInstance, dt: number): void {
    fish.flyVY += fish.flyGravity * dt;
    fish.worldX += fish.flyVX * dt;
    fish.worldY += fish.flyVY * dt;
  }

  private _tickMovement(fish: FishInstance, dt: number): void {
    if (fish.pausing) {
      fish.pauseDur -= dt;
      if (fish.pauseDur <= 0) {
        fish.pausing = false;
        fish.targetX = this._randomTargetX(fish.worldX);
      }
      return;
    }
    const dx = fish.targetX - fish.worldX;
    if (Math.abs(dx) < 0.05) {
      fish.pausing = true;
      fish.pauseDur = FISH_PAUSE_DUR_MIN + Math.random() * (FISH_PAUSE_DUR_MAX - FISH_PAUSE_DUR_MIN);
      return;
    }
    const dir = Math.sign(dx);
    if (dir > 0 && fish.facingLeft) fish.facingLeft = false;
    if (dir < 0 && !fish.facingLeft) fish.facingLeft = true;
    fish.worldX += dir * fish.moveSpeed * dt;
  }

  private _tickBubble(fish: FishInstance, dt: number): void {
    fish.bubbleTimer -= dt;
    if (fish.bubbleTimer > 0) return;
    fish.bubbleTimer = BUBBLE_INTERVAL_MIN + Math.random() * (BUBBLE_INTERVAL_MAX - BUBBLE_INTERVAL_MIN);
    const offsetX = fish.facingLeft ? -BUBBLE_SPAWN_OFFSET_X : BUBBLE_SPAWN_OFFSET_X;
    BubblePool.get().acquire(fish.worldX + offsetX, fish.worldY + BUBBLE_SPAWN_OFFSET_Y);
  }

  // ── Private: Slot management ───────────────────────────────────────────────

  private _tickSlots(): void {
    // Buffer zone is centered on the camera (NOT clamped to water surface).
    // The previous code clamped bufferTop/camTop to WATER_SURFACE_Y, which at deep
    // camera positions made bufferTop ≈ surface (~4.5) while bufferBottom was
    // hundreds of metres down — slotStep blew up and most slots fell in dead zones.
    // Underwater clamp is still applied below for spawn eligibility.
    const camTopRaw    = this._camCenterY + HALF_SCREEN_WORLD_HEIGHT;
    const camBottomRaw = this._camCenterY - HALF_SCREEN_WORLD_HEIGHT;
    const bufferTop    = camTopRaw + POOL_SLOT_SPREAD;
    const bufferBottom = camBottomRaw - POOL_SLOT_SPREAD;
    // For "off-screen above" tests we still want to ensure we never count
    // out-of-water region as visible — but we no longer use it to clip the buffer.
    const camTop       = Math.min(camTopRaw, WATER_SURFACE_Y);
    const camBottom    = camBottomRaw;

    // Step 1 — recycle free fish outside the full buffer zone.
    for (const fish of this._allFish) {
      if (!fish.active) continue;
      if (fish.isHooked || fish.isFlying) continue;
      if (this._benchedIds.has(fish.fishId)) continue;
      if (fish.worldY > bufferTop || fish.worldY < bufferBottom) {
        const idx = this._slotFishId.indexOf(fish.fishId);
        if (idx !== -1) this._slotFishId[idx] = 0;
        this._benchFish(fish);
      }
    }

    // Step 2 — fill vacant slots.
    const totalRange = bufferTop - bufferBottom;
    if (totalRange <= 0) return;
    const slotStep = totalRange / POOL_SLOT_COUNT;

    for (let i = 0; i < POOL_SLOT_COUNT; i++) {
      const slotY = bufferBottom + i * slotStep + slotStep * 0.5;

      // Validate current assignment.
      // A slot is "still occupied" only if its fish:
      //   - is hooked or flying (special states), OR
      //   - is still active AND within the global buffer AND has NOT drifted
      //     too far from this slot's nominal Y position.
      // The drift check is critical at depth: without it, a fish spawned just
      // below the camera holds its slot for ~7 seconds while it drifts up
      // toward bufferTop, starving spawns.
      const assignedId = this._slotFishId[i];
      if (assignedId !== 0) {
        const inst = this._allFish.find(f => f.fishId === assignedId);
        const stillOccupied = inst && (
          inst.isHooked || inst.isFlying ||
          (inst.active
            && inst.worldY >= bufferBottom
            && inst.worldY <= bufferTop
            && Math.abs(inst.worldY - slotY) < POOL_SLOT_DRIFT_MAX)
        );
        if (stillOccupied) continue;
        this._slotFishId[i] = 0;
      }

      // Never spawn above water
      if (slotY >= WATER_SURFACE_Y) continue;

      // Only spawn off-screen
      const offscreenAbove = slotY > camTop && slotY <= bufferTop;
      const offscreenBelow = slotY < camBottom && slotY >= bufferBottom;
      if (!offscreenAbove && !offscreenBelow) continue;

      // Avoid stacking
      if (this._hasNeighborWithin(slotY, POOL_SLOT_TOLERANCE)) continue;

      const depth = WATER_SURFACE_Y - slotY;
      const def = this._rollDef(depth);
      if (!def) continue;

      const bench = this._bench.get(def.id);
      if (!bench || bench.length === 0) continue;

      const fish = bench.pop()!;
      this._benchedIds.delete(fish.fishId);
      const spawnX = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT);
      const mean = (def.sizeMin + def.sizeMax) * 0.5;
      const lo   = mean + (def.sizeMin - mean) * FISH_SIZE_RANGE_COMPRESSION;
      const hi   = mean + (def.sizeMax - mean) * FISH_SIZE_RANGE_COMPRESSION;
      const base = lo + Math.random() * (hi - lo);
      const size = base * (1 - POOL_SCALE_VARIANCE + Math.random() * POOL_SCALE_VARIANCE * 2);
      fish.activate(spawnX, slotY, def.speedMin, def.speedMax, size);
      this._slotFishId[i] = fish.fishId;
    }
  }

  private _benchFish(fish: FishInstance): void {
    if (this._benchedIds.has(fish.fishId)) return;
    fish.bench();
    const list = this._bench.get(fish.defId);
    if (list) { list.push(fish); this._benchedIds.add(fish.fishId); }
  }

  private _hasNeighborWithin(slotY: number, radius: number): boolean {
    for (const fish of this._allFish) {
      if (!fish.active) continue;
      if (fish.isHooked || fish.isFlying) continue;
      if (this._benchedIds.has(fish.fishId)) continue;
      if (Math.abs(fish.worldY - slotY) < radius) return true;
    }
    return false;
  }

  /**
   * Roll defs in rarity order with two-pass approach to eliminate empty zones.
   * Pass 1: Normal wave-modulated spawn (commons first).
   * Pass 2: Fallback guaranteed spawn from eligible pool if pass 1 fails.
   * Wave formula: sin(depth/wave1Period + wave1Offset) × sin(depth/wave2Period + wave2Offset)
   */
  private _rollDef(depth: number): IFishDef | null {
    // --- Pass 1: Normal wave-modulated spawn ---
    const eligible: IFishDef[] = [];
    for (const def of DEFS_BY_RARITY) {
      const minDepthThreshold = def.depthMin !== undefined ? (WATER_SURFACE_Y - def.depthMin) : 0;
      if (depth < minDepthThreshold) continue;

      const bench = this._bench.get(def.id);
      if (!bench || bench.length === 0) continue;

      eligible.push(def);

      const wave = Math.sin(depth / def.wave1Period + def.wave1Offset)
                 * Math.sin(depth / def.wave2Period + def.wave2Offset);
      const effectiveWave = Math.max(wave, WAVE_FLOOR);

      if (Math.random() < def.spawnChance * effectiveWave) return def;
    }

    // --- Pass 2: Fallback guaranteed spawn from eligible pool ---
    if (eligible.length > 0 && Math.random() < FALLBACK_SPAWN_CHANCE) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      const bench = this._bench.get(pick.id);
      if (bench && bench.length > 0) return pick;
    }

    return null;
  }

  private _randomTargetX(from: number): number {
    let t: number;
    do { t = FISH_LEFT + Math.random() * (FISH_RIGHT - FISH_LEFT); }
    while (Math.abs(t - from) < FISH_MIN_MOVE_DIST);
    return t;
  }
}
