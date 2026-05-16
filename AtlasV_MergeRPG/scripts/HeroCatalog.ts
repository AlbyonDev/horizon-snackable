/**
 * HeroCatalog
 *
 * Single source of truth for the hero card collection. Each entry fully
 * describes a hero: identity, art, stats, color affinities (= damage per
 * mana type) and power. Adding a new playable hero is a one-entry edit
 * here — the rest of the codebase (factory, renderer, power UI) reads
 * from this catalog through the helpers below.
 *
 * `id` is the card key — stable across save data and dungeon rewards
 * (`RoomReward.heroCard`).
 */
import { TextureAsset } from 'meta/worlds';
import { GemType } from './Types';
import {
  PowerEffectType,
  PowerTarget,
  type PowerDefinition,
} from './PowerTypes';
import type { ColorAffinities } from './TeamTypes';
import {
  heroWarriorTexture,
  heroMageTexture,
  heroPaladinTexture,
  heroRangerTexture,
  heroNecromancerTexture,
  heroBerserkerTexture,
  heroPyromancerTexture,
  heroCryomancerTexture,
  heroOracleTexture,
  heroDruidTexture,
  heroAssassinTexture,
  heroClericTexture,
  heroAlchemistTexture,
  heroWarlockTexture,
  heroDeathKnightTexture,
} from './Assets';

/** Static, designer-authored definition of a hero card. */
export interface HeroData {
  /** Stable card identifier — used as deck key and texture lookup key. */
  id: string;
  /** Display name. */
  name: string;
  /** Portrait/battle texture rendered by every hero-aware view. */
  texture: TextureAsset;
  /** Base max HP (level scaling is applied elsewhere). */
  baseHp: number;
  /** Base ATK used by combat damage formulas. */
  baseAtk: number;
  /**
   * Per-color damage affinities (0-1).
   * Drives both color assignment (highest affinity wins) and the
   * per-match damage multiplier in CombatSystem.
   */
  affinities: ColorAffinities;
  /** Active ability triggered from the power preview. */
  power: PowerDefinition;
}

// ===== Catalog entries =====
// To add a new card: append one HeroData below. No other file needs editing.

const WARRIOR: HeroData = {
  id: 'warrior',
  name: 'Warrior',
  texture: heroWarriorTexture,
  baseHp: 300,
  baseAtk: 18,
  affinities: {
    [GemType.Red]: 0.9, [GemType.Blue]: 0.2, [GemType.Green]: 0.3,
    [GemType.Yellow]: 0.7, [GemType.Purple]: 0.1,
  },
  power: {
    name: 'Cleave',
    manaColor: GemType.Red,
    manaCost: 12,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 1.2,
    description: 'Slash all enemies with a mighty cleave!',
  },
};

const MAGE: HeroData = {
  id: 'mage',
  name: 'Mage',
  texture: heroMageTexture,
  baseHp: 200,
  baseAtk: 22,
  affinities: {
    [GemType.Red]: 0.2, [GemType.Blue]: 0.9, [GemType.Green]: 0.3,
    [GemType.Yellow]: 0.1, [GemType.Purple]: 0.7,
  },
  power: {
    name: 'Fireball',
    manaColor: GemType.Blue,
    manaCost: 18,
    effectType: PowerEffectType.GEM_DESTROY_DAMAGE,
    target: PowerTarget.ALL_ENEMIES,
    convertFromColor: GemType.Red,
    convertCount: 0,
    atkMultiplier: 0.5,
    description: 'Detonate every Red gem on the board, dealing 50% ATK per gem to all enemies!',
  },
};

const PALADIN: HeroData = {
  id: 'paladin',
  name: 'Paladin',
  texture: heroPaladinTexture,
  baseHp: 250,
  baseAtk: 16,
  affinities: {
    [GemType.Red]: 0.5, [GemType.Blue]: 0.2, [GemType.Green]: 0.2,
    [GemType.Yellow]: 0.9, [GemType.Purple]: 0.1,
  },
  power: {
    name: 'Divine Shield',
    manaColor: GemType.Yellow,
    manaCost: 10,
    effectType: PowerEffectType.SHIELD,
    target: PowerTarget.ALL_ALLIES,
    shieldHits: 2,
    duration: 3,
    description: 'Envelop all allies in divine light, shielding each from 2 hits for 3 turns!',
  },
};

const RANGER: HeroData = {
  id: 'ranger',
  name: 'Ranger',
  texture: heroRangerTexture,
  baseHp: 250,
  baseAtk: 17,
  affinities: {
    [GemType.Red]: 0.1, [GemType.Blue]: 0.5, [GemType.Green]: 0.9,
    [GemType.Yellow]: 0.2, [GemType.Purple]: 0.2,
  },
  power: {
    name: 'Poison Arrow',
    manaColor: GemType.Green,
    manaCost: 8,
    effectType: PowerEffectType.DAMAGE_DOT,
    target: PowerTarget.SINGLE_ENEMY,
    atkMultiplier: 0.4,
    duration: 3,
    description: 'Poison the front enemy for damage over 3 turns!',
  },
};

const NECROMANCER: HeroData = {
  id: 'necromancer',
  name: 'Necromancer',
  texture: heroNecromancerTexture,
  baseHp: 250,
  baseAtk: 20,
  affinities: {
    [GemType.Red]: 0.5, [GemType.Blue]: 0.1, [GemType.Green]: 0.1,
    [GemType.Yellow]: 0.2, [GemType.Purple]: 0.9,
  },
  power: {
    name: 'Life Drain',
    manaColor: GemType.Purple,
    manaCost: 12,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.SINGLE_ENEMY,
    atkMultiplier: 1.8,
    description: 'Drain life from the enemy, healing yourself!',
    secondaryEffect: {
      effectType: PowerEffectType.HEAL,
      atkMultiplier: 0.5,
    },
  },
};

// ===== Red — 2 nouveaux =====

// Frénétique à haut risque : peu de PV, ATK maximale, se booste lui-même.
// Choix Warrior vs Berserker : cleave immédiate AoE vs buff personnel pour mise à mort rapide.
const BERSERKER: HeroData = {
  id: 'berserker',
  name: 'Berserker',
  texture: heroBerserkerTexture,
  baseHp: 215,
  baseAtk: 26,
  affinities: {
    [GemType.Red]: 0.95, [GemType.Blue]: 0.1, [GemType.Green]: 0.1,
    [GemType.Yellow]: 0.5, [GemType.Purple]: 0.2,
  },
  power: {
    name: 'Blood Frenzy',
    manaColor: GemType.Red,
    manaCost: 10,
    effectType: PowerEffectType.GEM_DESTROY_DAMAGE,
    target: PowerTarget.ALL_ENEMIES,
    convertFromColor: GemType.Blue,
    atkMultiplier: 0,
    description: 'Enter a murderous frenzy, doubling your ATK for 2 turns, then destroy all Blue gems!',
    secondaryEffect: {
      effectType: PowerEffectType.BUFF_ATK,
      buffMultiplier: 2.0,
      duration: 2,
    },
  },
};

// Manipulateur de plateau rouge : convertit les gemmes bleues en rouges,
// puis frappe tous les ennemis. Synergise avec lui-même sur les tours suivants.
const PYROMANCER: HeroData = {
  id: 'pyromancer',
  name: 'Pyromancer',
  texture: heroPyromancerTexture,
  baseHp: 190,
  baseAtk: 20,
  affinities: {
    [GemType.Red]: 0.9, [GemType.Blue]: 0.1, [GemType.Green]: 0.1,
    [GemType.Yellow]: 0.3, [GemType.Purple]: 0.2,
  },
  power: {
    name: 'Volcanic Surge',
    manaColor: GemType.Red,
    manaCost: 14,
    effectType: PowerEffectType.GEM_CONVERT,
    target: PowerTarget.ALL_ENEMIES,
    convertFromColor: GemType.Blue,
    convertToColor: GemType.Red,
    convertCount: 6,
    description: 'Melt 6 Blue gems into Red, then scorch all enemies!',
    secondaryEffect: {
      effectType: PowerEffectType.DAMAGE_BURST,
      atkMultiplier: 0.9,
    },
  },
};

// ===== Blue — 2 nouveaux =====

// Contrôleur défensif : réduit l'ATK de tous les ennemis sur plusieurs tours.
// Choix Mage vs Cryomancer : burst immédiat vs contrôle durable.
const CRYOMANCER: HeroData = {
  id: 'cryomancer',
  name: 'Cryomancer',
  texture: heroCryomancerTexture,
  baseHp: 225,
  baseAtk: 16,
  affinities: {
    [GemType.Red]: 0.1, [GemType.Blue]: 0.9, [GemType.Green]: 0.4,
    [GemType.Yellow]: 0.2, [GemType.Purple]: 0.2,
  },
  power: {
    name: 'Glacial Slow',
    manaColor: GemType.Blue,
    manaCost: 12,
    effectType: PowerEffectType.DEBUFF_ATK,
    target: PowerTarget.ALL_ENEMIES,
    buffMultiplier: 0.45,
    duration: 3,
    description: 'Freeze all enemies, reducing their ATK by 55% for 3 turns!',
  },
};

// Moteur de mana : mélange le plateau pour créer des opportunités,
// puis injecte de la mana bleue. Zéro dégâts — pure utilité.
const ORACLE: HeroData = {
  id: 'oracle',
  name: 'Oracle',
  texture: heroOracleTexture,
  baseHp: 195,
  baseAtk: 14,
  affinities: {
    [GemType.Red]: 0.1, [GemType.Blue]: 0.85, [GemType.Green]: 0.2,
    [GemType.Yellow]: 0.5, [GemType.Purple]: 0.4,
  },
  power: {
    name: 'Foresight',
    manaColor: GemType.Blue,
    manaCost: 10,
    effectType: PowerEffectType.BOARD_SHUFFLE,
    target: PowerTarget.ALL_ALLIES,
    description: 'Shuffle all gems on the board and gain 1 mana of every colour!',
    manaGrant: { [GemType.Red]: 1, [GemType.Blue]: 1, [GemType.Green]: 1, [GemType.Yellow]: 1, [GemType.Purple]: 1 },
  },
};

// ===== Green — 2 nouveaux =====

// Soigneur d'équipe, seul à heal toute l'équipe simultanément.
// Choix Ranger vs Druid : pression DoT offensif vs soutien défensif.
const DRUID: HeroData = {
  id: 'druid',
  name: 'Druid',
  texture: heroDruidTexture,
  baseHp: 245,
  baseAtk: 13,
  affinities: {
    [GemType.Red]: 0.1, [GemType.Blue]: 0.3, [GemType.Green]: 0.9,
    [GemType.Yellow]: 0.6, [GemType.Purple]: 0.1,
  },
  power: {
    name: 'Regeneration',
    manaColor: GemType.Green,
    manaCost: 10,
    effectType: PowerEffectType.HEAL,
    target: PowerTarget.ALL_ALLIES,
    atkMultiplier: 0.7,
    description: 'Channel nature\'s energy, healing all allies for 70% ATK!',
  },
};

// Tueur monocible à burst : peu de PV mais l'ATK la plus haute vert.
// Secondairement debuff sa cible pour faciliter les tours suivants.
const ASSASSIN: HeroData = {
  id: 'assassin',
  name: 'Assassin',
  texture: heroAssassinTexture,
  baseHp: 190,
  baseAtk: 24,
  affinities: {
    [GemType.Red]: 0.3, [GemType.Blue]: 0.2, [GemType.Green]: 0.9,
    [GemType.Yellow]: 0.1, [GemType.Purple]: 0.5,
  },
  power: {
    name: 'Shadow Strike',
    manaColor: GemType.Green,
    manaCost: 12,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.SINGLE_ENEMY,
    atkMultiplier: 2.8,
    description: 'Strike from the shadows for massive single-target damage and reduce the target\'s ATK by 40%!',
    secondaryEffect: {
      effectType: PowerEffectType.DEBUFF_ATK,
      buffMultiplier: 0.6,
    },
  },
};

// ===== Yellow — 2 nouveaux =====

// Support offensif : booste l'ATK de toute l'équipe.
// Choix Paladin vs Cleric : bouclier défensif vs buff offensif.
const CLERIC: HeroData = {
  id: 'cleric',
  name: 'Cleric',
  texture: heroClericTexture,
  baseHp: 255,
  baseAtk: 15,
  affinities: {
    [GemType.Red]: 0.6, [GemType.Blue]: 0.1, [GemType.Green]: 0.2,
    [GemType.Yellow]: 0.9, [GemType.Purple]: 0.1,
  },
  power: {
    name: 'Blessed Renewal',
    manaColor: GemType.Yellow,
    manaCost: 10,
    effectType: PowerEffectType.HEAL_DOT,
    target: PowerTarget.ALL_ALLIES,
    atkMultiplier: 0.35,
    duration: 4,
    description: 'Bless the team with holy renewal, healing all allies for 35% ATK each turn for 4 turns!',
  },
};

// Moteur mana jaune : convertit les gemmes violettes en jaunes,
// puis génère de la mana jaune. Synergise avec Paladin et Cleric.
const ALCHEMIST: HeroData = {
  id: 'alchemist',
  name: 'Alchemist',
  texture: heroAlchemistTexture,
  baseHp: 215,
  baseAtk: 16,
  affinities: {
    [GemType.Red]: 0.2, [GemType.Blue]: 0.3, [GemType.Green]: 0.3,
    [GemType.Yellow]: 0.9, [GemType.Purple]: 0.4,
  },
  power: {
    name: 'Transmutation',
    manaColor: GemType.Yellow,
    manaCost: 10,
    effectType: PowerEffectType.GEM_CONVERT,
    target: PowerTarget.ALL_ALLIES,
    convertFromColor: GemType.Purple,
    convertToColor: GemType.Yellow,
    convertCount: 5,
    manaGrant: { [GemType.Purple]: 5 },
    description: 'Transmute 5 Purple gems into Yellow, then gain 5 Purple mana!',
  },
};

// ===== Purple — 2 nouveaux =====

// Debuffeur/altérateur : affaiblit profondément une cible et la saigne.
// Choix Necromancer vs Warlock : auto-soin vs contrôle ennemi.
const WARLOCK: HeroData = {
  id: 'warlock',
  name: 'Warlock',
  texture: heroWarlockTexture,
  baseHp: 210,
  baseAtk: 19,
  affinities: {
    [GemType.Red]: 0.3, [GemType.Blue]: 0.4, [GemType.Green]: 0.1,
    [GemType.Yellow]: 0.1, [GemType.Purple]: 0.9,
  },
  power: {
    name: 'Dark Curse',
    manaColor: GemType.Purple,
    manaCost: 11,
    effectType: PowerEffectType.DEBUFF_ATK,
    target: PowerTarget.SINGLE_ENEMY,
    buffMultiplier: 0.35,
    duration: 4,
    description: 'Curse an enemy, reducing its ATK by 65% and inflicting a bleeding DoT for 4 turns!',
    secondaryEffect: {
      effectType: PowerEffectType.DAMAGE_DOT,
      atkMultiplier: 0.5,
    },
  },
};

// Tank sombre AoE : le plus tanky de la couleur, frappe tous les ennemis
// et se régénère. Troisième saveur violet distincte des deux autres.
const DEATH_KNIGHT: HeroData = {
  id: 'death_knight',
  name: 'Death Knight',
  texture: heroDeathKnightTexture,
  baseHp: 295,
  baseAtk: 17,
  affinities: {
    [GemType.Red]: 0.4, [GemType.Blue]: 0.1, [GemType.Green]: 0.1,
    [GemType.Yellow]: 0.2, [GemType.Purple]: 0.9,
  },
  power: {
    name: 'Soul Reaper',
    manaColor: GemType.Purple,
    manaCost: 16,
    effectType: PowerEffectType.DAMAGE_BURST,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 1.6,
    description: 'Reap the souls of all enemies and restore your own HP!',
    secondaryEffect: {
      effectType: PowerEffectType.HEAL,
      atkMultiplier: 0.8,
    },
  },
};

/** Full collection. Iteration order = card-pool order for random picks. */
export const HERO_CATALOG: HeroData[] = [
  // Red
  WARRIOR, BERSERKER, PYROMANCER,
  // Blue
  MAGE, CRYOMANCER, ORACLE,
  // Green
  RANGER, DRUID, ASSASSIN,
  // Yellow
  PALADIN, CLERIC, ALCHEMIST,
  // Purple
  NECROMANCER, WARLOCK, DEATH_KNIGHT,
];

// ===== Lookup helpers =====
// All consumers go through these so the catalog stays the single source
// of truth. Adding a card is one entry above; no map lives elsewhere.

const CATALOG_BY_ID: Record<string, HeroData> = (() => {
  const map: Record<string, HeroData> = {};
  for (const h of HERO_CATALOG) map[h.id] = h;
  return map;
})();

/** Look up a card by id. Returns undefined for unknown ids. */
export function getHeroData(id: string): HeroData | undefined {
  return CATALOG_BY_ID[id];
}

/**
 * Resolve a hero texture by id. Falls back to the first catalog entry so
 * renderers always have something to draw — unknown ids are a programmer
 * error (asset missing from the catalog).
 */
export function getHeroTexture(id: string): TextureAsset {
  return CATALOG_BY_ID[id]?.texture ?? HERO_CATALOG[0].texture;
}
