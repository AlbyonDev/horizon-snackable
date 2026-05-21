# Soccer Kick 3D — Project Summary

## Concept

Penalty shootout game. The player swipes to kick a ball toward a goal defended by an AI goalkeeper.
6 shots per round, score based on goals with combo, corner, and chip multipliers.
Snackable: simple, satisfying, short.

---

## Game Flow

`[Load/Restart] → Aim → Flying → Result → (repeat × 6) → GameOver → [tap to restart]`

> `GamePhase.Start` (value 0) is the internal initial state before the first spawn — it is **never** broadcast via `PhaseChangedEvent`. The player-visible game begins immediately in **Aim**.

- **Aim**: Player swipes upward from the lower screen. A power gauge shows swipe intensity (left side of screen). The ball sits on the penalty spot.
- **Flying**: Ball travels toward goal with physics (gravity, spin, lateral aim). Goalkeeper reacts after a per-keeper delay then dives.
- **Result**: Outcome determined (Goal / Save / Post / Miss). Feedback UI + VFX + camera shake + sound plays. Ball bounces. Auto-advances to next shot after a delay.
- **GameOver**: Stats overlay appears (accuracy, goals/6, score, star rating, best combo). Replay button or tap anywhere to restart.

---

## Round System

- Each round consists of **6 shots** (`TOTAL_SHOTS` in `Constants.ts`)
- A new goalkeeper archetype is randomly selected each round (avoids repeats)
- When all 6 shots are used, `GameOver` phase triggers after `GAME_OVER_DELAY` ms
- Tap anywhere during GameOver (or the replay button) to start a fresh round

---

## Scoring System

### Base Points
- **Goal**: 100 points (`PTS_GOAL` in `Constants.ts`)
- **Save / Post / Miss**: 0 points

### Bonus Zones
- **Corner goal**: `|ballX| > GOAL_HALF_W * CORNER_THRESHOLD` → **×1.8** (`PTS_CORNER_MULTI`)
- **Chip goal**: `ballY > GOAL_HEIGHT * HEIGHT_THRESHOLD` AND not in corner → **×1.5** (`PTS_CHIP_MULTI`)
- Corner and chip are mutually exclusive; combo multiplier stacks on top of either

### Combo System
- Consecutive goals increment the combo counter
- Any non-goal resets combo to 0
- At **3** consecutive goals (`COMBO_THRESHOLD`), the combo multiplier activates
- Combo multiplier = combo count, **capped at ×6** (`MAX_COMBO_MULTI`)
- Full formula: `points = PTS_GOAL × bonusMulti × comboMulti`

### Star Rating (GameOver screen)
Thresholds live in `Constants.ts`:

| Stars | Condition |
|-------|-----------|
| ⭐⭐⭐ | `accuracy >= STARS_3_ACCURACY` (0.80) |
| ⭐⭐ | `accuracy >= STARS_2_ACCURACY` (0.50) |
| ⭐ | otherwise |

---

## Shot Outcomes

| Enum | Value | Description | Feedback text | Color |
|------|-------|-------------|---------------|-------|
| `ShotOutcome.Goal` | 0 | Ball enters the net | GOAL! (stadium sweep) | #FFD700 gold |
| `ShotOutcome.Save` | 1 | Goalkeeper blocks | SAVED! (impact) | #FF4444 red |
| `ShotOutcome.PostHit` | 2 | Post or crossbar | POST! (vibration) | #FFFFFF white |
| `ShotOutcome.Miss` | 3 | Ball goes wide/stops | MISS! (dramatic drop) | #FF6B35 orange |

### Delay Before Next Shot (`Constants.ts`)

| Outcome | Constant | Default |
|---------|----------|---------|
| Goal | `NEXT_SHOT_GOAL_MS` | 1500 ms |
| Save | `NEXT_SHOT_SAVE_MS` | 1300 ms |
| Post | `NEXT_SHOT_POST_MS` | 1300 ms |
| Miss | `NEXT_SHOT_MISS_MS` | 1000 ms |

---

## Goalkeeper Types

Three archetypes in `Defs/KeeperDefs.ts`. One is randomly selected per round (no repeat from previous round).

| # | Style | Reaction | Dive chance | Hitbox width |
|---|-------|----------|-------------|--------------|
| 1 | Aggressive diver | 120 ms | 90% | 0.8 m (narrow) |
| 2 | Big slow | 200 ms | 75% | 1.25 m (wide) |
| 3 | Quick stepper | 60 ms | 65% | 0.75 m, high jump |

Each def also tunes: idle sway speed, dive speed/lateral/height, hitbox height, shadow scale.
All per-keeper values live **in the def** — the `GK_*` constants in `Constants.ts` are collision geometry defaults used by `GoalkeeperService` for values not in the def.

---

## Scene Layout (space.hstf)

### Pre-placed entities (editor only — never spawned via code)

| Entity | Role |
|--------|------|
| `CameraAnchor` | Empty entity at ~(0, 3, 13); `ClientSetup` reads its world transform to position the fixed camera |
| `PenaltySpot` | Invisible anchor at (0, 0.28, 9); `GameManager` uses its world position as ball spawn origin |
| `Goal` | 3D model (posts + crossbar + net), centered at world origin |
| `Ground` | Plane primitive — soccer field surface |
| `Background` | Plane primitive — stadium backdrop behind the goal |
| `SoccerKickHud` | Entity with `CustomUiComponent` + `SoccerKickHudComponent` |
| `PowerGauge` | Entity with `CustomUiComponent` + `PowerGaugeComponent` |
| `ShotFeedbackDisplay` | Entity with `CustomUiComponent` + `ShotFeedbackDisplayComponent` |
| `GameOverStats` | Entity with `CustomUiComponent` + `GameOverStatsComponent` |
| `ConfettiExplosion` | Entity with `CustomUiComponent` + `ConfettiExplosionUIComponent` |
| Sound entities | Multiple entities each with `SoundComponent` + `AudioSource` (registered by `soundId`) |
| `GameManager` entity | Carries `GameManager` + `ClientSetup` components |

### Runtime-spawned entities (code only — `LocalOnly` network mode)

| What | Template | Count | Spawner |
|------|----------|-------|---------|
| Ball | `@Templates/Ball.hstf` | 1 | `GameManager` |
| Goalkeeper | `@Templates/Keepers/GoalkeeperN.hstf` | 1 (random) | `GameManager` |
| VFX particles | `@Templates/Cube.hstf` | `VFX_POOL_SIZE` (60) | `GameManager` |
| Trail dots | `@Templates/Sphere.hstf` | `TRAIL_POOL_SIZE` (24) | `GameManager` |

---

## Architecture

### Services

| Service | Responsibility |
|---------|----------------|
| `GameStateService` | Score, shots remaining, combo tracking, phase transitions, round snapshot |
| `BallService` | Ball position, velocity, gravity, collision (goal/post/ground/net) |
| `GoalkeeperService` | GK position, idle sway, reaction AI, dive logic, save collision (AABB + OBB) |
| `CameraShakeService` | Decaying random-offset camera shake on shot outcomes |
| `VfxService` | 60-entity particle pool, burst effects per outcome |
| `BallTrailService` | 24-entity trail dot pool, emitted while ball is active |
| `AudioManager` | Event-driven sound routing via `SoundComponent` pool |

### Components

| Component | Entity | Role |
|-----------|--------|------|
| `ClientSetup` | GameManager entity | Camera init, swipe → kick input, tap-to-restart |
| `GameManager` | GameManager entity | Orchestrator: spawns entities, update loop, shot resolution |
| `BallController` | Ball template | Syncs transform from `BallService`, idle bounce animation, spin, shadow |
| `GoalkeeperController` | Keeper template | Syncs transform from `GoalkeeperService`, shadow, despawn on `KeeperDespawnEvent` |
| `ShotFeedbackDisplayComponent` | ShotFeedbackDisplay entity | Center-screen animated feedback + casino roll-up counter |
| `SoccerKickHudComponent` | SoccerKickHud entity | Score badge, 6 shot dots, instruction text with sine-wave bob |
| `PowerGaugeComponent` | PowerGauge entity | Vertical power bar (green→red), visible in Aim phase only |
| `GameOverStatsComponent` | GameOverStats entity | End-screen overlay: score, goals, accuracy, stars, replay button |
| `ConfettiExplosionUIComponent` | ConfettiExplosion entity | Full-screen confetti burst on goals |
| `AudioSource` | Sound entities | Registers `SoundComponent` with `AudioManager` by `soundId` |

### Events

All events are defined in `Scripts/Events/`. String IDs all use the `Ev` prefix.

| Event | Payload | Who fires it | Who consumes it |
|-------|---------|-------------|-----------------|
| `ShotFeedbackResultEvent` | outcome, pointsEarned, bonusZone | `GameManager` | `ShotFeedbackDisplayComponent`, `CameraShakeService`, `AudioManager` |
| `ScoreChangedEvent` | score, combo, comboMulti | `GameStateService` | `ShotFeedbackDisplayComponent`, `SoccerKickHudComponent` |
| `PhaseChangedEvent` | phase | `GameStateService` | all UI components, `AudioManager`, `VfxService` |
| `ShotFiredEvent` | shotsLeft | `GameStateService` | `SoccerKickHudComponent` |
| `GameResetEvent` | shotsLeft | `GameStateService` | `SoccerKickHudComponent`, `GameManager`, `AudioManager` |
| `PointsReadyEvent` | score, comboMulti | `ShotFeedbackDisplayComponent` | `SoccerKickHudComponent` |
| `AimStartedEvent` | — | `ClientSetup` | `PowerGaugeComponent` |
| `AimUpdatedEvent` | power | `ClientSetup` | `PowerGaugeComponent` |
| `KeeperDespawnEvent` | — | `GameManager` | `GoalkeeperController` (self-cleanup before despawn) |
| `ConfettiExplosionTriggerEvent` | count | `ShotFeedbackDisplayComponent` | `ConfettiExplosionUIComponent` |

### Templates & Assets (`Scripts/Assets.ts`)

| Template | Path | Used for |
|----------|------|---------|
| Ball | `@Templates/Ball.hstf` | The soccer ball |
| Goalkeeper 1 | `@Templates/Keepers/Goalkeeper1.hstf` | Aggressive diver |
| Goalkeeper 2 | `@Templates/Keepers/Goalkeeper2.hstf` | Big slow |
| Goalkeeper 3 | `@Templates/Keepers/Goalkeeper3.hstf` | Quick stepper |
| Particle | `@Templates/Cube.hstf` | VFX burst particles |
| Trail dot | `@Templates/Sphere.hstf` | Ball trail |

---

## UI Panels (XAML + ViewModel)

| Panel | XAML file | Component | Key bindings |
|-------|-----------|-----------|-------------|
| HUD | `SoccerKickHud.xaml` | `SoccerKickHudComponent` | Score, ScoreScale, ScoreColor, Shot1–6 (Active/Scale/Opacity), InstructionText |
| Power Gauge | `PowerGauge.xaml` | `PowerGaugeComponent` | FillHeight, GaugeVisible |
| Shot Feedback | `ShotFeedbackPanel.xaml` | `ShotFeedbackDisplayComponent` | FeedbackText, ScaleX/Y, TranslateX/Y, RotationZ, PointsText, ComboText |
| Game Over | `GameOverStats.xaml` | `GameOverStatsComponent` | ScoreText, GoalsText, PrecisionText, BestComboText, Star1–3 (Visible/Color/Scale), ReplayButtonOpacity |
| Confetti | `ConfettiExplosion.xaml` | `ConfettiExplosionUIComponent` | ItemsControl bound to confettiItems array |

---

## Juice / Feedback Systems

| System | Trigger | Key constants |
|--------|---------|---------------|
| Camera shake | `ShotFeedbackResultEvent` | `SHAKE_*_INTENSITY`, `SHAKE_*_DURATION` in `Constants.ts` |
| 3D VFX particles | `ShotFeedbackResultEvent` | `VFX_*` in `Constants.ts` (`VFX_POOL_SIZE=60`) |
| Ball trail | Ball active (Flying phase) | `TRAIL_*` in `Constants.ts` (`TRAIL_POOL_SIZE=24`, `TRAIL_DOT_LIFE=0.35s`) |
| Ball idle bounce | Ball idle (Aim phase) | `IDLE_*` in `Constants.ts` |
| UI confetti | Goal scored | `CONFETTI_GOAL_COUNT` in `Constants.ts` (default 50 pieces) |
| Sound effects | Multiple events | `AudioManager.ts` (event → `soundId` map) |

---

## Audio System

`AudioManager` routes events to sound entities via `soundId`. Sound entities are pre-placed in the scene, each with a `SoundComponent` and an `AudioSource` component that registers the sound on start.

| soundId | Trigger |
|---------|---------|
| `Kick` | Flying phase starts |
| `BallWhoosh` | Ball in flight |
| `BallHit` | Post/crossbar hit |
| `sfx_goal` | Goal scored (with `sfx_win` layered) |
| `sfx_lose` | Save / Post / Miss |
| `GoalSave` | Save outcome |
| `Miss` | Miss outcome |
| `Combo2` / `Combo3` / `Combo5` | Combo streak milestones |
| `sfx_game_start` | New round begins |
| `sfx_game_over` | GameOver phase |

---

## Modification Axes

Use this table to know **which files to touch** for each type of change.

| Change | Files |
|--------|-------|
| Shots per round | `Constants.ts` (`TOTAL_SHOTS`) + `SoccerKickHud.xaml` (dot count) + `SoccerKickHudComponent.ts` (dot init loop) |
| Point values / multipliers | `Constants.ts` (`PTS_GOAL`, `PTS_CORNER_MULTI`, `PTS_CHIP_MULTI`) |
| Bonus zone thresholds | `Constants.ts` (`CORNER_THRESHOLD`, `HEIGHT_THRESHOLD`) |
| Combo threshold / cap | `Constants.ts` (`COMBO_THRESHOLD`, `MAX_COMBO_MULTI`) |
| Star rating thresholds | `Constants.ts` (`STARS_3_ACCURACY`, `STARS_2_ACCURACY`) |
| Delay between shots | `Constants.ts` (`NEXT_SHOT_*_MS`, `GAME_OVER_DELAY`) |
| Ball physics | `Constants.ts` (`BALL_SPEED_BASE`, `BALL_ARC_*`, `BALL_GRAVITY`, `BOUNCE_*`, `SAVE_*`, `POST_*`) |
| Camera shake | `Constants.ts` (`SHAKE_*_INTENSITY`, `SHAKE_*_DURATION`) |
| VFX particles (count/speed/color) | `Constants.ts` (`VFX_*`) + `VfxService.ts` (color assignments) |
| Ball trail (length/fade) | `Constants.ts` (`TRAIL_POOL_SIZE`, `TRAIL_DOT_LIFE`, `TRAIL_EMIT_INTERVAL`) |
| Ball idle animation | `Constants.ts` (`IDLE_*`) |
| UI confetti count | `Constants.ts` (`CONFETTI_GOAL_COUNT`) |
| Goalkeeper archetypes | `Defs/KeeperDefs.ts` (tune existing or add new entry) |
| Add a new goalkeeper | `Defs/KeeperDefs.ts` + `Assets.ts` + **create template in editor** |
| Scoring logic (add new bonus) | `Services/GameStateService.ts` (`resolveShot`) + `Constants.ts` (new constants) + `ShotFeedbackEvents.ts` (`bonusZone` values) |
| Outcome feedback animations | `Components/ShotFeedbackDisplayComponent.ts` (animation profiles) |
| Outcome feedback text/color | `ui/ShotFeedbackPanel.xaml` (bindings) |
| HUD layout or style | `ui/SoccerKickHud.xaml` |
| Power gauge style | `ui/PowerGauge.xaml` |
| Game over screen layout | `ui/GameOverStats.xaml` + `Components/GameOverStatsComponent.ts` |
| Sound assignments | `Services/AudioManager.ts` (event → soundId map) |
| Swipe input sensitivity | `Constants.ts` (`SWIPE_DEAD_ZONE`, `SWIPE_POWER_RANGE`, `SWIPE_SIDE_RANGE`) |
| Camera FOV | `Constants.ts` (`CAMERA_FOV`) |

---

## What Requires Manual Editor Work

The agent **cannot** perform these changes — they require Meta Horizon Studio:

| Task | Why |
|------|-----|
| Create a new goalkeeper Template | Must author a 3D entity in the editor |
| Add / modify 3D animations | Requires rigging and animator setup (no code API) |
| Change goalkeeper 3D model | Requires replacing the FBX asset |
| Change the ball 3D model | Requires replacing `soccerBall.fbx` |
| Modify the goal / environment mesh | Scene asset, not a code concern |
| Add new sound assets | WAV files must be imported and placed as entities in the scene |
| Add a new UI panel | XAML file + entity in scene + `CustomUiComponent` — partial code, partial editor |

The agent **can** do these without editor work:

- All `Constants.ts` tuning (physics, timing, scoring, VFX, shake, trail)
- All `KeeperDefs.ts` changes (tune existing keepers, add a new archetype *referencing an existing template*)
- All TypeScript logic changes (game rules, scoring, bonus zones, AI behavior)
- All ViewModel-bound UI animation changes (component `.ts` files)
- XAML layout and style changes to existing panels
- `AudioManager.ts` sound routing changes (swap which sounds play on which events)

---

## Data Available for UI

`GameStateService.snapshot()` returns `IGameSnapshot`:

| Field | Type | Description |
|-------|------|-------------|
| `score` | number | Total score this round |
| `shotsLeft` | number | Remaining shots |
| `goals` | number | Goals scored this round |
| `combo` | number | Current consecutive goal streak |
| `bestCombo` | number | Best streak this round |
| `comboMulti` | number | Active multiplier (1 if combo < COMBO_THRESHOLD, else combo, max MAX_COMBO_MULTI) |
| `accuracy` | number | goals / shotsUsed in [0..1] |
