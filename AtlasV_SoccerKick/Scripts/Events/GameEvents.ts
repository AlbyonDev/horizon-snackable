import { LocalEvent } from 'meta/worlds';

// ── Keeper Despawn (sent to the keeper entity — it cleans up shadow + self) ──

export class KeeperDespawnPayload {}

export const KeeperDespawnEvent = new LocalEvent<KeeperDespawnPayload>(
  'EvKeeperDespawn',
  KeeperDespawnPayload,
);

// ── Shot Fired (ball just kicked — dots should update immediately) ───────────

export class ShotFiredPayload {
  shotsLeft: number = 0;
}

export const ShotFiredEvent = new LocalEvent<ShotFiredPayload>(
  'EvShotFired',
  ShotFiredPayload,
);

// ── Phase Changed ────────────────────────────────────────────────────────────

export class PhaseChangedPayload {
  phase: number = 0;
}

export const PhaseChangedEvent = new LocalEvent<PhaseChangedPayload>(
  'EvPhaseChanged',
  PhaseChangedPayload,
);

// ── Score Changed ────────────────────────────────────────────────────────────

export class ScoreChangedPayload {
  score: number = 0;
  combo: number = 0;
  comboMulti: number = 1;
}

export const ScoreChangedEvent = new LocalEvent<ScoreChangedPayload>(
  'EvScoreChanged',
  ScoreChangedPayload,
);

// ── Game Reset (new round started) ───────────────────────────────────────────

export class GameResetPayload {
  shotsLeft: number = 0;
}

export const GameResetEvent = new LocalEvent<GameResetPayload>(
  'EvGameReset',
  GameResetPayload,
);

// ── Restart Requested (Replay button — GameManager owns the restart sequence) ─

export class RestartRequestedPayload {}

export const RestartRequestedEvent = new LocalEvent<RestartRequestedPayload>(
  'EvRestartRequested',
  RestartRequestedPayload,
);

// ── Points Ready (casino roll-up complete — HUD may now animate score) ───────

export class PointsReadyPayload {
  score:      number = 0;  // new total score
  comboMulti: number = 1;
}

export const PointsReadyEvent = new LocalEvent<PointsReadyPayload>(
  'EvPointsReady',
  PointsReadyPayload,
);

// ── Aim Started (finger touched down in Aim phase) ───────────────────────────

export class AimStartedPayload {}

export const AimStartedEvent = new LocalEvent<AimStartedPayload>(
  'EvAimStarted',
  AimStartedPayload,
);

// ── Aim Updated (finger dragging — power in [0..1]) ──────────────────────────

export class AimUpdatedPayload {
  power: number = 0;
}

export const AimUpdatedEvent = new LocalEvent<AimUpdatedPayload>(
  'EvAimUpdated',
  AimUpdatedPayload,
);

// ── Confetti Explosion Trigger ────────────────────────────────────────────────

export class ConfettiExplosionTriggerPayload {
  count: number = 50;
}

export const ConfettiExplosionTriggerEvent = new LocalEvent<ConfettiExplosionTriggerPayload>(
  'EvConfettiExplosionTrigger',
  ConfettiExplosionTriggerPayload,
);
