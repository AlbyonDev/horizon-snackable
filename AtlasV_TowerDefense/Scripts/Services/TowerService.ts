/**
 * TowerService — Tower catalog, registry, placement, upgrade, and sell logic.
 *
 * Catalog: find(id), all() — reads TOWER_DEFS in onReady().
 * Registry: getAt(col, row) — stores ITowerRecord (def, tier, choices, totalInvested).
 * selectShopTower(id): sets the currently selected shop tower for placement.
 * _tryPlace(col, row): spawns a tower entity, sends InitTower, registers it.
 * upgrade(choiceIndex): advances the selected tower one tier, applies stat upgrade.
 * sell(): refunds SELL_RATIO of totalInvested, destroys entity, unregisters.
 * computeStats(defId, choices): walks the upgrade tree to get live ITowerStats.
 * Resets registry on RestartGame.
 */
import { Service, EventService, WorldService, NetworkMode, Vec3 } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import type { ITowerDef, ITowerStats, IUpgradeNode } from '../Types';
import { Events } from '../Types';
import { GRID_COLS, GRID_ROWS, SELL_RATIO } from '../Constants';
import { TOWER_DEFS } from '../Defs/TowerDefs';
import { PathService } from './PathService';
import { ResourceService } from './ResourceService';
import { FloatingTextService } from './FloatingTextService';
import { RelicService } from './RelicService';

// ── Record ────────────────────────────────────────────────────────────────────

export interface ITowerRecord {
  entity: Entity;
  defId: string;
  col: number;
  row: number;
  tier: number;
  choices: number[];       // 0 = A, 1 = B; one entry per tier applied
  totalInvested: number;   // placement cost + all upgrade costs paid
}

// ── Service ───────────────────────────────────────────────────────────────────

@service()
export class TowerService extends Service {

  // ── Catalog ──────────────────────────────────────────────────────────────────
  private _defs: Map<string, ITowerDef> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of TOWER_DEFS) this._defs.set(def.id, def);
    this._initGrid();
  }

  find(id: string): ITowerDef | undefined { return this._defs.get(id); }
  all(): ITowerDef[] { return [...this._defs.values()]; }

  // ── Registry ─────────────────────────────────────────────────────────────────
  private _grid: number[][] = [];
  private _towers: Map<number, ITowerRecord> = new Map();
  private _nextId: number = 0;

  isOccupied(col: number, row: number): boolean {
    if (!this._inBounds(col, row)) return true;
    return this._grid[col][row] !== -1;
  }

  getAt(col: number, row: number): ITowerRecord | undefined {
    if (!this._inBounds(col, row)) return undefined;
    const id = this._grid[col][row];
    return id !== -1 ? this._towers.get(id) : undefined;
  }

  getAll(): ReadonlyMap<number, ITowerRecord> { return this._towers; }

  getEffectiveStats(col: number, row: number): ITowerStats | undefined {
    const rec = this.getAt(col, row);
    if (!rec) return undefined;
    const def = this._defs.get(rec.defId);
    if (!def) return undefined;

    const base: ITowerStats = def.stats;

    let node: IUpgradeNode | undefined = undefined;
    const upgraded = rec.choices.reduce<ITowerStats>((stats, choice) => {
      node = node === undefined
        ? def.upgrades[choice]
        : node.next?.[choice];
      if (!node) return stats;
      return node.apply(stats);
    }, base);

    // Apply relic multipliers (fire rate & range)
    const relics = RelicService.get();
    const fireRateMult = relics.getFireRateMultiplier();
    const rangeMult = relics.getRangeMultiplier();
    if (fireRateMult !== 1 || rangeMult !== 1) {
      return {
        ...upgraded,
        fireRate: upgraded.fireRate * fireRateMult,
        range: upgraded.range * rangeMult,
      };
    }
    return upgraded;
  }

  // Returns the two upgrade options available for the next tier, or undefined if maxed.
  getNextUpgradeOptions(col: number, row: number): readonly [IUpgradeNode, IUpgradeNode] | undefined {
    const rec = this.getAt(col, row);
    if (!rec) return undefined;
    const def = this._defs.get(rec.defId);
    if (!def) return undefined;

    if (rec.choices.length === 0) return def.upgrades;

    let node: IUpgradeNode | undefined = def.upgrades[rec.choices[0]];
    for (let i = 1; i < rec.choices.length; i++) {
      node = node?.next?.[rec.choices[i]];
    }
    return node?.next;
  }

  private _register(entity: Entity, defId: string, col: number, row: number, cost: number): number {
    const id = this._nextId++;
    this._towers.set(id, { entity, defId, col, row, tier: 0, choices: [], totalInvested: cost });
    this._grid[col][row] = id;
    return id;
  }

  private _applyUpgrade(col: number, row: number, choice: number, cost: number): boolean {
    if (!this._inBounds(col, row)) return false;
    const id = this._grid[col][row];
    if (id === -1) return false;
    const rec = this._towers.get(id);
    if (!rec) return false;
    rec.tier++;
    rec.choices.push(choice);
    rec.totalInvested += cost;
    return true;
  }

  private _unregister(col: number, row: number): ITowerRecord | undefined {
    if (!this._inBounds(col, row)) return undefined;
    const id = this._grid[col][row];
    if (id === -1) return undefined;
    const rec = this._towers.get(id);
    this._towers.delete(id);
    this._grid[col][row] = -1;
    return rec;
  }

  private _inBounds(col: number, row: number): boolean {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }

  private _initGrid(): void {
    this._grid = Array.from({ length: GRID_COLS }, () =>
      new Array<number>(GRID_ROWS).fill(-1),
    );
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    for (const rec of this._towers.values()) rec.entity.destroy();
    this._towers.clear();
    this._nextId = 0;
    this._initGrid();
    this._selectedId = 'arrow';
    this._selectedCol = -1;
    this._selectedRow = -1;
  }

  // ── Selection tracking ───────────────────────────────────────────────────────
  private _selectedId: string = 'arrow';
  private _selectedCol: number = -1;
  private _selectedRow: number = -1;

  get selectedShopId(): string { return this._selectedId; }
  get selectedCol(): number { return this._selectedCol; }
  get selectedRow(): number { return this._selectedRow; }

  selectShopTower(id: string): void { this._selectedId = id; }

  @subscribe(Events.TowerSelected)
  onTowerSelected(p: Events.TowerSelectedPayload): void {
    this._selectedCol = p.col;
    this._selectedRow = p.row;
  }

  @subscribe(Events.TowerDeselected)
  onTowerDeselected(_p: Events.TowerDeselectedPayload): void {
    this._selectedCol = -1;
    this._selectedRow = -1;
  }

  // ── Placement ────────────────────────────────────────────────────────────────

  @subscribe(Events.GridTapped)
  async onGridTapped(p: Events.GridTappedPayload): Promise<void> {
    await this._tryPlace(p.col, p.row, this._selectedId);
  }

  private async _tryPlace(col: number, row: number, towerId: string): Promise<void> {
    const def = this._defs.get(towerId);
    if (!def) return;

    if (PathService.get().isPathCell(col, row)) return;
    if (this.isOccupied(col, row)) return;
    if (!ResourceService.get().canAfford(def.cost)) return;

    const pos = PathService.get().cellToWorld(col, row);
    const entity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position: pos,
      scale: Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    if (!entity) return;

    ResourceService.get().spend(def.cost);
    this._register(entity, towerId, col, row, def.cost);

    const initP = new Events.InitTowerPayload();
    initP.defId = towerId;
    initP.col   = col;
    initP.row   = row;
    EventService.sendLocally(Events.InitTower, initP, { eventTarget: entity });

    const placedP = new Events.TowerPlacedPayload();
    placedP.defId = towerId;
    placedP.col   = col;
    placedP.row   = row;
    EventService.sendLocally(Events.TowerPlaced, placedP);
  }

  // ── Actions (called by UI) ───────────────────────────────────────────────────

  sell(): void {
    if (this._selectedCol === -1) return;
    const rec = this._unregister(this._selectedCol, this._selectedRow);
    if (!rec) return;

    const refund = Math.floor(rec.totalInvested * SELL_RATIO);
    ResourceService.get().earn(refund);
    const towerPos = PathService.get().cellToWorld(rec.col, rec.row);
    FloatingTextService.get().show(towerPos.x, towerPos.z, refund);
    rec.entity.destroy();

    const p = new Events.TowerSoldPayload();
    p.col    = rec.col;
    p.row    = rec.row;
    p.refund = refund;
    EventService.sendLocally(Events.TowerSold, p);
  }

  upgrade(choice: number): void {
    if (this._selectedCol === -1) return;
    const col = this._selectedCol;
    const row = this._selectedRow;

    const options = this.getNextUpgradeOptions(col, row);
    if (!options) return;

    const opt = options[choice];
    if (!ResourceService.get().spend(opt.cost)) return;

    const rec = this.getAt(col, row);
    if (!rec) return;

    this._applyUpgrade(col, row, choice, opt.cost);

    const p = new Events.TowerUpgradedPayload();
    p.col    = col;
    p.row    = row;
    p.tier   = rec.tier;
    p.choice = choice;
    EventService.sendLocally(Events.TowerUpgraded, p);
  }
}
