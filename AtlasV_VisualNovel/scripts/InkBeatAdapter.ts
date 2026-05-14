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
  type Tag,
} from './InkParser';

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

/** Walk the linear chain of beats starting from a given knot. Cached. */
export function buildBeatsFromInk(
  characterId: string,
  startNodeId: string,
): Beat[] {
  const cacheKey = characterId + '@' + startNodeId;
  const cached = BEATS_CACHE.get(cacheKey);
  if (cached) return cached;

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
    for (const stmt of knot.body) {
      if (stmt.kind === 'text') fishLines.push(stmt.text);
      else if (stmt.kind === 'choice') choiceStmts.push(stmt);
    }

    const actionEffects = {} as Record<ActionId, ActionEffect>;
    let nextNode: string | null = null;
    for (const c of choiceStmts) {
      const action = labelToActionId(c.label);
      if (action === null) continue;

      actionEffects[action] = buildActionEffect(c.tags, c.body);

      if (nextNode === null) {
        const divert = findFirstDivert(c.body);
        if (divert && divert !== 'END' && divert !== 'DONE') {
          nextNode = divert;
        }
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

  BEATS_CACHE.set(cacheKey, beats);
  return beats;
}

// ============================================================
// Helpers
// ============================================================

function buildActionEffect(tags: Tag[], body: Stmt[]): ActionEffect {
  const responseLines: string[] = [];
  for (const s of body) {
    if (s.kind === 'text') responseLines.push(s.text);
  }

  const flags = getAllTags(tags, 'flag');

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
