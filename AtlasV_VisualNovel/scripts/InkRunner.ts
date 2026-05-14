/**
 * InkRunner — interprets the AST produced by InkParser.
 *
 * Standalone, zero dependencies. Walks the Story tree statement by statement,
 * maintaining flag state, evaluating conditions, and exposing choices when
 * they're reached.
 *
 * Game loop usage:
 *
 *   const story = parseInk(KASHA_STORY);
 *   const runner = new InkRunner(story);
 *   runner.start('kasha_t1_c1_b1');
 *
 *   while (true) {
 *     const r = runner.step();
 *     for (const line of r.lines) {
 *       displayText(line.text);
 *       reactToLineTags(line.tags); // icon, expr, drift, anim per line
 *     }
 *     if (r.outcome.kind === 'end') { handleEnd(r.outcome.target); break; }
 *     if (r.outcome.kind === 'choices') {
 *       const idx = await ask(r.outcome.choices);
 *       runner.choose(idx);
 *       reactToChoiceTags(runner.lastChoiceTags); // delta, expr, icon, drift
 *     }
 *   }
 *
 * Three layers of tags:
 *   - Knot tags        runner.currentKnotTags  (e.g. #silent:240 on === beat ===)
 *   - Line tags        result.lines[i].tags    (e.g. #icon:warmth on a single line)
 *   - Choice tags      runner.lastChoiceTags   (e.g. #delta:5 on * [WAIT])
 *
 * Flag handling — applied automatically:
 *   ~ flag = value                 assignment, applied at the assign statement
 *   #flag:NAME tag on a choice     applied when the choice is picked
 *   #flag:NAME tag on a text line  applied when the line is emitted
 *   { cond } / { cond : ... }      evaluated against current flag state
 *
 * Diverts:
 *   -> knot                        jump to top-level knot
 *   -> knot.stitch                 jump to a stitch within a knot
 *   -> END                         pause with end reason 'END'
 *   -> DONE                        pause with end reason 'DONE'
 */

import type { Story, Stmt, Expr, Tag, Value, Knot } from './InkParser';

export interface ChoiceView {
  index: number;
  label: string;
  tags: Tag[];
  /** internal — the choice's body, used by choose() */
  body: Stmt[];
}

export interface LineView {
  text: string;
  tags: Tag[];
}

export type StepOutcome =
  | { kind: 'choices'; choices: ChoiceView[] }
  | { kind: 'end'; target: 'END' | 'DONE' };

export interface StepResult {
  lines: LineView[];
  outcome: StepOutcome;
}

interface ExecFrame {
  body: Stmt[];
  pc: number;
}

export class InkRunner {
  private readonly story: Story;
  private flags: Map<string, Value>;
  private execStack: ExecFrame[] = [];
  private pendingLines: LineView[] = [];
  private pendingChoices: ChoiceView[] = [];
  private endReason: 'END' | 'DONE' | null = null;
  private lastTags: Tag[] = [];
  private activeKnot: Knot | null = null;

  constructor(story: Story) {
    this.story = story;
    this.flags = new Map(story.variables);
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  /** Start (or restart) execution at a given knot or knot.stitch target. */
  start(target: string): void {
    this.execStack = [];
    this.pendingLines = [];
    this.pendingChoices = [];
    this.endReason = null;
    this.lastTags = [];
    this.activeKnot = null;
    this.divertTo(target);
  }

  /**
   * Advance until the next pause point. Returns accumulated lines plus the
   * outcome — either a choice cluster to present, or an end marker.
   */
  step(): StepResult {
    this.pendingLines = [];
    this.pendingChoices = [];
    this.run();

    if (this.endReason) {
      return {
        lines: this.pendingLines,
        outcome: { kind: 'end', target: this.endReason },
      };
    }
    if (this.pendingChoices.length > 0) {
      return {
        lines: this.pendingLines,
        outcome: { kind: 'choices', choices: this.pendingChoices },
      };
    }
    // Stack drained without an explicit divert — treat as soft END.
    this.endReason = 'END';
    return {
      lines: this.pendingLines,
      outcome: { kind: 'end', target: 'END' },
    };
  }

  /** Commit a player's choice. Applies #flag:* tags then enters the body. */
  choose(idx: number): void {
    const choice = this.pendingChoices[idx];
    if (!choice) {
      throw new Error(`InkRunner.choose: no choice at index ${idx}`);
    }

    for (const t of choice.tags) {
      if (t.key === 'flag') this.flags.set(t.value, true);
    }

    this.lastTags = choice.tags;
    this.execStack = [{ body: choice.body, pc: 0 }];
    this.pendingChoices = [];
    this.endReason = null;
  }

  // ------------------------------------------------------------
  // Flag access
  // ------------------------------------------------------------

  getFlag(name: string): Value | undefined {
    return this.flags.get(name);
  }

  setFlag(name: string, value: Value): void {
    this.flags.set(name, value);
  }

  hasFlag(name: string): boolean {
    return this.truthy(this.flags.get(name));
  }

  /** Snapshot of the full flag state (for save / debug). */
  getAllFlags(): Record<string, Value> {
    const out: Record<string, Value> = {};
    this.flags.forEach((v, k) => { out[k] = v; });
    return out;
  }

  /** Restore flags from a snapshot. Replaces the current state. */
  setAllFlags(flags: Record<string, Value>): void {
    this.flags = new Map(Object.entries(flags));
  }

  // ------------------------------------------------------------
  // Read-only state
  // ------------------------------------------------------------

  get isAtEnd(): 'END' | 'DONE' | null { return this.endReason; }
  get currentChoices(): ChoiceView[] { return this.pendingChoices; }
  /** Tags from the last committed choice — game runtime reads delta/expr/icon/drift here. */
  get lastChoiceTags(): Tag[] { return this.lastTags; }
  /** Name of the currently-active knot (the last one we diverted into). */
  get currentKnotId(): string | null { return this.activeKnot ? this.activeKnot.name : null; }
  /** Tags declared on the active knot's `=== knot === #tag:value` line. */
  get currentKnotTags(): Tag[] { return this.activeKnot ? this.activeKnot.tags : []; }

  // ------------------------------------------------------------
  // Core loop
  // ------------------------------------------------------------

  private run(): void {
    while (this.execStack.length > 0 && !this.endReason) {
      const top = this.execStack[this.execStack.length - 1];

      if (top.pc >= top.body.length) {
        this.execStack.pop();
        continue;
      }

      const stmt = top.body[top.pc];

      // Choice cluster: collect all consecutive choice statements at this
      // position, then pause. Conditional choices that fail are skipped.
      if (stmt.kind === 'choice') {
        while (
          top.pc < top.body.length &&
          top.body[top.pc].kind === 'choice'
        ) {
          const c = top.body[top.pc] as Extract<Stmt, { kind: 'choice' }>;
          if (this.evalCondition(c.condition)) {
            this.pendingChoices.push({
              index: this.pendingChoices.length,
              label: c.label,
              tags: c.tags,
              body: c.body,
            });
          }
          top.pc++;
        }
        if (this.pendingChoices.length > 0) return;
        continue; // no surviving choices, fall through to whatever follows
      }

      top.pc++;

      switch (stmt.kind) {
        case 'text':
          if (this.evalCondition(stmt.condition)) {
            // Apply any #flag:* tags on this line so flag state stays in sync
            // with what the player actually saw.
            for (const t of stmt.tags) {
              if (t.key === 'flag') this.flags.set(t.value, true);
            }
            this.pendingLines.push({ text: stmt.text, tags: stmt.tags });
          }
          break;

        case 'assign':
          this.flags.set(stmt.name, stmt.value);
          break;

        case 'divert':
          this.divertTo(stmt.target);
          break;

        case 'cond': {
          const branch = this.pickBranch(stmt.branches);
          if (branch) {
            this.execStack.push({ body: branch.body, pc: 0 });
          }
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  private divertTo(target: string): void {
    if (target === 'END' || target === 'DONE') {
      this.endReason = target;
      this.execStack = [];
      return;
    }

    let body: Stmt[] | undefined;
    let knot: Knot | undefined;
    const dotIdx = target.indexOf('.');
    if (dotIdx >= 0) {
      const knotName = target.slice(0, dotIdx);
      const stitchName = target.slice(dotIdx + 1);
      knot = this.story.knots.get(knotName);
      if (knot) body = knot.stitches.get(stitchName);
    } else {
      knot = this.story.knots.get(target);
      if (knot) body = knot.body;
    }

    if (!body || !knot) {
      throw new Error(`InkRunner.divertTo: unknown target '${target}'`);
    }

    this.activeKnot = knot;
    this.execStack = [{ body, pc: 0 }];
  }

  private pickBranch(
    branches: { condition?: Expr; body: Stmt[] }[],
  ): { body: Stmt[] } | null {
    for (const b of branches) {
      if (this.evalCondition(b.condition)) return b;
    }
    return null;
  }

  private evalCondition(expr?: Expr): boolean {
    if (!expr) return true;
    if (expr.kind === 'literal') return this.truthy(expr.value);
    const truthy = this.truthy(this.flags.get(expr.name));
    return expr.negated ? !truthy : truthy;
  }

  private truthy(v: Value | undefined): boolean {
    return v !== undefined && v !== false && v !== 0 && v !== '';
  }
}
