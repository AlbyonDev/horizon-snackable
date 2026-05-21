// ── Enums ────────────────────────────────────────────────────────────────────

export enum GamePhase {
  Start    = 0,  // internal initial state only — never broadcast via PhaseChangedEvent
  Aim      = 1,
  Flying   = 2,
  Result   = 3,
  GameOver = 4,
}

export enum ShotOutcome {
  Goal    = 0,
  Save    = 1,
  PostHit = 2,
  Miss    = 3,
}

// ── Interfaces ───────────────────────────────────────────────────────────────

/** Snapshot returned by GameStateService for HUD / game-over screens. */
export interface IGameSnapshot {
  score:      number;
  shotsLeft:  number;
  goals:      number;
  combo:      number;
  bestCombo:  number;
  comboMulti: number;
  accuracy:   number; // goals / totalShots  [0..1]
}
