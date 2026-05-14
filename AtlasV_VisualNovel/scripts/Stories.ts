/**
 * Stories — central registry for parsed Ink stories.
 *
 * Imports each character's Ink source string, parses on demand, caches the
 * result. Provides factory helpers and validation utilities the game
 * runtime can call without re-parsing.
 *
 * Public surface:
 *   getStory(characterId)        → parsed Story
 *   createRunner(characterId, ?) → InkRunner positioned at a node
 *   listCharacters()             → list of registered character ids
 *   getNodeIds(characterId)      → all knot ids in that character's story
 *   validateStory(characterId)   → cross-checks every divert target
 */

import { parseInk, type Story, type Stmt } from './InkParser';
import { InkRunner } from './InkRunner';
import { KASHA_STORY } from './Story_Kasha';
import { FUGU_STORY } from './Story_Fugu';
import { NEREIA_STORY } from './Story_Nereia';
import { CATFISH_STORY } from './Story_Catfish';
import { CARP_STORY } from './Story_Carp';
import { PERCH_STORY } from './Story_Perch';
import { EEL_STORY } from './Story_Eel';
import { PIKE_STORY } from './Story_Pike';
import { TROUT_STORY } from './Story_Trout';

// ============================================================
// Source registry
// ============================================================

const STORY_SOURCES: Record<string, string> = {
  kasha: KASHA_STORY,
  fugu: FUGU_STORY,
  nereia: NEREIA_STORY,
  catfish: CATFISH_STORY,
  carp: CARP_STORY,
  perch: PERCH_STORY,
  eel: EEL_STORY,
  pike: PIKE_STORY,
  trout: TROUT_STORY,
};

const STORY_CACHE: Record<string, Story> = {};

// ============================================================
// Public API
// ============================================================

export function getStory(characterId: string): Story {
  const cached = STORY_CACHE[characterId];
  if (cached) return cached;
  const src = STORY_SOURCES[characterId];
  if (!src) {
    throw new Error(`[Stories] No story registered for character '${characterId}'`);
  }
  const parsed = parseInk(src);
  STORY_CACHE[characterId] = parsed;
  return parsed;
}

export function createRunner(characterId: string, startNode?: string): InkRunner {
  const story = getStory(characterId);
  const runner = new InkRunner(story);
  const start = startNode ?? story.startKnot;
  if (start) runner.start(start);
  return runner;
}

export function listCharacters(): string[] {
  return Object.keys(STORY_SOURCES);
}

export function getNodeIds(characterId: string): string[] {
  return Array.from(getStory(characterId).knots.keys());
}

// ============================================================
// Validation — cross-check every divert against the node graph
// ============================================================

export interface ValidationResult {
  ok: boolean;
  characterId: string;
  knotCount: number;
  divertCount: number;
  missingTargets: string[];
}

export function validateStory(characterId: string): ValidationResult {
  const story = getStory(characterId);
  const targets: string[] = [];

  for (const knot of story.knots.values()) {
    collectDiverts(knot.body, targets);
    knot.stitches.forEach(stitchBody => collectDiverts(stitchBody, targets));
  }

  const missing: string[] = [];
  for (const t of targets) {
    if (t === 'END' || t === 'DONE') continue;
    if (!resolveTarget(story, t)) missing.push(t);
  }

  return {
    ok: missing.length === 0,
    characterId,
    knotCount: story.knots.size,
    divertCount: targets.length,
    missingTargets: dedup(missing),
  };
}

export function validateAll(): ValidationResult[] {
  return listCharacters().map(validateStory);
}

// ============================================================
// Internals
// ============================================================

function collectDiverts(body: Stmt[], out: string[]): void {
  for (const stmt of body) {
    switch (stmt.kind) {
      case 'divert':
        out.push(stmt.target);
        break;
      case 'choice':
        collectDiverts(stmt.body, out);
        break;
      case 'cond':
        for (const branch of stmt.branches) collectDiverts(branch.body, out);
        break;
    }
  }
}

function resolveTarget(story: Story, target: string): boolean {
  const dotIdx = target.indexOf('.');
  if (dotIdx >= 0) {
    const knotName = target.slice(0, dotIdx);
    const stitchName = target.slice(dotIdx + 1);
    const knot = story.knots.get(knotName);
    return !!(knot && knot.stitches.has(stitchName));
  }
  return story.knots.has(target);
}

function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}
