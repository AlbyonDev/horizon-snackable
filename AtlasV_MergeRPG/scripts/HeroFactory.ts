/**
 * HeroFactory
 *
 * Builds runtime Hero instances from static HeroData catalog entries.
 * Designers edit HERO_CATALOG (HeroCatalog.ts) — this file just
 * instantiates fresh stateful copies (currentHp, statusEffects) and
 * exposes roster-picking helpers used by TeamState and the (future)
 * deck/team-selection UI.
 */
import type { Hero } from './TeamTypes';
import {
  HERO_CATALOG,
  getHeroData,
  type HeroData,
} from './HeroCatalog';

/** Build a fresh Hero instance from a catalog entry. */
export function createHero(data: HeroData): Hero {
  return {
    id: data.id,
    name: data.name,
    maxHp: data.baseHp,
    currentHp: data.baseHp,
    atk: data.baseAtk,
    affinities: data.affinities,
    power: data.power,
    statusEffects: [],
  };
}

/**
 * Build a hero by catalog id (e.g. 'warrior'). Returns undefined if the
 * id isn't in the catalog. Use this for deck-loading / team-selection.
 */
export function createHeroById(id: string): Hero | undefined {
  const data = getHeroData(id);
  return data ? createHero(data) : undefined;
}

/** Full roster of every available hero card. */
export function allHeroes(): Hero[] {
  return HERO_CATALOG.map(createHero);
}

/** Pick `count` random distinct heroes from the catalog (Fisher-Yates). */
export function pickRandomHeroes(count: number): Hero[] {
  const copy = allHeroes();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
