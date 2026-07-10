/**
 * LevelDefs.ts — Static data table for level and wave definitions.
 *
 * Pure data — no side effects, no service calls.
 * ILevelDef: startGold, startLives, pathWaypoints (ref to PathDefs), waves[].
 * IWaveDef: groups[] of { enemyId, count } — spawned sequentially by WaveService.
 * To add a wave: add an entry to LEVEL_DEFS[0].waves.
 * To add a level: add a new ILevelDef entry to LEVEL_DEFS.
 * Read by WaveService and PathService via LEVEL_DEFS[0].
 */
import type { IWaveDef } from '../Types';
import { PATH_WAYPOINTS_LEVEL_0 } from './PathDefs';

export interface ILevelDef {
  startGold: number;
  startLives: number;
  pathWaypoints: ReadonlyArray<readonly [number, number]>;
  waves: IWaveDef[];
}

// ── Act 1 (W1–5): Onboarding — one threat type introduced per wave ──────────────
// No skill check. Enough pressure to signal that 1 tower is not sufficient.
//
// ── Act 2 (W6–10): the threats sharpen — first hoarding decision + swarm checks ─
// W6 first Boss — bank for a Laser? W8 spread-Fast swarm (Cannon needs Frost to re-bunch).
// W10 "Speed Run": 22 pure Fast (spread + dodge) — hard Frost+Cannon combo check.
//
// ── Act 3 (W11–15): combos force the full toolkit ───────────────────────────────
// W13 "Boss Escort": Boss (Laser) + spread Fast (Frost+Cannon) — two answers at once.
// W15 bulk overload: Boss + Tank + basics, no single answer.
//
// ── Act 4 (W16–20): Endgame — economy + toolkit tested hard ─────────────────────
// W17 "Boss Rush": 4 Boss + escort — the payoff wave for the banked-for Laser.
// W20 "Finale": everything at once, a poor economy loses lives here.
const WAVES_LEVEL_0: IWaveDef[] = [

  // Arc principle: alternate threat TYPES so the player keeps switching tools. Swarm difficulty
  // is set by SPEED/SPREAD (fast = spread = hard for Cannon), not just count. Named skill-checks
  // each demand a specific tool/combo, unbeatable by mono-strategy.
  //   basic = bunched swarm (Cannon solos) · fast = spread swarm (needs Frost+Cannon, dodges)
  //   tank/boss = bulk (needs Laser's concentrated spool DPS; boss is slow-immune)

  // ── Act 1 (W1–5): one mechanic introduced per wave, no skill check ──────────

  // W1 — Tutorial: a single Basic. See the tower fire, understand the loop. No real pressure.
  { groups: [{ enemyId: 'basic', count: 1 }] },

  // W2 — Bunched swarm: slow basics clump; Cannon/Arrow handle it.
  { groups: [{ enemyId: 'basic', count: 8 }] },

  // W3 — Intro Fast (spread): quick, dodgy. Cannon starts missing the strung-out ones.
  { groups: [{ enemyId: 'basic', count: 6 }, { enemyId: 'fast', count: 4 }] },

  // W4 — Intro Tank (bulk): slow, high HP. Single-target throughput needed.
  { groups: [{ enemyId: 'basic', count: 6 }, { enemyId: 'tank', count: 2 }] },

  // W5 — Mixed pressure on all fronts; one tower starts to leak. (Eased: 4 fast, was 5 —
  //   slightly less early spend pressure so a small pile can start forming for hoarding.)
  { groups: [{ enemyId: 'basic', count: 8 }, { enemyId: 'fast', count: 4 }, { enemyId: 'tank', count: 1 }] },

  // ── Act 2 (W6–10): the threats sharpen; first hoarding decision + swarm checks ──

  // W6 — FIRST BOSS: slow-immune bulk. Did you bank for a Laser? An unprepared boss punishes.
  { groups: [{ enemyId: 'basic', count: 8 }, { enemyId: 'boss', count: 1 }] },

  // W7 — Tank wall: bulk that only concentrated DPS (Laser) chews through.
  { groups: [{ enemyId: 'tank', count: 6 }, { enemyId: 'basic', count: 4 }] },

  // W8 — SKILL CHECK (spread swarm): Fast string out → Cannon alone leaks → bring Frost to re-bunch.
  { groups: [{ enemyId: 'fast', count: 16 }, { enemyId: 'basic', count: 4 }] },

  // W9 — Bulk-stacked: boss + tanks together. One Laser strains; needs help or a 2nd.
  { groups: [{ enemyId: 'boss', count: 1 }, { enemyId: 'tank', count: 4 }, { enemyId: 'basic', count: 6 }] },

  // W10 — SKILL CHECK "Speed Run": 22 pure Fast, spread + dodge. Hard Frost+Cannon combo check.
  { groups: [{ enemyId: 'fast', count: 22 }] },

  // ── Act 3 (W11–15): combos that force the full toolkit ──────────────────────

  // W11 — Breather: bunched basics. Spend/upgrade before the hard waves.
  { groups: [{ enemyId: 'basic', count: 18 }] },

  // W12 — Everything at once: tanks + spread fast + basics. Diversify.
  { groups: [{ enemyId: 'tank', count: 5 }, { enemyId: 'fast', count: 12 }, { enemyId: 'basic', count: 6 }] },

  // W13 — SKILL CHECK "Boss Escort": bosses + spread fast. Laser for the boss AND Frost+Cannon for the escort.
  { groups: [{ enemyId: 'boss', count: 2 }, { enemyId: 'fast', count: 14 }] },

  // W14 — Tank tide: a wall of bulk. Multi-Laser or a fully-committed single.
  { groups: [{ enemyId: 'tank', count: 9 }, { enemyId: 'basic', count: 8 }] },

  // W15 — Bulk overload: bosses + tanks + basics, no single answer.
  { groups: [{ enemyId: 'boss', count: 2 }, { enemyId: 'tank', count: 6 }, { enemyId: 'basic', count: 8 }] },

  // ── Act 4 (W16–20): endgame — economy + toolkit tested hard ─────────────────

  // W16 — All swarm types + bulk: bunched basics, spread fast, tanks. Coverage + diversity.
  { groups: [{ enemyId: 'basic', count: 16 }, { enemyId: 'fast', count: 14 }, { enemyId: 'tank', count: 6 }] },

  // W17 — SKILL CHECK "Boss Rush": 4 bosses + fast escort. The payoff wave for the Laser investment.
  { groups: [{ enemyId: 'boss', count: 4 }, { enemyId: 'fast', count: 10 }] },

  // W18 — Massive mixed swarm, no bulk: hold the coverage line for W19–20.
  { groups: [{ enemyId: 'basic', count: 20 }, { enemyId: 'fast', count: 18 }] },

  // W19 — Bulk finale prep: tank tide + boss support.
  { groups: [{ enemyId: 'tank', count: 12 }, { enemyId: 'boss', count: 2 }, { enemyId: 'basic', count: 8 }] },

  // W20 — Finale: everything. Needs the full toolkit; a poor economy loses lives here.
  { groups: [{ enemyId: 'boss', count: 4 }, { enemyId: 'tank', count: 10 }, { enemyId: 'fast', count: 16 }, { enemyId: 'basic', count: 12 }] },
];

export const LEVEL_DEFS: ILevelDef[] = [
  {
    // NOTE: ResourceService reads START_GOLD / START_LIVES from Constants.ts — those are the
    // LIVE values. These fields are mirrored for reference only (kept in sync to avoid confusion).
    startGold: 100,
    startLives: 10,
    pathWaypoints: PATH_WAYPOINTS_LEVEL_0,
    waves: WAVES_LEVEL_0,
  },
];
