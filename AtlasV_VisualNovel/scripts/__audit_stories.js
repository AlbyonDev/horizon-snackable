/**
 * Standalone audit: cross-checks each Story_*.ts against its CharacterData_*.ts
 * to find:
 *   1. broken diverts (`-> target` where `target` is not a declared knot or END/DONE)
 *   2. orphan knots (declared but unreachable from any cast start + the *_entry knot)
 *   3. cast starts referenced by CharacterData but missing in the Story
 *
 * Pure Node, no deps. Reads .ts source as text, extracts the template-literal
 * Ink string, then runs a lightweight regex pass to enumerate knots and
 * diverts. Doesn't evaluate conditions — orphan detection is "could-this-be-
 * reached at all", which is what we want for an authoring sanity check.
 *
 * Run:  node scripts/__audit_stories.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname);

// Characters that are actually wired up (have a CharacterData file).
const CHARACTERS = ['nereia', 'kasha', 'fugu', 'soma', 'catfish', 'carp', 'perch', 'eel', 'pike', 'trout'];

/** Extract the Ink source string from a Story_*.ts file.
 *  The file exports `<NAME>_STORY: string = \`...\``. We anchor on that
 *  pattern (not just any backtick) because JSDoc comments above the export
 *  sometimes contain stray backticks. */
function extractInk(tsSource) {
  const m = tsSource.match(/_STORY\s*:\s*string\s*=\s*`([\s\S]*?)`/);
  if (!m) throw new Error('No _STORY template literal found');
  return m[1];
}

/** Parse out every `=== knot_name ===` declaration. */
function findKnots(ink) {
  const knots = new Set();
  const re = /^===\s*([A-Za-z_][\w]*)\s*===/gm;
  let m;
  while ((m = re.exec(ink)) !== null) {
    knots.add(m[1]);
  }
  return knots;
}

/** Parse out every `-> target` divert. Strips line comments first. */
function findDiverts(ink) {
  const cleaned = ink
    .split('\n')
    .map(line => {
      const ci = line.indexOf('//');
      return ci >= 0 ? line.slice(0, ci) : line;
    })
    .join('\n');
  const diverts = [];
  const re = /->\s*([A-Za-z_][\w.]*)/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    diverts.push(m[1]);
  }
  return diverts;
}

/** Map each knot id → outgoing divert targets, used for BFS. */
function buildDivertMap(ink, knots) {
  // Split ink into per-knot bodies.
  const map = new Map();
  for (const k of knots) map.set(k, new Set());
  const lines = ink.split('\n');
  let current = null;
  for (const raw of lines) {
    const stripped = (() => {
      const ci = raw.indexOf('//');
      return ci >= 0 ? raw.slice(0, ci) : raw;
    })();
    const knotMatch = stripped.match(/^===\s*([A-Za-z_][\w]*)\s*===/);
    if (knotMatch) {
      current = knotMatch[1];
      continue;
    }
    if (!current) continue;
    const re = /->\s*([A-Za-z_][\w.]*)/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
      map.get(current).add(m[1]);
    }
  }
  return map;
}

/** Extract every cast start id referenced by a CharacterData_*.ts file.
 *  Two authoring patterns are used:
 *    - long arcs: a CAST_DEFS array with `{ start: 'id', name: '...' }` entries
 *    - NPCs: a direct `inkCast(CHARACTER_ID, 'id', ...)` call
 *  Both shapes are matched. */
function findCastStarts(tsSource) {
  const starts = [];
  const reA = /start:\s*['"]([\w]+)['"]/g;
  let m;
  while ((m = reA.exec(tsSource)) !== null) starts.push(m[1]);
  const reB = /inkCast\s*\([^,]+,\s*['"]([\w]+)['"]/g;
  while ((m = reB.exec(tsSource)) !== null) starts.push(m[1]);
  return starts;
}

/** BFS from a set of roots, following diverts. Returns the set of reached knots. */
function bfs(roots, divertMap) {
  const reached = new Set();
  const queue = [...roots];
  while (queue.length > 0) {
    const id = queue.shift();
    if (reached.has(id)) continue;
    if (id === 'END' || id === 'DONE') continue;
    if (!divertMap.has(id)) continue; // unknown target — handled by broken-divert check
    reached.add(id);
    for (const target of divertMap.get(id)) {
      const knotPart = target.includes('.') ? target.split('.')[0] : target;
      queue.push(knotPart);
    }
  }
  return reached;
}

// ============================================================
// Main
// ============================================================

let totalIssues = 0;

for (const charId of CHARACTERS) {
  const cap = charId.charAt(0).toUpperCase() + charId.slice(1);
  const storyPath = path.join(SCRIPTS_DIR, `Story_${cap}.ts`);
  const charPath = path.join(SCRIPTS_DIR, `CharacterData_${cap}.ts`);

  if (!fs.existsSync(storyPath) || !fs.existsSync(charPath)) {
    console.log(`[${charId}] SKIP — missing Story or CharacterData file`);
    continue;
  }

  const storyTs = fs.readFileSync(storyPath, 'utf8');
  const charTs = fs.readFileSync(charPath, 'utf8');
  const ink = extractInk(storyTs);
  const knots = findKnots(ink);
  const divertMap = buildDivertMap(ink, knots);
  const allDiverts = findDiverts(ink);
  const castStarts = findCastStarts(charTs);

  const issues = [];

  // (1) Cast starts that don't exist in the Story
  for (const start of castStarts) {
    if (!knots.has(start)) {
      issues.push(`  ✗ cast start '${start}' (referenced by CharacterData) — knot does NOT exist`);
    }
  }

  // (2) Broken diverts (target not declared, not END/DONE)
  const seenBroken = new Set();
  for (const target of allDiverts) {
    const knotPart = target.includes('.') ? target.split('.')[0] : target;
    if (knotPart === 'END' || knotPart === 'DONE') continue;
    if (!knots.has(knotPart)) {
      const key = target;
      if (!seenBroken.has(key)) {
        seenBroken.add(key);
        issues.push(`  ✗ broken divert '-> ${target}' — target not declared`);
      }
    }
  }

  // (3) Orphan knots — declared but unreachable from cast starts + entry knot
  const roots = new Set(castStarts);
  const entryKnot = `${charId}_entry`;
  if (knots.has(entryKnot)) roots.add(entryKnot);
  const reached = bfs(roots, divertMap);
  const orphans = [...knots].filter(k => !reached.has(k)).sort();
  for (const o of orphans) {
    issues.push(`  ⚠ orphan knot '${o}' — declared but not reachable from any cast start or entry`);
  }

  if (issues.length === 0) {
    console.log(`[${charId}] OK — ${knots.size} knots, ${castStarts.length} cast(s), 0 issues`);
  } else {
    console.log(`[${charId}] ${issues.length} issue(s) — ${knots.size} knots, ${castStarts.length} cast(s)`);
    for (const i of issues) console.log(i);
    totalIssues += issues.length;
  }
}

console.log('');
console.log(totalIssues === 0
  ? `✓ All stories OK across ${CHARACTERS.length} characters.`
  : `✗ ${totalIssues} total issues found.`);
process.exit(totalIssues === 0 ? 0 : 1);
