import type { TemplateAsset } from 'meta/worlds';
import { Assets } from '../Assets';

export interface IKeeperDef {
  template: TemplateAsset;

  // Reaction
  reactionMs:      number;  // delay before GK reacts to the kick
  diveChance:      number;  // probability [0..1] of diving vs stepping

  // Movement
  speed:           number;  // lateral speed when reacting (world units / frame at 60fps)
  idleSpeed:       number;  // lateral speed during idle sway

  // Dive motion
  diveSpeed:       number;  // diveT increment per second
  diveLateral:     number;  // total sideways distance at full dive
  diveHeight:      number;  // peak vertical offset during dive

  // Standing collision box
  halfW:           number;  // half-width of standing hitbox
  standH:          number;  // full height of standing hitbox (pivot at feet)
  footY:           number;  // ignore contact below this Y (feet/ground fringe)

  // Dive visual correction
  animDiveOffsetY: number;  // extra Y offset (mesh local) added by the FBX dive animation

  // Shadow blob
  shadowBaseX:     number;  // base X scale of shadow
}

export const KEEPER_DEFS: IKeeperDef[] = [
  // ── Keeper 1 — Aggressive diver ─────────────────────────────────────────────
  // Réagit vite, plonge loin et haut — mais hitbox étroite (prend des risques)
  {
    template:       Assets.Keeper1,
    reactionMs:     120,
    diveChance:     0.90,    // plonge presque toujours
    speed:          0.060,
    idleSpeed:      0.022,
    diveSpeed:      2.2,     // plonge plus vite
    diveLateral:    2.0,     // couvre plus de terrain
    diveHeight:     0.8,     // s'élève plus haut
    halfW:          0.8 / 2,
    standH:         1.75,
    footY:          0.10,
    animDiveOffsetY: 0.5,
    shadowBaseX:    1.2,
  },
  // ── Keeper 2 — Big slow ──────────────────────────────────────────────────
  {
    template:       Assets.Keeper2,
    reactionMs:     200,
    diveChance:     0.75,
    speed:          0.055,
    idleSpeed:      0.018,
    diveSpeed:      1.8,
    diveLateral:    1.6,
    diveHeight:     0.5,
    halfW:          1.25 / 2,
    standH:         1.85,
    footY:          0.10,
    animDiveOffsetY: 0.5,
    shadowBaseX:    1.5,
  },
  // ── Keeper 3 — Quick stepper ─────────────────────────────────────────────────
  // Réaction quasi-instantanée, se repositionne vite — mais plonge peu et petit
  {
    template:       Assets.Keeper3,
    reactionMs:     60,
    diveChance:     0.65,    // préfère step plutôt que dive
    speed:          0.085,   // se déplace vite latéralement
    idleSpeed:      0.030,   // sway rapide
    diveSpeed:      1.6,     // plonge lentement quand il le fait
    diveLateral:    1.4,     // amplitude latérale modérée
    diveHeight:     1.1,     // saute très haut pour compenser sa petite taille
    halfW:          0.75/2,
    standH:         1.65,
    footY:          0.10,
    animDiveOffsetY: 0.5,
    shadowBaseX:    1,
  },
];
