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
  // The entry knot is always a dispatcher (no text/choices), so resolve its
  // divert first, then keep resolving through any further dispatcher knots.
  const firstHop = resolveEntryDivert(entry.body, flags);
  if (!firstHop) return null;
  return resolveBeatKnot(characterId, firstHop, flags);
}

/** Build the graph of beats reachable from a given knot via BFS.
 *
 *  Each choice's `-> target` is preserved as `actionEffect.nextBeatId`, so a
 *  beat with WAIT -> branch_a and TWITCH -> branch_b will reach both. Multiple
 *  choices targeting the same beat are deduplicated (the beat is emitted
 *  exactly once). Beats referenced by `-> END` / `-> DONE` produce a
 *  `terminal` ActionEffect with no `nextBeatId`.
 *
 *  The returned array's order is "BFS discovery order from startNode". The
 *  engine navigates by id via `nextBeatId`, not by index, so the order only
 *  matters as a legacy fallback when `nextBeatId` is absent.
 *
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
  const emitted = new Set<string>();
  const queue: string[] = [startNodeId];

  while (queue.length > 0) {
    const rawNodeId = queue.shift()!;
    if (rawNodeId === 'END' || rawNodeId === 'DONE') continue;
    // If flags are provided, resolve dispatcher knots transparently — the
    // emitted beat is the first knot with playable content downstream.
    const nodeId = flags ? resolveBeatKnot(characterId, rawNodeId, flags) : rawNodeId;
    if (nodeId === 'END' || nodeId === 'DONE') continue;
    if (emitted.has(nodeId)) continue;
    emitted.add(nodeId);

    const knot = story.knots.get(nodeId);
    if (!knot) {
      console.warn(`[InkBeatAdapter] Missing knot '${nodeId}' for '${characterId}'`);
      continue;
    }

    const fishLines: string[] = [];
    const choiceStmts: Extract<Stmt, { kind: 'choice' }>[] = [];
    collectBeatBody(knot.body, fishLines, choiceStmts, flags);

    const actionEffects = {} as Record<ActionId, ActionEffect>;
    for (const c of choiceStmts) {
      const action = labelToActionId(c.label);
      if (action === null) continue;

      const choiceDivertRaw = findFirstDivert(c.body);
      const choiceDivert = (flags && choiceDivertRaw && choiceDivertRaw !== 'END' && choiceDivertRaw !== 'DONE')
        ? resolveBeatKnot(characterId, choiceDivertRaw, flags)
        : choiceDivertRaw;
      const isTerminal = choiceDivert === null || choiceDivert === 'END' || choiceDivert === 'DONE';
      const effect = buildActionEffect(c.tags, c.body, c.intent, isTerminal);
      if (!isTerminal && choiceDivert) {
        effect.nextBeatId = choiceDivert;
        queue.push(choiceDivert);
      }
      actionEffects[action] = effect;
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

  // `#unlock-cg:<cgId>` — generic CG unlock, decoupled from endings.
  const cgsToUnlock = getAllTags(tags, 'unlock-cg');
  if (cgsToUnlock.length > 0) effect.cgsToUnlock = cgsToUnlock;

  // `#ending:<id>` — Ink-authored ending dispatch. The id is free-form;
  // the engine looks up CharacterConfig.endings[id] for the optional epitaph.
  const endingTag = getTag(tags, 'ending');
  if (endingTag !== undefined && endingTag.length > 0) {
    effect.triggerEnding = endingTag;
  }

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
 * Resolve a node id to the first knot that actually has playable content
 * (text or choices). Knots that only contain diverts (and optionally assigns
 * and cond blocks resolving to diverts) are treated as dispatchers: this
 * function follows them transparently. A short hop limit prevents accidental
 * loops in author-written dispatch chains.
 */
const RESOLVE_HOP_LIMIT = 16;

export function resolveBeatKnot(
  characterId: string,
  startNodeId: string,
  flags: FlagSystem,
): string {
  const story = getStory(characterId);
  let current = startNodeId;
  const visited = new Set<string>();
  for (let hop = 0; hop < RESOLVE_HOP_LIMIT; hop++) {
    if (current === 'END' || current === 'DONE') return current;
    if (visited.has(current)) {
      console.warn(`[InkBeatAdapter] Dispatcher loop detected for '${characterId}' at '${current}'`);
      return current;
    }
    visited.add(current);

    const knot = story.knots.get(current);
    if (!knot) return current; // missing — caller will warn

    // Walk body: evaluate cond branches, apply assigns, find first effective
    // divert. If we encounter any text or choice along the way, this is a
    // beat — stop here.
    const fishLines: string[] = [];
    const choiceStmts: Extract<Stmt, { kind: 'choice' }>[] = [];
    collectBeatBody(knot.body, fishLines, choiceStmts, flags);
    if (fishLines.length > 0 || choiceStmts.length > 0) return current;

    const divert = resolveEntryDivert(knot.body, flags);
    if (!divert) return current; // no content, no divert — let caller render the empty beat (warn surface)
    current = divert;
  }
  console.warn(`[InkBeatAdapter] Dispatcher hop limit reached for '${characterId}' starting at '${startNodeId}'`);
  return current;
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
