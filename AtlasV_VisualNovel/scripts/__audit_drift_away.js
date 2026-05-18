/**
 * Drift-away reachability audit.
 *
 * For each long-arc character (Nereia, Kasha, Fugu, Sōma), compute the
 * minimum reachable affection across all paths through their story graph.
 * If the minimum is <= -10 the drift-away ending is reachable; otherwise the
 * drift-away CG is dead content.
 *
 * Simplified model:
 *   - one cast = one BFS through the beat graph from a cast's start node
 *   - per beat, the engine takes one choice; we compute the min-affection
 *     path across all 4 actions per beat
 *   - drift modifiers at cast-start are bounded by the worst-case prior drift
 *     produced by the previous cast's chosen action (we propagate a min-mood
 *     across casts)
 *   - per-action delta cap of ±30 is enforced in code, irrelevant here since
 *     no single delta exceeds ±30 anyway
 *
 * Limitations:
 *   - we don't simulate Ink `cond` branches that vary lines based on flags;
 *     all choices in a beat are considered available
 *   - we don't simulate the recipe-flag system that gates re-encounter — we
 *     assume the player can re-encounter the fish until ending_complete fires
 *
 * The simplification is conservative: it over-estimates how negative the
 * affection can go, so a "drift-away NOT reachable" result is trustworthy.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const AFFECTION_MAX = 50;
const AFFECTION_DRIFT_AWAY = -10;
const DRIFT_MOD = { Warm: 3, Charmed: 5, Troubled: 0, Wary: -2, Angry: -5 };

const LONG_ARCS = [
  { id: 'nereia', file: 'Story_Nereia.ts', charFile: 'CharacterData_Nereia.ts' },
  { id: 'kasha',  file: 'Story_Kasha.ts',  charFile: 'CharacterData_Kasha.ts' },
  { id: 'fugu',   file: 'Story_Fugu.ts',   charFile: 'CharacterData_Fugu.ts' },
  { id: 'soma',   file: 'Story_Soma.ts',   charFile: 'CharacterData_Soma.ts' },
];

const SCRIPTS_DIR = path.resolve(__dirname);

function extractInk(tsSource) {
  const m = tsSource.match(/_STORY\s*:\s*string\s*=\s*`([\s\S]*?)`/);
  if (!m) throw new Error('No _STORY template literal');
  return m[1];
}

function findCastStarts(tsSource) {
  const starts = [];
  const re = /start:\s*['"]([\w]+)['"]/g;
  let m;
  while ((m = re.exec(tsSource)) !== null) starts.push(m[1]);
  return starts;
}

/**
 * Parse each knot body into { choices: [{label, delta, drift, divert}] }.
 * `delta` is the chosen action's affection delta. `drift` is the drift name
 * set on the choice (e.g. 'SCARED'). `divert` is the target beat id or 'END'.
 */
function parseKnots(ink) {
  const knots = new Map();
  const lines = ink.split('\n');
  let current = null, bodyLines = [];
  const flush = () => {
    if (!current) return;
    const choices = [];
    let pendingChoice = null;
    for (const raw of bodyLines) {
      const stripped = (() => {
        const ci = raw.indexOf('//');
        return ci >= 0 ? raw.slice(0, ci) : raw;
      })();
      const choiceMatch = stripped.match(/^\s*\*\s*(?:\{[^}]*\})?\s*\[([A-Z]+)\]([^\n]*)/);
      if (choiceMatch) {
        if (pendingChoice) choices.push(pendingChoice);
        const tags = choiceMatch[2];
        const deltaM = tags.match(/#delta:(-?\d+)/);
        const driftM = tags.match(/#drift:(\w+)/);
        pendingChoice = {
          label: choiceMatch[1],
          delta: deltaM ? parseInt(deltaM[1], 10) : 0,
          drift: driftM ? driftM[1] : null,
          divert: null,
        };
        continue;
      }
      const divertM = stripped.match(/->\s*([A-Za-z_][\w.]*)/);
      if (divertM && pendingChoice && pendingChoice.divert === null) {
        pendingChoice.divert = divertM[1];
      }
    }
    if (pendingChoice) choices.push(pendingChoice);
    knots.set(current, { choices });
  };
  for (const l of lines) {
    const km = l.match(/^===\s*([A-Za-z_]\w*)\s*===/);
    if (km) { flush(); current = km[1]; bodyLines = []; }
    else if (current) bodyLines.push(l);
  }
  flush();
  return knots;
}

/**
 * For each terminal exit point of the cast (a choice that ends with `-> END`),
 * compute the affection at that exit AND the drift state that exit set.
 * Returns an array of { exitAffection, exitDrift } across all reachable paths.
 *
 * Also returns the global min affection observed mid-cast (which the engine
 * checks against in enterDeparture / enterInkDeparture — applied at cast end
 * via the chosen path's accumulated affection).
 */
function simulateCast(knots, startNode, entryAffection) {
  if (!knots.has(startNode)) return { exits: [{ exitAffection: entryAffection, exitDrift: null }], globalMin: entryAffection };
  const exits = [];
  let globalMin = Math.max(entryAffection, AFFECTION_DRIFT_AWAY);

  function walk(beatId, currentAffection, visited) {
    if (visited.has(beatId)) return; // cycle guard
    visited = new Set(visited); visited.add(beatId);
    const node = knots.get(beatId);
    if (!node || node.choices.length === 0) {
      // dead end → cast ends here
      exits.push({ exitAffection: currentAffection, exitDrift: null });
      return;
    }
    for (const c of node.choices) {
      const capped = Math.max(-30, Math.min(30, c.delta));
      let after = currentAffection + capped;
      after = Math.max(AFFECTION_DRIFT_AWAY, Math.min(AFFECTION_MAX, after));
      if (after < globalMin) globalMin = after;
      const target = c.divert;
      if (!target || target === 'END' || target === 'DONE') {
        exits.push({ exitAffection: after, exitDrift: c.drift });
        continue;
      }
      const knotPart = target.includes('.') ? target.split('.')[0] : target;
      if (!knots.has(knotPart)) {
        exits.push({ exitAffection: after, exitDrift: c.drift });
        continue;
      }
      walk(knotPart, after, visited);
    }
  }
  walk(startNode, entryAffection, new Set());
  return { exits, globalMin };
}

// ============================================================

console.log('Drift-away reachability audit');
console.log('Walks each long-arc story branching over all possible choices.');
console.log('Drift-away fires when affection <= -10 AT CAST EXIT (enterDeparture / enterInkDeparture).\n');

for (const arc of LONG_ARCS) {
  const storyTs = fs.readFileSync(path.join(SCRIPTS_DIR, arc.file), 'utf8');
  const charTs = fs.readFileSync(path.join(SCRIPTS_DIR, arc.charFile), 'utf8');
  const ink = extractInk(storyTs);
  const knots = parseKnots(ink);
  const starts = findCastStarts(charTs);
  const { globalExitMin, globalMidMin, firstNegativeCast } = simulateArcVerbose(knots, starts);
  const reachable = globalExitMin <= AFFECTION_DRIFT_AWAY;
  const status = reachable ? 'REACHABLE' : 'UNREACHABLE';
  const where = firstNegativeCast ? ` (first reaches ≤-10 by cast '${firstNegativeCast}')` : '';
  console.log(`[${arc.id}] min exit-affection: ${globalExitMin}, min mid-cast: ${globalMidMin} — drift-away ${status}${where}`);
}

/** Same as simulateArc but also reports the first cast id where exit hits <=-10. */
function simulateArcVerbose(knots, castStarts) {
  let stateSet = [{ affection: 0, drift: null }];
  let globalExitMin = 0;
  let globalMidMin = 0;
  let firstNegativeCast = null;
  for (const start of castStarts) {
    const nextStateSet = [];
    for (const s of stateSet) {
      const mod = (s.drift && DRIFT_MOD[s.drift] !== undefined) ? DRIFT_MOD[s.drift] : 0;
      const entry = Math.max(AFFECTION_DRIFT_AWAY, Math.min(AFFECTION_MAX, s.affection + mod));
      const { exits, globalMin } = simulateCast(knots, start, entry);
      if (globalMin < globalMidMin) globalMidMin = globalMin;
      for (const e of exits) {
        if (e.exitAffection < globalExitMin) globalExitMin = e.exitAffection;
        if (e.exitAffection <= AFFECTION_DRIFT_AWAY && !firstNegativeCast) firstNegativeCast = start;
        nextStateSet.push({ affection: e.exitAffection, drift: e.exitDrift });
      }
    }
    const seen = new Set();
    stateSet = [];
    for (const s of nextStateSet) {
      const k = `${s.affection}|${s.drift ?? ''}`;
      if (!seen.has(k)) { seen.add(k); stateSet.push(s); }
    }
  }
  return { globalExitMin, globalMidMin, firstNegativeCast };
}
