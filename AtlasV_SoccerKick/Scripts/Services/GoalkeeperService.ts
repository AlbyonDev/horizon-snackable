import { Service, service } from 'meta/worlds';
import { GK_START_Z, GOAL_HALF_W } from '../Constants';
import { KEEPER_DEFS, type IKeeperDef } from '../Defs/KeeperDefs';

@service()
export class GoalkeeperService extends Service {

  // ── State ────────────────────────────────────────────────────────────────────

  private _def: IKeeperDef = KEEPER_DEFS[0];

  private _x        = 0;
  private _targetX  = 0;
  private _y        = 0;       // vertical offset (dive arc)
  private _rotZ     = 0;       // body lean / dive roll

  private _reacting = false;
  private _diving   = false;
  private _diveDir  = 0;       // −1 left, +1 right
  private _diveT    = 0;       // 0..1 animation progress

  private _idleT    = 0;       // accumulator for idle sway

  private _reactionTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Def ──────────────────────────────────────────────────────────────────────

  setDef(index: number): void {
    // Guard against out-of-range indices — an undefined _def would crash every
    // tick (e.g. _tickIdle reading _def.idleSpeed) and freeze the game loop.
    const def = KEEPER_DEFS[index];
    if (def) this._def = def;
  }

  get shadowBaseX(): number { return this._def.shadowBaseX; }


  /** Returns the current collision box for debug visualisation (world-space center + half-extents + rotation). */
  get obbDebug(): { cx: number; cy: number; rotZ: number; halfW: number; halfH: number } {
    const halfW = this._def.halfW;
    const halfH = (this._def.standH - this._def.footY) / 2;
    // Standing center: mid-height between footY and standH
    const standCY = this._def.footY + halfH;
    if (this._diving) {
      // Pivot is at the keeper's feet in world space (posX, posY).
      // animDiveOffsetY compensates for extra Y translation baked into the FBX dive clip.
      const localCY = standCY + this._def.animDiveOffsetY;
      const cos = Math.cos(this._rotZ);
      const sin = Math.sin(this._rotZ);
      const cx = this._x - localCY * sin;
      const cy = Math.max(halfH * 0.75, this._y + localCY * cos);
      return { cx, cy, rotZ: this._rotZ, halfW, halfH };
    }
    return { cx: this._x, cy: standCY, rotZ: 0, halfW, halfH };
  }

  // ── Read access ──────────────────────────────────────────────────────────────

  get posX(): number    { return this._x; }
  get posY(): number    { return this._y; }
  get rotZ(): number    { return this._rotZ; }
  get diving(): boolean { return this._diving; }
  get diveT(): number   { return this._diveT; }
  get diveDir(): number { return this._diveDir; }
  get idleT(): number   { return this._idleT; }
  get reacting(): boolean { return this._reacting; }
  get startZ(): number  { return GK_START_Z; }

  // ── React to a kick ──────────────────────────────────────────────────────────

  /** Called when the ball is kicked. Ball state passed in to avoid circular dep. */
  onBallKicked(ballX: number, ballZ: number, ballVx: number, ballVz: number): void {
    this._reactionTimer = setTimeout(() => {
      this._reacting = true;

      if (ballVz === 0) return;

      // Predict where the ball will cross the goal line
      const tToGoal = Math.abs(ballZ / ballVz);
      const landX   = ballX + ballVx * tToGoal;
      const clamp   = GOAL_HALF_W - 0.4;
      this._targetX = Math.max(-clamp, Math.min(clamp, landX));

      // Dive decision
      const cornerDist = Math.min(
        Math.abs(landX - GOAL_HALF_W),
        Math.abs(landX + GOAL_HALF_W),
      );
      const isFast   = Math.abs(ballVz) > 0.28;
      const isCorner = cornerDist < GOAL_HALF_W * 0.5;

      if ((isFast || isCorner) && Math.random() < this._def.diveChance) {
        this._diving  = true;
        this._diveDir = landX > 0 ? 1 : -1;
      }
    }, this._def.reactionMs);
  }

  // ── Collision check (called by GameManager) ──────────────────────────────────

  /** Returns true if the ball at (bx, by) is within the GK's current hitbox. */
  checkSave(bx: number, by: number): boolean {
    if (this._diving) {
      return this._checkSaveOBB(bx, by);
    }

    // Standing: simple AABB
    return (
      bx > this._x - this._def.halfW && bx < this._x + this._def.halfW &&
      by > this._def.footY && by < this._def.standH
    );
  }

  /**
   * OBB test for dive — rotates the ball position into the GK's local space
   * (inverse of _rotZ around the box center), then does a standard AABB check.
   */
  private _checkSaveOBB(bx: number, by: number): boolean {
    const halfW = this._def.halfW;
    const halfH = (this._def.standH - this._def.footY) / 2;
    const standCY = this._def.footY + halfH;

    const localCY = standCY + this._def.animDiveOffsetY;
    const cosR =  Math.cos(this._rotZ);
    const sinR =  Math.sin(this._rotZ);
    const cx = this._x - localCY * sinR;
    const cy = Math.max(halfH * 0.75, this._y + localCY * cosR);

    // Translate ball relative to box center
    const dx = bx - cx;
    const dy = by - cy;

    // Rotate into box local space (inverse rotation = -_rotZ)
    const lx  =  dx * cosR + dy * sinR;
    const ly  = -dx * sinR + dy * cosR;

    return Math.abs(lx) < halfW && Math.abs(ly) < halfH;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  tick(dt: number): void {
    // The prototype assumed fixed ~60 fps steps.
    // Scale by dt * 60 so the same constants produce identical results.
    const step = dt * 60;
    this._idleT += step * (1 / 60); // keep _idleT in "seconds" for sin() frequency

    if (this._diving) {
      this._tickDive(step);
    } else if (this._reacting) {
      this._tickReact(step);
    } else {
      this._tickIdle(step);
    }
  }

  private _tickDive(step: number): void {
    this._diveT = Math.min(this._diveT + step * (1 / 60) * this._def.diveSpeed, 1);
    const t = this._diveT;
    this._x    = this._x + this._diveDir * t * this._def.diveLateral * step * (1 / 60) * 2;
    this._y    = Math.sin(t * Math.PI) * this._def.diveHeight;
    this._rotZ = -this._diveDir * t * Math.PI * 0.52;
  }

  private _tickReact(step: number): void {
    const diff = this._targetX - this._x;
    const move = Math.min(Math.abs(diff), this._def.speed * step);
    this._x += Math.sign(diff) * move;
    this._y = 0;
    this._rotZ = -Math.sign(diff) * 0.1;
  }

  private _tickIdle(step: number): void {
    const sway = Math.sin(this._idleT * 1.1) * (GOAL_HALF_W - 0.8);
    const diff = sway - this._x;
    const move = Math.min(Math.abs(diff), this._def.idleSpeed * step);
    this._x += Math.sign(diff) * move;
    this._y = 0;
    this._rotZ = Math.sign(diff) * 0.05;
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    if (this._reactionTimer !== null) {
      clearTimeout(this._reactionTimer);
      this._reactionTimer = null;
    }
    this._x        = 0;
    this._targetX  = 0;
    this._y        = 0;
    this._rotZ     = 0;
    this._reacting = false;
    this._diving   = false;
    this._diveDir  = 0;
    this._diveT    = 0;
  }
}
