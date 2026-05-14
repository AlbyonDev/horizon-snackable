/**
 * InkParser — parses an Ink-flavoured narrative string into an AST.
 *
 * Standalone, zero dependencies. Produces a Story tree the runner can walk.
 *
 * Supported syntax:
 *
 *   // ----- structure -----
 *   === knot_name ===                    knot declaration (top-level node)
 *   = stitch_name                        sub-node within the current knot
 *   -> target                            divert (target = knot, knot.stitch, END, DONE)
 *
 *   // ----- choices -----
 *   * [Label] #tag:value ...             choice with metadata tags
 *   * { condition } [Label] ...          choice gated by a condition
 *
 *   // ----- text -----
 *   plain text line                      narrative line
 *   { condition } plain text line        line shown only if condition is true
 *
 *   // ----- conditional blocks -----
 *   { condition :
 *       statements
 *   - else :
 *       statements
 *   }
 *
 *   // ----- variables / flags -----
 *   ~ VAR name = value                   declare global variable (default value)
 *   ~ name = value                       assignment (executed at runtime)
 *
 *   // ----- comments -----
 *   // line comment
 *
 * Conditions use a tiny expression grammar:
 *   flag.name              true if flag.name is truthy
 *   not flag.name          negation
 *   ! flag.name            negation (alt)
 *   true | false           literal
 */

export type Value = boolean | number | string;

export type Expr =
  | { kind: 'ref'; name: string; negated: boolean }
  | { kind: 'literal'; value: Value };

export interface Tag {
  key: string;
  value: string;
}

export type Stmt =
  | { kind: 'text'; text: string; tags: Tag[]; condition?: Expr }
  | { kind: 'divert'; target: string }
  | { kind: 'assign'; name: string; value: Value }
  | { kind: 'cond'; branches: { condition?: Expr; body: Stmt[] }[] }
  | { kind: 'choice'; label: string; tags: Tag[]; condition?: Expr; body: Stmt[] };

export interface Knot {
  name: string;
  tags: Tag[];
  body: Stmt[];
  stitches: Map<string, Stmt[]>;
}

export interface Story {
  variables: Map<string, Value>;
  knots: Map<string, Knot>;
  startKnot: string | null;
}

// ============================================================
// Regex
// ============================================================

const RE_KNOT = /^===\s*(\w+)\s*===\s*(.*)$/;
const RE_STITCH = /^=\s*(\w+)\s*$/;
const RE_TILDE = /^~\s*(.+)$/;
const RE_VAR_DECL = /^VAR\s+([\w.]+)\s*=\s*(.+)$/;
const RE_PLAIN_ASSIGN = /^([\w.]+)\s*=\s*(.+)$/;
const RE_DIVERT = /^->\s*([\w.]+)\s*$/;
const RE_CHOICE = /^\*\s*(?:\{\s*([^}]+?)\s*\}\s*)?\[\s*(.+?)\s*\]\s*(.*)$/;
const RE_TAG = /#([\w-]+):([^\s#]+)/g;
const RE_BLOCK_OPEN = /^\{\s*([^}:]+?)\s*:\s*$/;
const RE_BRANCH = /^-\s*(.+?)\s*:\s*$/;
const RE_INLINE_COND = /^\{\s*([^}:]+?)\s*\}\s*(.+)$/;

// ============================================================
// Public entrypoint
// ============================================================

export function parseInk(source: string): Story {
  const story: Story = {
    variables: new Map(),
    knots: new Map(),
    startKnot: null,
  };

  let currentKnot: Knot | null = null;
  let currentStitch: string | null = null;

  // Frame stack — top-of-stack is where new statements get appended.
  // The bottom is always the current knot/stitch body when one is active.
  type Frame =
    | { kind: 'root' } // before any knot — statements ignored
    | { kind: 'knotBody'; body: Stmt[] }
    | { kind: 'choice'; stmt: Extract<Stmt, { kind: 'choice' }> }
    | {
        kind: 'cond';
        stmt: Extract<Stmt, { kind: 'cond' }>;
        currentBranch: { condition?: Expr; body: Stmt[] };
      };

  let frames: Frame[] = [{ kind: 'root' }];

  function topBody(): Stmt[] | null {
    const f = frames[frames.length - 1];
    if (f.kind === 'root') return null;
    if (f.kind === 'knotBody') return f.body;
    if (f.kind === 'choice') return f.stmt.body;
    return f.currentBranch.body;
  }

  function appendStmt(s: Stmt): void {
    const body = topBody();
    if (body) body.push(s);
  }

  function closeOpenCondBlocks(): void {
    while (frames.length > 0 && frames[frames.length - 1].kind === 'cond') {
      const f = frames.pop() as Extract<Frame, { kind: 'cond' }>;
      f.stmt.branches.push(f.currentBranch);
    }
  }

  function closeChoiceFrame(): void {
    closeOpenCondBlocks();
    if (frames.length > 0 && frames[frames.length - 1].kind === 'choice') {
      frames.pop();
    }
  }

  function resetToKnotBody(): void {
    // Pop everything down to the root, push fresh knotBody if a knot exists
    frames = [{ kind: 'root' }];
    if (currentKnot) {
      const body = currentStitch
        ? currentKnot.stitches.get(currentStitch)!
        : currentKnot.body;
      frames.push({ kind: 'knotBody', body });
    }
  }

  // ----------------------------------------------------------
  // Line loop
  // ----------------------------------------------------------

  const lines = source.split('\n');
  for (const rawLine of lines) {
    let line = rawLine;
    const c = line.indexOf('//');
    if (c >= 0) line = line.slice(0, c);
    line = line.trim();
    if (!line) continue;

    // === knot ===
    const mKnot = RE_KNOT.exec(line);
    if (mKnot) {
      const newKnot: Knot = {
        name: mKnot[1],
        tags: extractTags(mKnot[2] || ''),
        body: [],
        stitches: new Map(),
      };
      currentKnot = newKnot;
      currentStitch = null;
      story.knots.set(newKnot.name, newKnot);
      if (story.startKnot === null) story.startKnot = newKnot.name;
      resetToKnotBody();
      continue;
    }

    // = stitch
    const mStitch = RE_STITCH.exec(line);
    if (mStitch && currentKnot) {
      currentStitch = mStitch[1];
      currentKnot.stitches.set(currentStitch, []);
      resetToKnotBody();
      continue;
    }

    if (!currentKnot) continue;

    // ~ var-decl or ~ assign
    const mTilde = RE_TILDE.exec(line);
    if (mTilde) {
      const rest = mTilde[1].trim();
      const mVar = RE_VAR_DECL.exec(rest);
      if (mVar) {
        story.variables.set(mVar[1], parseScalar(mVar[2]));
        continue;
      }
      const mAssign = RE_PLAIN_ASSIGN.exec(rest);
      if (mAssign) {
        appendStmt({
          kind: 'assign',
          name: mAssign[1],
          value: parseScalar(mAssign[2]),
        });
        continue;
      }
      continue;
    }

    // } close conditional block
    if (line === '}') {
      if (
        frames.length > 0 &&
        frames[frames.length - 1].kind === 'cond'
      ) {
        const f = frames.pop() as Extract<Frame, { kind: 'cond' }>;
        f.stmt.branches.push(f.currentBranch);
      }
      continue;
    }

    // - else : or - cond :
    const mBranch = RE_BRANCH.exec(line);
    if (
      mBranch &&
      frames.length > 0 &&
      frames[frames.length - 1].kind === 'cond'
    ) {
      const f = frames[frames.length - 1] as Extract<Frame, { kind: 'cond' }>;
      f.stmt.branches.push(f.currentBranch);
      const exprRaw = mBranch[1].trim();
      f.currentBranch = {
        condition: exprRaw === 'else' ? undefined : parseExpr(exprRaw),
        body: [],
      };
      continue;
    }

    // { cond : (open conditional block on its own line)
    const mBlock = RE_BLOCK_OPEN.exec(line);
    if (mBlock) {
      const stmt: Extract<Stmt, { kind: 'cond' }> = {
        kind: 'cond',
        branches: [],
      };
      appendStmt(stmt);
      frames.push({
        kind: 'cond',
        stmt,
        currentBranch: { condition: parseExpr(mBlock[1]), body: [] },
      });
      continue;
    }

    // -> divert
    const mDivert = RE_DIVERT.exec(line);
    if (mDivert) {
      appendStmt({ kind: 'divert', target: mDivert[1] });
      continue;
    }

    // * [Label] choice
    const mChoice = RE_CHOICE.exec(line);
    if (mChoice) {
      // A new sibling choice closes the prior one (and any open cond blocks
      // inside it that the author forgot to close).
      closeChoiceFrame();

      const stmt: Extract<Stmt, { kind: 'choice' }> = {
        kind: 'choice',
        label: mChoice[2],
        condition: mChoice[1] ? parseExpr(mChoice[1]) : undefined,
        tags: extractTags(mChoice[3] || ''),
        body: [],
      };
      appendStmt(stmt);
      frames.push({ kind: 'choice', stmt });
      continue;
    }

    // Plain text (with optional inline condition prefix and optional trailing tags)
    const mInline = RE_INLINE_COND.exec(line);
    let condition: Expr | undefined;
    let textPart = line;
    if (mInline) {
      condition = parseExpr(mInline[1]);
      textPart = mInline[2];
    }
    const split = splitLineTags(textPart);
    appendStmt({ kind: 'text', text: split.text, tags: split.tags, condition });
  }

  // Auto-close any cond blocks left open at EOF.
  closeOpenCondBlocks();
  return story;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Split a text line into (text, tags) by stripping a trailing run of
 * `#key:value` tokens. Lines without such trailing tags pass through
 * unchanged. Note: a `#` inside the actual narrative is preserved as long
 * as it isn't followed by `key:value` syntax at the end of the line.
 */
function splitLineTags(line: string): { text: string; tags: Tag[] } {
  const m = /^(.*?)((?:\s+#[\w-]+:[^\s#]+)+)\s*$/.exec(line);
  if (!m) return { text: line, tags: [] };
  return { text: m[1].trimEnd(), tags: extractTags(m[2]) };
}

function extractTags(rest: string): Tag[] {
  const tags: Tag[] = [];
  const re = new RegExp(RE_TAG.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest)) !== null) {
    tags.push({ key: m[1], value: m[2] });
  }
  return tags;
}

function parseScalar(raw: string): Value {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  const n = Number(t);
  if (!Number.isNaN(n) && t !== '') return n;
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseExpr(raw: string): Expr {
  const t = raw.trim();
  if (t === 'true') return { kind: 'literal', value: true };
  if (t === 'false') return { kind: 'literal', value: false };
  if (t.startsWith('!')) {
    return { kind: 'ref', name: t.slice(1).trim(), negated: true };
  }
  if (t.startsWith('not ')) {
    return { kind: 'ref', name: t.slice(4).trim(), negated: true };
  }
  return { kind: 'ref', name: t, negated: false };
}

// ============================================================
// Tag query helpers (also re-exported for convenience)
// ============================================================

export function getTag(tags: Tag[], key: string): string | undefined {
  const t = tags.find(t => t.key === key);
  return t ? t.value : undefined;
}

export function getAllTags(tags: Tag[], key: string): string[] {
  return tags.filter(t => t.key === key).map(t => t.value);
}

export function getNumericTag(
  tags: Tag[],
  key: string,
  fallback: number = 0,
): number {
  const v = getTag(tags, key);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export function isTerminalDivert(target: string | null): boolean {
  return target === 'END' || target === 'DONE';
}
