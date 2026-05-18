/**
 * InkBeatAdapter — converts an Ink story into the legacy Beat[] / CastData
 * structures consumed by FloaterGame.
 *
 * Phase A integration: keeps the existing engine untouched while moving the
 * dialogue source-of-truth into the .ink strings. Walks a chain of knots
 * starting at a given beat, stops at -> END, produces one Beat per knot.
 *
 * Limitations (acceptable for Phase A — existing content is linear):
 *   - Conditional choices and conditional lines are flattened away
 *   - Per-line tags (#icon on a text line) are dropped — engine doesn't read them
 *   - Branching diverts (different choices going to different beats) are not
 *     preserved; the adapter follows the first divert it finds in any choice
 *
 * For real branching support, switch to direct InkRunner integration (Phase B).
 */

import type { CastData, Beat, ActionEffect } from './Types';
import { ExpressionState, DriftState, EmotionIconType } from './Types';
import { ActionId } from './Constants';
import { getStory } from './Stories';
import {
  getTag,
  getAllTags,
  getNumericTag,
  type Stmt,
  type Expr,
  type Tag,
} from './InkParser';
import { FlagSystem } from './FlagSystem';

// ============================================================
// Public entrypoints
// ============================================================

const BEATS_CACHE = new Map<string, Beat[]>();
const CAST_CACHE = new Map<string, CastData>();

/** Build a CastData from an Ink starting node. Cached per (characterId, id). */
export function inkCast(
  characterId: string,
  startNodeId: string,
  name: string,
  departures: CastData['departures'] = {},
  idOverride?: string,
): CastData {
  const id = idOverride ?? deriveCastId(startNodeId);
  const cacheKey = characterId + '@' + id;
  const cached = CAST_CACHE.get(cacheKey);
  if (cached) return cached;

  const cast: CastData = {
    id,
    name,
    beats: buildBeatsFromInk(characterId, startNodeId),
    departures,
  };
  CAST_CACHE.set(cacheKey, cast);
  return cast;
}

/**
 * Resolve which cast knot a fish should dispatch to, given the current flag
 * state. Looks up the fish's entry knot (`<fishId>_entry`) and follows the
 * first matching divert inside it. The entry knot is *not* cached because its
 * resolution depends on runtime flags; the resulting cast chain still uses
 * the regular `buildBeatsFromInk` cache.
 *
 * Returns null if the entry knot is missing or no divert matches.
 */
export function resolveFishEntryKnot(
  characterId: string,
  flags: FlagSystem,
): string | null {
  const story = getStory(characterId);
  const entryKnotId = `${characterId}_entry`;
  const entry = story.knots.get(entryKnotId);
  if (!entry) {
    console.warn(`[InkBeatAdapter] Missing entry knot '${entryKnotId}' for '${characterId}'`);
    return null;
  }
  return resolveEntryDivert(entry.body, flags);
}

/** Walk the linear chain of beats starting from a given knot.
 *  Cached unless `flags` is supplied — flags enable bridge dialogue
 *  evaluation, which depends on runtime state and must rebuild each cast. */
export function buildBeatsFromInk(
  characterId: string,
  startNodeId: string,
  flags?: FlagSystem,
): Beat[] {
  const useCache = flags === undefined;
  const cacheKey = characterId + '@' + startNodeId;
  if (useCache) {
    const cached = BEATS_CACHE.get(cacheKey);
    if (cached) return cached;
  }

  const story = getStory(characterId);
  const beats: Beat[] = [];
  const seen = new Set<string>();

  let nodeId: string | null = startNodeId;
  while (nodeId && nodeId !== 'END' && nodeId !== 'DONE' && !seen.has(nodeId)) {
    seen.add(nodeId);
    const knot = story.knots.get(nodeId);
    if (!knot) {
      console.warn(`[InkBeatAdapter] Missing knot '${nodeId}' for '${characterId}'`);
      break;
    }

    const fishLines: string[] = [];
    const choiceStmts: Extract<Stmt, { kind: 'choice' }>[] = [];
    collectBeatBody(knot.body, fishLines, choiceStmts, flags);

    const actionEffects = {} as Record<ActionId, ActionEffect>;
    let nextNode: string | null = null;
    for (const c of choiceStmts) {
      const action = labelToActionId(c.label);
      if (action === null) continue;

      const choiceDivert = findFirstDivert(c.body);
      const isTerminal = choiceDivert === null || choiceDivert === 'END' || choiceDivert === 'DONE';
      actionEffects[action] = buildActionEffect(c.tags, c.body, c.intent, isTerminal);

      if (nextNode === null && !isTerminal && choiceDivert) {
        nextNode = choiceDivert;
      }
    }

    const silentSec = getNumericTag(knot.tags, 'silent', 0);
    const beat: Beat = {
      beatId: knot.name,
      fishLines,
      actionEffects,
      seen: false,
    };
    if (silentSec > 0) {
      beat.silentBeat = true;
      beat.silentBeatDurationSec = silentSec;
    }

    beats.push(beat);
    nodeId = nextNode;
  }

  if (useCache) BEATS_CACHE.set(cacheKey, beats);
  return beats;
}

/** Recursively collect text + choices from a body, evaluating `cond` blocks
 *  against the given flags. When `flags` is omitted, `cond` blocks are
 *  skipped entirely (legacy behavior — bridges won't render). */
function collectBeatBody(
  body: Stmt[],
  fishLines: string[],
  choiceStmts: Extract<Stmt, { kind: 'choice' }>[],
  flags: FlagSystem | undefined,
): void {
  for (const stmt of body) {
    if (stmt.kind === 'text') {
      fishLines.push(stmt.text);
    } else if (stmt.kind === 'choice') {
      choiceStmts.push(stmt);
    } else if (stmt.kind === 'cond' && flags) {
      // Walk branches in order; recurse into the first whose condition holds.
      for (const branch of stmt.branches) {
        if (evalExpr(branch.condition, flags)) {
          collectBeatBody(branch.body, fishLines, choiceStmts, flags);
          break;
        }
      }
    }
    // `assign`, `divert`, and unguarded `cond` (no flags) are intentionally
    // ignored at beat-body level — diverts are handled per-choice.
  }
}

// ============================================================
// Helpers
// ============================================================

function buildActionEffect(tags: Tag[], body: Stmt[], intent?: string, terminal?: boolean): ActionEffect {
  const responseLines: string[] = [];
  for (const s of body) {
    if (s.kind === 'text') responseLines.push(s.text);
  }

  const flags = getAllTags(tags, 'flag');
  const flagsToClear = getAllTags(tags, 'clear-flag');
  const flagsToDisable = getAllTags(tags, 'disable-flag');

  const effect: ActionEffect = {
    affectionDelta: getNumericTag(tags, 'delta', 0),
    resultExpression: parseExpression(getTag(tags, 'expr')) ?? ExpressionState.Neutral,
    responseLines,
  };

  const drift = parseDrift(getTag(tags, 'drift'));
  if (drift !== undefined) effect.resultDrift = drift;

  const icon = parseIcon(getTag(tags, 'icon'));
  if (icon !== undefined) effect.emotionIcon = icon;

  if (flags.length > 0) effect.flagsToSet = flags;
  if (flagsToClear.length > 0) effect.flagsToClear = flagsToClear;
  if (flagsToDisable.length > 0) effect.flagsToDisable = flagsToDisable;

  if (intent !== undefined && intent.length > 0) effect.intent = intent;
  if (terminal) effect.terminal = true;

  return effect;
}

function findFirstDivert(body: Stmt[]): string | null {
  for (const s of body) {
    if (s.kind === 'divert') return s.target;
    if (s.kind === 'cond') {
      for (const branch of s.branches) {
        const inner = findFirstDivert(branch.body);
        if (inner) return inner;
      }
    }
  }
  return null;
}

/** Evaluate a simple Ink Expr against the FlagSystem. */
function evalExpr(expr: Expr | undefined, flags: FlagSystem): boolean {
  if (!expr) return true; // `else` branch → no condition → always matches
  if (expr.kind === 'literal') return Boolean(expr.value);
  if (expr.kind === 'eq') {
    // Compare raw flag value to literal. Missing flags default to `false`,
    // so `flag == "WARY"` against an unset flag is false.
    const lhs = flags.get(expr.name);
    const eq = lhs === expr.value;
    return expr.negated ? !eq : eq;
  }
  // expr.kind === 'ref'
  const value = flags.check(expr.name);
  return expr.negated ? !value : value;
}

/**
 * Walk a knot body and return the first divert reachable given the current
 * flag state. Unlike `findFirstDivert`, this evaluates `cond` branches
 * properly: it enters only the first matching branch (the `else` branch
 * matches if no condition holds).
 *
 * Used by the entry-knot dispatcher so a knot like `fugu_entry` can route
 * to different cast knots based on `from.fugu.<recipeId>` flags.
 *
 * Returns null if no divert is found (defensive — shouldn't happen by design).
 */
export function resolveEntryDivert(body: Stmt[], flags: FlagSystem): string | null {
  for (const s of body) {
    if (s.kind === 'divert') return s.target;
    if (s.kind === 'assign') {
      // Apply assignments inline (used by entry knots to clear from.* signals).
      if (typeof s.value === 'boolean' || typeof s.value === 'number') {
        flags.set(s.name, s.value);
      } else {
        // String values aren't expected for boolean flags; ignore quietly.
      }
      continue;
    }
    if (s.kind === 'cond') {
      for (const branch of s.branches) {
        if (evalExpr(branch.condition, flags)) {
          const inner = resolveEntryDivert(branch.body, flags);
          if (inner) return inner;
          break; // matched branch had no divert → fall through to next stmt
        }
      }
    }
  }
  return null;
}

function deriveCastId(startNodeId: string): string {
  // 'kasha_t1_c1_b1' → 'kasha_t1_c1'
  const m = /^(.+)_b\d+$/.exec(startNodeId);
  return m ? m[1] : startNodeId;
}

function labelToActionId(label: string): ActionId | null {
  switch (label.toUpperCase()) {
    case 'WAIT':   return ActionId.Wait;
    case 'TWITCH': return ActionId.Twitch;
    case 'DRIFT':  return ActionId.Drift;
    case 'REEL':   return ActionId.Reel;
    default:       return null;
  }
}

function parseExpression(s?: string): ExpressionState | undefined {
  if (!s) return undefined;
  switch (s.toLowerCase()) {
    case 'neutral': return ExpressionState.Neutral;
    case 'curious': return ExpressionState.Curious;
    case 'warm':    return ExpressionState.Warm;
    case 'alarmed': return ExpressionState.Alarmed;
    default:        return undefined;
  }
}

function parseIcon(s?: string): EmotionIconType | undefined {
  if (!s) return undefined;
  const lower = s.toLowerCase();
  for (const v of Object.values(EmotionIconType)) {
    if (v === lower) return v as EmotionIconType;
  }
  return undefined;
}

function parseDrift(s?: string): DriftState | undefined {
  if (!s) return undefined;
  const upper = s.toUpperCase();
  switch (upper) {
    case 'NONE':         return DriftState.None;
    case 'WARM':         return DriftState.Warm;
    case 'TROUBLED':     return DriftState.Troubled;
    case 'WARY':         return DriftState.Wary;
    case 'CHARMED':      return DriftState.Charmed;
    case 'SCARED':       return DriftState.Scared;
    case 'ANGRY':        return DriftState.Angry;
    case 'SATISFIED':    return DriftState.Satisfied;
    case 'NEUTRAL':      return DriftState.Neutral;
    case 'INTRIGUED':    return DriftState.Intrigued;
    case 'GUARDED':      return DriftState.Guarded;
    case 'RAW':          return DriftState.Raw;
    case 'OPENED':       return DriftState.Opened;
    case 'DESTABILISED': return DriftState.Destabilised;
    default:             return undefined;
  }
}
