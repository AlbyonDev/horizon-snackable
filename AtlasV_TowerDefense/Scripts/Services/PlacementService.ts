/**
 * PlacementService — Drag-to-place touch input handler for tower placement.
 *
 * prewarm(): pre-spawns a range indicator entity + blue cell marker pool.
 * Touch events (Started/Moved/Ended) convert screen coords to grid cells.
 * Preview entity snaps to nearest cell: green tint = valid, red = invalid.
 * Range indicator disc scales to tower range diameter around preview.
 * On touch end over a valid cell: sends GridTapped → TowerService._tryPlace().
 * Valid cell = not a path cell, not already occupied, affordable.
 *
 * Placement mode exits when:
 *   - A tower is successfully placed (TowerPlaced event)
 *   - Player taps an invalid area without placing
 *   - Player taps an occupied cell (exits mode, then opens upgrade menu)
 *   - TowerDeselected event fires
 *
 * Blue cell markers pulse with a staggered bounce animation while active.
 */
import { Service, WorldService, NetworkMode, Vec3, EventService, TransformComponent, ColorComponent, Color, OnWorldUpdateEvent } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnFocusedInteractionInputStartedEvent, OnFocusedInteractionInputMovedEvent, OnFocusedInteractionInputEndedEvent } from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload, OnWorldUpdateEventPayload, Entity } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Events } from '../Types';
import { Assets } from '../Assets';
import { GRID_ORIGIN_X, GRID_ORIGIN_Z, CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS, GROUND_Y, PROJECTILE_POOL_Y } from '../Constants';
import { TowerService } from './TowerService';
import { PathService } from './PathService';
import { ResourceService } from './ResourceService';

const TINT_VALID        = new Color(0.4, 1.0, 0.4, 1.0);
const TINT_INVALID      = new Color(1.0, 0.3, 0.3, 1.0);
const RANGE_COLOR_VALID   = new Color(0.3, 1.0, 0.3, 0.7);
const RANGE_COLOR_INVALID = new Color(1.0, 0.25, 0.25, 0.7);
const RANGE_COLOR_SELECT  = new Color(1.0, 0.85, 0.2, 0.6);
const RANGE_PARK    = new Vec3(0, PROJECTILE_POOL_Y, 0);

// Blue cell marker constants
const CELL_MARKER_COLOR   = new Color(0.3, 0.6, 1.0, 0.55);
const CELL_MARKER_SCALE   = new Vec3(CELL_WIDTH * 0.85, 0.04, CELL_HEIGHT * 0.85);
const CELL_MARKER_POOL_SIZE = 110; // max valid cells expected on grid (9×14 minus path)

// Bounce animation constants
const BOUNCE_SPEED = 3.0;        // radians per second
const BOUNCE_AMPLITUDE = 0.1;    // 10% scale oscillation (1.0 → 1.1 → 1.0)
const BOUNCE_PHASE_OFFSET = 0.4; // radians of stagger between successive markers

@service()
export class PlacementService extends Service {

  // ── Mode flags ─────────────────────────────────────────────
  private _placementActive: boolean = false;
  private _selectionActive: boolean = false;
  /** True when a tower was selected from the shop (placement intent active). */
  private _shopSelectionActive: boolean = false;

  // ── Shared range indicator (permanent, parked when inactive) ─────────────────
  private _rangeEntity: Entity | null = null;

  // ── Blue cell marker pool (shows valid placement cells) ──────────────────────
  private _cellMarkerPool: Entity[] = [];
  private _cellMarkersActive: number = 0; // how many pool slots are currently positioned on the grid
  private _bounceTime: number = 0; // elapsed time for bounce animation
  private _poolReady: boolean = false; // true once all markers are spawned
  private _pendingShowMarkers: boolean = false; // deferred show if pool wasn't ready

  // ── Placement-specific state ─────────────────────────────────────────────────
  private _previewEntity: Entity | null = null;
  private _previewOriginalColors: Map<ColorComponent, Color> = new Map();
  private _defId: string = '';
  private _col: number = 0;
  private _row: number = 0;
  private _valid: boolean = false;

  // ── Init ───────────────────────────────────────────────────────────────────────

  async prewarm(): Promise<void> {
    // Spawn range indicator
    const range = await WorldService.get().spawnTemplate({
      templateAsset: Assets.RangeIndicator,
      position: RANGE_PARK,
      scale: Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    this._rangeEntity = range;

    // Pre-spawn blue cell marker pool (flat cubes, parked off-screen)
    for (let i = 0; i < CELL_MARKER_POOL_SIZE; i++) {
      const marker = await WorldService.get().spawnTemplate({
        templateAsset: Assets.Particles, // Cube template
        position: RANGE_PARK,
        scale: CELL_MARKER_SCALE,
        networkMode: NetworkMode.LocalOnly,
      }).catch(() => null);
      if (marker) {
        // Set blue color on the marker
        const colorComp = marker.getComponent(ColorComponent);
        if (colorComp) colorComp.color = CELL_MARKER_COLOR;
        this._cellMarkerPool.push(marker);
      }
    }
    console.log(`[PlacementService] Cell marker pool spawned: ${this._cellMarkerPool.length}`);
    this._poolReady = true;

    // If _showCellMarkers was called while pool was still spawning, execute now
    if (this._pendingShowMarkers) {
      this._pendingShowMarkers = false;
      this._showCellMarkers();
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._previewEntity?.destroy();
    this._previewEntity = null;
    this._previewOriginalColors.clear();
    this._placementActive = false;
    this._selectionActive = false;
    this._shopSelectionActive = false;
    this._parkRange();
    this._hideCellMarkers();
  }

  // ── Shop tower selected → show blue cell markers on ALL valid cells ───────────

  @subscribe(Events.TowerShopSelected)
  onShopTowerSelected(_p: Events.TowerShopSelectedPayload): void {
    // If upgrade menu was open, close it first.
    if (this._selectionActive) {
      this._exitSelection();
    }

    // If already in placement mode with markers showing, just update the
    // selected tower type (no grid flicker). Otherwise enter placement mode.
    if (this._shopSelectionActive && this._cellMarkersActive > 0) {
      // Grid already visible — tower type switch handled by TowerService
      console.log('[PlacementService] Tower type switched — grid stays visible');
      return;
    }

    this._shopSelectionActive = true;
    this._showCellMarkers();
  }

  @subscribe(Events.TowerDeselected)
  onTowerDeselectedPlacement(_p: Events.TowerDeselectedPayload): void {
    if (this._selectionActive) {
      this._selectionActive = false;
      this._parkRange();
    }
    // Hide cell markers if shop mode was active.
    if (this._shopSelectionActive) this._hideCellMarkers();
    this._shopSelectionActive = false;
  }

  @subscribe(Events.TowerPlaced)
  onTowerPlacedPlacement(_p: Events.TowerPlacedPayload): void {
    // After a tower is successfully placed, exit placement mode and hide markers.
    if (this._shopSelectionActive) {
      this._shopSelectionActive = false;
      this._hideCellMarkers();
      console.log('[PlacementService] Tower placed — exiting placement mode');
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent, { execution: ExecuteOn.Owner })
  onInputStarted(p: OnFocusedInteractionInputEventPayload): void {
    const pos = this._rayToGround(p);
    if (!pos) return;

    const { col, row } = this._worldToCell(pos.x, pos.z);

    if (TowerService.get().isOccupied(col, row)) {
      // If we have a shop tower selected (placement intent), exit placement mode
      // first, then fall through to open the upgrade menu for the tapped tower.
      if (this._shopSelectionActive) {
        this._shopSelectionActive = false;
        this._hideCellMarkers();
        console.log('[PlacementService] Occupied cell tapped while in placement mode — exiting mode, opening upgrade menu');
      }
      this._enterSelection(col, row);
    } else {
      if (this._selectionActive) {
        this._exitSelection();
        return; // touch intent was deselect — do not start placement
      }
      if (!this._placementActive) this._enterPlacement(col, row, pos);
    }
  }

  @subscribe(OnFocusedInteractionInputMovedEvent, { execution: ExecuteOn.Owner })
  onInputMoved(p: OnFocusedInteractionInputEventPayload): void {
    if (!this._placementActive) return;
    const pos = this._rayToGround(p);
    if (!pos) return;
    const { col, row } = this._worldToCell(pos.x, pos.z);
    this._col = col;
    this._row = row;
    this._updatePreview(pos.x, pos.z);
  }

  @subscribe(OnFocusedInteractionInputEndedEvent, { execution: ExecuteOn.Owner })
  onInputEnded(_p: OnFocusedInteractionInputEventPayload): void {
    if (!this._placementActive) {
      // Grid stays visible — do NOT hide markers on finger release.
      // The grid persists until a tower is placed or an occupied cell is tapped.
      return;
    }
    this._placementActive = false;

    if (this._valid) {
      const tap = new Events.GridTappedPayload();
      tap.col = this._col;
      tap.row = this._row;
      EventService.sendLocally(Events.GridTapped, tap);
    }
    // If invalid, grid stays visible — player can tap another cell.

    this._destroyPreview();
  }

  // ── React to tower events to keep range indicator in sync ──────────────────────

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(p: Events.TowerUpgradedPayload): void {
    // Range indicator intentionally not shown in upgrade mode
  }

  @subscribe(Events.TowerSold)
  onTowerSold(_p: Events.TowerSoldPayload): void {
    if (this._selectionActive) this._exitSelection();
  }

  // ── Selection ──────────────────────────────────────────────────────────────────

  private _enterSelection(col: number, row: number): void {
    this._selectionActive = true;
    // Range indicator intentionally not shown in upgrade mode

    const rec = TowerService.get().getAt(col, row);
    if (!rec) return;

    const p = new Events.TowerSelectedPayload();
    p.col     = col;
    p.row     = row;
    p.defId   = rec.defId;
    p.tier    = rec.tier;
    p.choices = [...rec.choices];
    EventService.sendLocally(Events.TowerSelected, p);
  }

  private _exitSelection(): void {
    this._selectionActive = false;
    this._parkRange();
    EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
  }

  private _showRangeForSelected(col: number, row: number): void {
    if (!this._rangeEntity) return;
    const rec = TowerService.get().getAt(col, row);
    if (!rec) return;
    const def = TowerService.get().find(rec.defId);
    if (!def) return;

    const stats = TowerService.get().getEffectiveStats(col, row);
    const range = stats ? stats.range : def.stats.range;
    const diameter = range * 2;

    const pos = PathService.get().cellToWorld(col, row);
    const t = this._rangeEntity.getComponent(TransformComponent);
    if (t) {
      t.worldPosition = new Vec3(pos.x, GROUND_Y + 0.05, pos.z);
      t.localScale    = new Vec3(diameter, 1, diameter);
    }
    const c = this._rangeEntity.getComponent(ColorComponent);
    if (c) c.color = RANGE_COLOR_SELECT;
  }

  private _parkRange(): void {
    if (!this._rangeEntity) return;
    const t = this._rangeEntity.getComponent(TransformComponent);
    if (t) t.worldPosition = RANGE_PARK;
  }

  // ── Cell Markers (blue grid overlay) ───────────────────────────────────────────

  /** Position pool markers on all valid (non-path, unoccupied) cells. */
  private _showCellMarkers(): void {
    // Guard: if pool hasn't finished spawning, defer until prewarm completes
    if (!this._poolReady) {
      this._pendingShowMarkers = true;
      console.log('[PlacementService] Pool not ready yet — deferring _showCellMarkers');
      return;
    }

    let idx = 0;
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (PathService.get().isPathCell(col, row)) continue;
        if (TowerService.get().isOccupied(col, row)) continue;
        if (idx >= this._cellMarkerPool.length) break;

        const marker = this._cellMarkerPool[idx];
        const worldPos = PathService.get().cellToWorld(col, row);
        const t = marker.getComponent(TransformComponent);
        if (t) {
          t.worldPosition = new Vec3(worldPos.x, GROUND_Y + 0.02, worldPos.z);
        }
        idx++;
      }
    }
    this._cellMarkersActive = idx;

    // Park any remaining unused markers off-screen
    for (let i = idx; i < this._cellMarkerPool.length; i++) {
      const t = this._cellMarkerPool[i].getComponent(TransformComponent);
      if (t) t.worldPosition = RANGE_PARK;
    }
  }

  /** Park all cell markers off-screen. */
  private _hideCellMarkers(): void {
    this._pendingShowMarkers = false; // cancel any deferred show
    for (let i = 0; i < this._cellMarkerPool.length; i++) {
      const t = this._cellMarkerPool[i].getComponent(TransformComponent);
      if (t) {
        t.worldPosition = RANGE_PARK;
        t.localScale = CELL_MARKER_SCALE; // reset scale when hiding
      }
    }
    this._cellMarkersActive = 0;
    this._bounceTime = 0;
  }

  // ── Bounce animation (staggered scale pulse on active markers) ─────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onCellMarkerBounce(payload: OnWorldUpdateEventPayload): void {
    if (this._cellMarkersActive === 0) return;

    this._bounceTime += payload.deltaTime;

    for (let i = 0; i < this._cellMarkersActive; i++) {
      const marker = this._cellMarkerPool[i];
      const t = marker.getComponent(TransformComponent);
      if (!t) continue;

      // Staggered sine wave: each marker has a different phase
      const phase = this._bounceTime * BOUNCE_SPEED + i * BOUNCE_PHASE_OFFSET;
      const scaleFactor = 1.0 + BOUNCE_AMPLITUDE * Math.sin(phase);

      t.localScale = new Vec3(
        CELL_MARKER_SCALE.x * scaleFactor,
        CELL_MARKER_SCALE.y,
        CELL_MARKER_SCALE.z * scaleFactor,
      );
    }
  }

  // ── Placement ──────────────────────────────────────────────────────────────────

  private _enterPlacement(col: number, row: number, pos: { x: number; z: number }): void {
    // Guard: don't enter placement if no tower is selected in the shop
    const shopId = TowerService.get().selectedShopId;
    if (!shopId) return;

    this._placementActive = true;
    this._defId = shopId;
    this._col = col;
    this._row = row;
    void this._spawnPreview(pos.x, pos.z);
  }

  private async _spawnPreview(worldX: number, worldZ: number): Promise<void> {
    const def = TowerService.get().find(this._defId);
    if (!def) { this._placementActive = false; return; }

    const pos = new Vec3(worldX, GROUND_Y + 0.2, worldZ);

    const preview = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position: pos,
      scale: new Vec3(CELL_WIDTH, CELL_WIDTH, CELL_WIDTH),
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    if (!preview) { this._placementActive = false; return; }
    if (!this._placementActive) { preview.destroy(); return; }
    this._previewEntity?.destroy(); // destroy any entity from a concurrent spawn
    this._previewEntity = preview;
    this._previewOriginalColors.clear();
    this._collectColors(preview, this._previewOriginalColors);

    // Scale the shared range entity to match this tower's range
    if (this._rangeEntity) {
      const diameter = def.stats.range * 2;
      const t = this._rangeEntity.getComponent(TransformComponent);
      if (t) t.localScale = new Vec3(diameter, 1, diameter);
    }

    // Snap to current cell (finger may have moved during async spawn)
    const snapPos = PathService.get().cellToWorld(
      Math.max(0, Math.min(GRID_COLS - 1, this._col)),
      Math.max(0, Math.min(GRID_ROWS - 1, this._row)),
    );
    this._updatePreview(snapPos.x, snapPos.z);
  }

  private _updatePreview(worldX: number, worldZ: number): void {
    const def = TowerService.get().find(this._defId);
    if (!def) return;

    const inBounds = this._inBounds(this._col, this._row);
    this._valid = inBounds
      && this._canPlaceAt(this._col, this._row)
      && !TowerService.get().isOccupied(this._col, this._row)
      && ResourceService.get().canAfford(def.cost);

    const snapPos = inBounds
      ? PathService.get().cellToWorld(this._col, this._row)
      : new Vec3(worldX, GROUND_Y, worldZ);

    if (this._previewEntity) {
      const t = this._previewEntity.getComponent(TransformComponent);
      if (t) t.worldPosition = snapPos;
      const tint = this._valid ? TINT_VALID : TINT_INVALID;
      for (const [c, orig] of this._previewOriginalColors) {
        const L = orig.r * 0.2126 + orig.g * 0.7152 + orig.b * 0.0722;
        c.color = new Color(tint.r * L, tint.g * L, tint.b * L, orig.a);
      }
    }

    if (this._rangeEntity) {
      const t = this._rangeEntity.getComponent(TransformComponent);
      if (t) t.worldPosition = new Vec3(snapPos.x, GROUND_Y + 0.02, snapPos.z);
      const c = this._rangeEntity.getComponent(ColorComponent);
      if (c) c.color = this._valid ? RANGE_COLOR_VALID : RANGE_COLOR_INVALID;
    }
  }

  private _collectColors(entity: Entity, out: Map<ColorComponent, Color>): void {
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) out.set(c, new Color(c.color.r, c.color.g, c.color.b, c.color.a));
      this._collectColors(child, out);
    }
  }

  private _destroyPreview(): void {
    this._previewEntity?.destroy();
    this._previewEntity = null;
    this._previewOriginalColors.clear();
    this._parkRange();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────

  private _rayToGround(p: OnFocusedInteractionInputEventPayload): { x: number; z: number } | null {
    const o = p.worldRayOrigin;
    const d = p.worldRayDirection;
    if (Math.abs(d.y) < 0.0001) return null;
    const t = (GROUND_Y - o.y) / d.y;
    if (t < 0) return null;
    return { x: o.x + t * d.x, z: o.z + t * d.z };
  }

  private _worldToCell(worldX: number, worldZ: number): { col: number; row: number } {
    return {
      col: Math.round((worldZ - GRID_ORIGIN_Z) / CELL_HEIGHT),
      row: GRID_ROWS - 1 - Math.round((worldX - GRID_ORIGIN_X) / CELL_WIDTH),
    };
  }

  private _canPlaceAt(col: number, row: number): boolean {
    return !PathService.get().isPathCell(col, row);
  }

  private _inBounds(col: number, row: number): boolean {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }
}
