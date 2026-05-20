/**
 * PlacementService — Drag-to-place touch input handler for tower placement.
 *
 * prewarm(): pre-spawns a range indicator entity.
 * Touch events (Started/Moved/Ended) convert screen coords to grid cells.
 * Preview entity snaps to nearest cell: green tint = valid, red = invalid.
 * Range indicator disc scales to tower range diameter around preview.
 * On touch end over a valid cell: sends GridTapped → TowerService._tryPlace().
 * Valid cell = not a path cell, not already occupied, affordable.
 * Deactivated when TowerDeselected or tower is placed.
 */
import { Service, WorldService, NetworkMode, Vec3, EventService, TransformComponent, ColorComponent, Color } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnFocusedInteractionInputStartedEvent, OnFocusedInteractionInputMovedEvent, OnFocusedInteractionInputEndedEvent } from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload, Entity } from 'meta/worlds';
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

@service()
export class PlacementService extends Service {

  // ── Mode flags ───────────────────────────────────────────────────────────────
  private _placementActive: boolean = false;
  private _selectionActive: boolean = false;

  // ── Shared range indicator (permanent, parked when inactive) ─────────────────
  private _rangeEntity: Entity | null = null;

  // ── Placement-specific state ─────────────────────────────────────────────────
  private _previewEntity: Entity | null = null;
  private _previewOriginalColors: Map<ColorComponent, Color> = new Map();
  private _defId: string = '';
  private _col: number = 0;
  private _row: number = 0;
  private _valid: boolean = false;

  // ── Init ─────────────────────────────────────────────────────────────────────

  async prewarm(): Promise<void> {
    const range = await WorldService.get().spawnTemplate({
      templateAsset: Assets.RangeIndicator,
      position: RANGE_PARK,
      scale: Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    this._rangeEntity = range;
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._previewEntity?.destroy();
    this._previewEntity = null;
    this._previewOriginalColors.clear();
    this._placementActive = false;
    this._selectionActive = false;
    this._parkRange();
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent, { execution: ExecuteOn.Owner })
  onInputStarted(p: OnFocusedInteractionInputEventPayload): void {
    const pos = this._rayToGround(p);
    if (!pos) return;

    const { col, row } = this._worldToCell(pos.x, pos.z);

    if (TowerService.get().isOccupied(col, row)) {
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
    if (!this._placementActive) return;
    this._placementActive = false;

    if (this._valid) {
      const tap = new Events.GridTappedPayload();
      tap.col = this._col;
      tap.row = this._row;
      EventService.sendLocally(Events.GridTapped, tap);
    }

    this._destroyPreview();
  }

  // ── React to tower events to keep range indicator in sync ────────────────────

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(p: Events.TowerUpgradedPayload): void {
    if (!this._selectionActive) return;
    if (p.col !== TowerService.get().selectedCol || p.row !== TowerService.get().selectedRow) return;
    this._showRangeForSelected(p.col, p.row);
  }

  @subscribe(Events.TowerSold)
  onTowerSold(_p: Events.TowerSoldPayload): void {
    if (this._selectionActive) this._exitSelection();
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  private _enterSelection(col: number, row: number): void {
    this._selectionActive = true;
    this._showRangeForSelected(col, row);

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

  // ── Placement ────────────────────────────────────────────────────────────────

  private _enterPlacement(col: number, row: number, pos: { x: number; z: number }): void {
    this._placementActive = true;
    this._defId = TowerService.get().selectedShopId;
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

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
