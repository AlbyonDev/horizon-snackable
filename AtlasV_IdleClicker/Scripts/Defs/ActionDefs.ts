/**
 * ActionDefs — Static catalog of all player-facing actions.
 *
 * Note: progressive visibility (gold/taps thresholds) is disabled — every action
 * is visible from the start. The only retained unlocks are the upgrade rank
 * chain (each rank requires the previous one), which mirrors the GeneratorService
 * order-check and avoids dead buttons.
 */

import { StatsService } from "../Services/StatsService";

export interface IActionDef {
  readonly id          : string;
  readonly label       : string;
  readonly description : string;
  readonly cost        : number;
  readonly costPow    ?: number;
  readonly maxCount   ?: number;
  readonly unlock     ?: Readonly<Record<string, number>>;
}

// ─── Tap ──────────────────────────────────────────────────────────────────────

export const TAP_DEFS: IActionDef[] = [
  { id: 'tap.buy',     label: 'Apprentice Miner', description: 'A devoted disciple chips the crystal for you.', cost:  50, maxCount: 10 },
  { id: 'tap.upgrade', label: 'Sacred Pickaxe',   description: 'Empower your strike — each tap yields more gems.', cost: 100, maxCount: 50 },
];

// ─── Generators ───────────────────────────────────────────────────────────────

const GENERATOR_ACTION_DEFS: IActionDef[] = [
  { id: 'generator.buy.0', label: 'Raise Jungle Shrine', description: 'A small altar where vines bear living gems.',   cost: 15, costPow: 1.15, maxCount: 0 },
  { id: 'generator.buy.1', label: 'Dig Crystal Mine',    description: 'Carve into the cliffs to reach buried veins.', cost: 50, costPow: 1.15, maxCount: 0 },

  // Jungle Shrine upgrades — temple progression
  { id: 'generator.upgrade.0.0', label: 'Shrine Blessing I',        description: 'A first prayer awakens the stone.',           cost:         1_500 },
  { id: 'generator.upgrade.0.1', label: 'Shrine Blessing II',       description: 'The shrine answers in richer offerings.',     cost:         5_000, unlock: { 'generator.upgrade.0.0': 1 } },
  { id: 'generator.upgrade.0.2', label: 'Shrine Ritual I',          description: 'Rites are carved into the altar.',            cost:        20_000, unlock: { 'generator.upgrade.0.1': 1 } },
  { id: 'generator.upgrade.0.3', label: 'Shrine Ritual II',         description: 'The vines pulse to a steady chant.',          cost:        50_000, unlock: { 'generator.upgrade.0.2': 1 } },
  { id: 'generator.upgrade.0.4', label: 'Shrine Sanctification I',  description: 'Sacred ground multiplies its bounty.',        cost:       320_000, unlock: { 'generator.upgrade.0.3': 1 } },
  { id: 'generator.upgrade.0.5', label: 'Shrine Sanctification II', description: 'Even the wind carries gem dust now.',         cost:     1_280_000, unlock: { 'generator.upgrade.0.4': 1 } },
  { id: 'generator.upgrade.0.6', label: 'Shrine Ascension I',       description: 'The shrine rises beyond mortal craft.',       cost:     5_120_000, unlock: { 'generator.upgrade.0.5': 1 } },
  { id: 'generator.upgrade.0.7', label: 'Shrine Ascension II',      description: 'Ancient guardians lend their strength.',      cost:    20_480_000, unlock: { 'generator.upgrade.0.6': 1 } },
  { id: 'generator.upgrade.0.8', label: 'Shrine Apotheosis I',      description: 'The altar becomes a wellspring of gems.',     cost:    80_420_000, unlock: { 'generator.upgrade.0.7': 1 } },
  { id: 'generator.upgrade.0.9', label: 'Shrine Apotheosis II',     description: 'A divine relic — the shrine itself is myth.', cost:   325_180_000, unlock: { 'generator.upgrade.0.8': 1 } },

  // Crystal Mine upgrades — deeper, richer, holier
  { id: 'generator.upgrade.1.0', label: 'Mine Blessing I',          description: 'Torches consecrate the first tunnel.',        cost:        11_000 },
  { id: 'generator.upgrade.1.1', label: 'Mine Blessing II',         description: 'The veins glow brighter with each strike.',   cost:        44_000, unlock: { 'generator.upgrade.1.0': 1 } },
  { id: 'generator.upgrade.1.2', label: 'Mine Ritual I',            description: 'Miners chant the old songs underground.',     cost:       176_000, unlock: { 'generator.upgrade.1.1': 1 } },
  { id: 'generator.upgrade.1.3', label: 'Mine Ritual II',           description: 'The stone yields to ritual rhythm.',          cost:       704_000, unlock: { 'generator.upgrade.1.2': 1 } },
  { id: 'generator.upgrade.1.4', label: 'Mine Sanctification I',    description: 'Each gallery becomes a chapel of crystal.',   cost:     2_816_000, unlock: { 'generator.upgrade.1.3': 1 } },
  { id: 'generator.upgrade.1.5', label: 'Mine Sanctification II',   description: 'Veins of pure ore awaken in the dark.',       cost:    11_264_000, unlock: { 'generator.upgrade.1.4': 1 } },
  { id: 'generator.upgrade.1.6', label: 'Mine Ascension I',         description: 'A deeper vault opens — the heart of the cliff.', cost:  45_056_000, unlock: { 'generator.upgrade.1.5': 1 } },
  { id: 'generator.upgrade.1.7', label: 'Mine Ascension II',        description: 'The mine breathes with a forgotten power.',   cost:   180_224_000, unlock: { 'generator.upgrade.1.6': 1 } },
  { id: 'generator.upgrade.1.8', label: 'Mine Apotheosis I',        description: 'The mountain itself surrenders its core.',    cost:   720_896_000, unlock: { 'generator.upgrade.1.7': 1 } },
  { id: 'generator.upgrade.1.9', label: 'Mine Apotheosis II',       description: 'A legendary vein — endless and radiant.',     cost: 2_883_584_000, unlock: { 'generator.upgrade.1.8': 1 } },
];

// ─── Crit ─────────────────────────────────────────────────────────────────────

const CRIT_DEFS: IActionDef[] = [
  { id: 'crit.unlock', label: "Miner's Eye",     description: 'Spot the weak point — chance to shatter a vein for massive gain.', cost: 150 },
  { id: 'crit.chance', label: 'Keen Sight',      description: 'Train your gaze to find weak points more often.',                   cost: 500, maxCount: 8, unlock: { 'crit.unlock': 1 } },
  { id: 'crit.power',  label: 'Shattering Blow', description: 'When a weak point breaks, more crystal falls.',                     cost: 750, maxCount: 50, unlock: { 'crit.unlock': 1 } },
];

// ─── Frenzy ───────────────────────────────────────────────────────────────────

const FRENZY_DEFS: IActionDef[] = [
  { id: 'frenzy.unlock',    label: 'Temple Trance',   description: 'A streak of strikes calls the spirits — gains soar for a while.', cost: 400 },
  { id: 'frenzy.threshold', label: 'Quickening Beat', description: 'Fewer strikes are needed to call the trance.',                    cost: 300, maxCount:  5, unlock: { 'frenzy.unlock': 1 } },
  { id: 'frenzy.duration',  label: 'Deeper Trance',   description: 'The spirits linger — extend the trance.',                         cost: 400, maxCount: 10, unlock: { 'frenzy.unlock': 1 } },
  { id: 'frenzy.power',     label: 'Spirit Fury',     description: 'The trance burns hotter — multiply gains further.',               cost: 600, maxCount: 10, unlock: { 'frenzy.unlock': 1 } },
];

// ─── Interest ─────────────────────────────────────────────────────────────────

const INTEREST_DEFS: IActionDef[] = [
  { id: 'interest.unlock',   label: 'Temple Offering', description: 'Tithe to the temple — receive a share of your gems on each cycle.', cost: 2_000 },
  { id: 'interest.rate',     label: 'Generous Spirits', description: 'The spirits grow fonder of you — a larger share each cycle.',       cost:   200, maxCount: 10, unlock: { 'interest.unlock': 1 } },
  { id: 'interest.interval', label: 'Hastened Rites',   description: 'Speed up the ritual — receive offerings more often.',               cost: 4_000, maxCount: 10, unlock: { 'interest.unlock': 1 } },
];

// ─── Vault ────────────────────────────────────────────────────────────────────

const VAULT_DEFS: IActionDef[] = [
  { id: 'vault.unlock',   label: 'Inner Sanctum', description: 'Seal gems inside the inner sanctum — they return blessed.',   cost: 6_000 },
  { id: 'vault.lock',     label: 'Seal Sanctum',   description: 'Lock 50% of your gems away — they return blessed with bonus.', cost:     0, maxCount: 0, unlock: { 'vault.unlock': 1 } },
  { id: 'vault.duration', label: 'Swift Sealing',  description: 'The sanctum unbinds the gems faster.',                         cost: 1_500, maxCount: 10, unlock: { 'vault.unlock': 1 } },
  { id: 'vault.bonus',    label: 'Sacred Blessing', description: 'The sanctum returns even more gems than were sealed.',         cost: 3_000, maxCount: 10, unlock: { 'vault.unlock': 1 } },
];

// ─── Full registry ────────────────────────────────────────────────────────────

export const ACTION_DEFS: IActionDef[] = [
  ...TAP_DEFS,
  ...GENERATOR_ACTION_DEFS,
  ...CRIT_DEFS,
  ...FRENZY_DEFS,
  ...INTEREST_DEFS,
  ...VAULT_DEFS,
];

export function getActionDef(id: string): IActionDef {
  const def = ACTION_DEFS.find(d => d.id === id);
  if (!def) throw new Error(`ActionDef not found: "${id}"`);
  return def;
}

export function getScaledCost(id: string, level?: number): number {
  const def = getActionDef(id);
  const lvl = level ?? StatsService.get().get(id);
  return Math.floor(def.cost * Math.pow(def.costPow ?? 2, lvl));
}
