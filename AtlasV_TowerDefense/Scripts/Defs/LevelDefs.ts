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

// ── Act 1 (W1–5): Apprentissage — une mécanique introduite par vague ───────────
// Pas de skill check. Pression suffisante pour signaler que 1 tour ne suffit pas.
//
// ── Act 2 (W6–10): Montée — compositions mixtes, deux skill checks ──────────────
// W7 "Tank Wall" : regen 8/s × 8 tanks — DPS insuffisant sans Laser/Cannon upgradé.
// W10 "Speed Run" : 25 Fast dodge 15% — couverture dense requise, Cannon peu fiable.
//
// ── Act 3 (W11–15): Maîtrise — Boss récurrent, combos qui forcent la variété ────
// W13 "Boss Escort" : Boss immune slow + Fast dodge = Frost quasi inutile.
// W15 "Double Menace" : Boss + Tank simultanément, pas de réponse unique.
//
// ── Act 4 (W16–20): Endgame — économie jugée, skill checks durs ─────────────────
// W17 "Boss Rush" : 6 Boss à HP ×3.4 — seules les tours upgradées enchaînent.
// W20 "Finale" : tout à la fois, un joueur pauvre perd plusieurs vies ici.
const WAVES_LEVEL_0: IWaveDef[] = [

  // ── Act 1 ──────────────────────────────────────────────────────────────────

  // W1 — Tuto : 1 Basic. Voir sa tour tirer, comprendre que ça marche.
  { groups: [{ enemyId: 'basic', count: 1 }] },

  // W2 — Volume léger : assez pour stresser 1 tour, pas assez pour perdre des vies.
  { groups: [{ enemyId: 'basic', count: 6 }] },

  // W3 — Introduction Fast : rapides, dodge 15%. Signal que le Cannon rate souvent.
  { groups: [{ enemyId: 'basic', count: 5 }, { enemyId: 'fast', count: 3 }] },

  // W4 — Introduction Tank : lent, regen 8/s. Le Frost seul le soigne — signal fort.
  { groups: [{ enemyId: 'tank', count: 2 }, { enemyId: 'basic', count: 6 }] },

  // W5 — Mix Act 1 : pression douce sur tous les fronts. 1 seule tour commence à laisser passer.
  { groups: [{ enemyId: 'basic', count: 8 }, { enemyId: 'fast', count: 4 }, { enemyId: 'tank', count: 1 }] },

  // ── Act 2 ──────────────────────────────────────────────────────────────────

  // W6 — Premier Boss : immune slow, quelques Basics pour distraire. Introduction douce.
  { groups: [{ enemyId: 'basic', count: 8 }, { enemyId: 'boss', count: 1 }] },

  // W7 — SKILL CHECK "Tank Wall" : 8 Tanks consécutifs, regen 8/s chacun.
  //   Frost net DPS négatif sur Tank. Arrow seul tient juste. Laser/Cannon upgradé = confort.
  { groups: [{ enemyId: 'tank', count: 8 }, { enemyId: 'basic', count: 5 }] },

  // W8 — Fast flood : après le choc des tanks, pression vitesse. Signal pour W10.
  { groups: [{ enemyId: 'fast', count: 14 }, { enemyId: 'basic', count: 6 }] },

  // W9 — Boss + Tank escort : immune slow + regen simultanément. Frost contre-productif sur les deux.
  { groups: [{ enemyId: 'boss', count: 2 }, { enemyId: 'tank', count: 5 }, { enemyId: 'basic', count: 8 }] },

  // W10 — SKILL CHECK "Speed Run" : 25 Fast, dodge 15%. Pas de Boss ni Tank.
  //   Pression pure couverture + volume tirs. Cannon (0.6/s) souvent dodgé, laisse passer.
  { groups: [{ enemyId: 'fast', count: 25 }] },

  // ── Act 3 ──────────────────────────────────────────────────────────────────

  // W11 — Respiration : Basics en nombre. Moment d'upgrader avant les vagues dures.
  { groups: [{ enemyId: 'basic', count: 20 }] },

  // W12 — Tank + Fast combo : Frost ralentit les Fast mais soigne les Tanks — dilemme de placement.
  { groups: [{ enemyId: 'tank', count: 6 }, { enemyId: 'fast', count: 12 }, { enemyId: 'basic', count: 8 }] },

  // W13 — "Boss Escort" : Boss immune slow + Fast dodge = Frost inutile sur les deux.
  //   Vague signature pour le joueur Frost-centrique.
  { groups: [{ enemyId: 'boss', count: 3 }, { enemyId: 'fast', count: 15 }] },

  // W14 — Tank tide : 10 Tanks simultanément, regen brutal sans DPS soutenu.
  //   Tours cheap non upgradées commencent à saturer.
  { groups: [{ enemyId: 'tank', count: 10 }, { enemyId: 'basic', count: 10 }] },

  // W15 — SKILL CHECK "Double Menace" : Boss + Tank en grand nombre, pas de réponse unique.
  //   Laser pour les Tanks, DPS pur pour les Boss, Frost quasi inutile sur les deux.
  { groups: [{ enemyId: 'boss', count: 3 }, { enemyId: 'tank', count: 8 }, { enemyId: 'basic', count: 10 }] },

  // ── Act 4 ──────────────────────────────────────────────────────────────────

  // W16 — Saturation : tout en volume, dernier moment pour dépenser l'income accumulé.
  { groups: [{ enemyId: 'basic', count: 20 }, { enemyId: 'fast', count: 15 }, { enemyId: 'tank', count: 8 }] },

  // W17 — SKILL CHECK "Boss Rush" : 6 Boss immune slow, HP ×3.4 (wave 17).
  //   ~2040 HP/Boss — seul Laser ou Cannon tier 2 les enchaîne. Vague la plus mémorable.
  { groups: [{ enemyId: 'boss', count: 6 }, { enemyId: 'fast', count: 10 }] },

  // W18 — Récupération tendue : volume élevé sans Boss ni Tank. Tenir pour aborder W19–20 intact.
  { groups: [{ enemyId: 'basic', count: 25 }, { enemyId: 'fast', count: 20 }] },

  // W19 — "Mur d'Acier" : Tank tide massive + Boss en soutien. Regen brutal à HP ×3.7.
  { groups: [{ enemyId: 'tank', count: 15 }, { enemyId: 'boss', count: 3 }, { enemyId: 'basic', count: 10 }] },

  // W20 — Finale : tout à la fois. Économie bien gérée = on finit proprement.
  //   Économie gaspillée = on finit mais avec des vies perdues.
  { groups: [{ enemyId: 'boss', count: 5 }, { enemyId: 'tank', count: 12 }, { enemyId: 'fast', count: 20 }, { enemyId: 'basic', count: 15 }] },
];

export const LEVEL_DEFS: ILevelDef[] = [
  {
    startGold: 100,
    startLives: 20,
    pathWaypoints: PATH_WAYPOINTS_LEVEL_0,
    waves: WAVES_LEVEL_0,
  },
];
