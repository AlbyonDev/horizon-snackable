# H2_Timestop — Project Summary

## Concept

**TIME STOP** is a mobile portrait arcade game (Meta Horizon Worlds) for a single player, set in a **bamboo forest**.

Bamboo logs fall from the top of the screen with rotation, lateral drift, and wall bounces. The player **taps the screen** to freeze them mid-air just before they hit the floor. The closer the log is to the floor at the moment of the tap, the higher the score. If a log reaches the floor without being frozen, it is **Game Over**.

| Attribute | Value |
|---|---|
| Feel | Precision tension — timing under pressure, satisfaction of the "perfect freeze" |
| Session | ~3–5 minutes (10 rounds) |
| Platform | Mobile portrait, solo, Meta Horizon Worlds |
| Execution | Client-only (`isServerContext()` guard everywhere) |

---

## Game Loop

```
[Start]
  → TAP → [Intro] (3-2-1-Round countdown)
         → objects activated one by one (1s interval)
         → [Falling] TAP → scores the lowest object → [Clearing] (RESUME_DELAY_MS)
                       └── all frozen? → [RoundEnd] → next round
                                       else → [Falling]
  → last round complete → [End] → TAP → restart
  → object touches FLOOR_Y → [GameOver] → TAP → restart
```

### Phases (`GamePhase`)

| Phase | Description |
|---|---|
| `Start` | Title screen, "Tap to start". Round 0 objects already pre-spawned as ghosts. |
| `Intro` | "3-2-1-Round N" countdown. Objects visible but inactive. Duration: `INTRO_DURATION_MS`. |
| `Falling` | Objects actively falling. Tap accepted. Objects activated one by one (1s apart). |
| `Clearing` | Brief pause after a freeze (`RESUME_DELAY_MS`). |
| `RoundEnd` | Transition between rounds. |
| `GameOver` | An object reached `FLOOR_Y`. Displays score + leaderboard. |
| `End` | All 10 rounds complete. Displays score + leaderboard. |

---

## Scoring System

`precision = (BONUS_START_Y – lowestY) / (BONUS_START_Y – FLOOR_Y)` clamped to [0, 1]  
`d = 1 – precision` (distance from perfect: 0 = touching floor, 1 = at top of scoring zone)  
`pts = gradeBonus + Math.round(precision × 1400)`

| Grade | `d` threshold | Grade bonus | Pts range |
|---|---|---|---|
| Perfect | d ≤ 9.6 % | +100 | ~1365–1500 |
| Great | d ≤ 25.6 % | +75 | ~1116–1340 |
| Good | d ≤ 48 % | +50 | ~778–1091 |
| Early | d ≤ 90.4 % | +25 | ~159–753 |
| Miss | d > 90.4 % | +0 | 0–134 |

Total score accumulates over all 10 rounds.

---

## Play Area (Y-up, world units)

```
 6.13  ──  START_Y   (spawn / ghost preview)
 3.00  ──  PLAY_TOP  (start of scoring zone)
  ...     [active play zone]
-6.13  ──  FLOOR_Y   (game-over if any corner goes below)
```

Play area: **9 × 16 world units**, centered at the origin.

---

## Round Progression

10 rounds with increasing difficulty:

| Round | Objects | Wall Bounce | Off-center Pivot |
|---|---|---|---|
| 1 | 1 | — | — |
| 2 | 2 | — | — |
| 3 | 2 | ✓ (hard) | — |
| 4 | 3 | ✓ | — |
| 5 | 3 | ✓ | ✓ |
| 6–7 | 4 | ✓ | ✓ |
| 8–10 | 5 | ✓ | ✓ |

Fall speed increases by ~0.34 wu/s per round (base ~3.61 wu/s).

---

## Object Physics (Log type)

Each Log is a **bamboo segment** simulated as a flat rectangle. Physics runs entirely in `FallingObjService` (pure TypeScript, no entity). Rendering uses 3 assembled 2D canvas items (Left cap, Center body, Right cap) driven via `Events.RenderFallingObjs` → `FallingObjCanvas`.

| Parameter | Range | Details |
|---|---|---|
| Width | 2.06 – 3.89 wu | Random at each spawn |
| Fall speed | 3.61 – 6.67 wu/s | Increases per round |
| Horizontal drift (vx) | 1.03 – 2.74 wu/s | Sign independent from angle |
| Initial angle | ±8 – 48 ° | Sign independent from torque |
| Torque | ±40 – 220 °/s | Drives rotation during fall |
| Off-center pivot | ±0 – 50 % of half-width | Rotation around shifted point (rounds 5+) |

**Wall bounce:** position correction + `vx` inversion with damping + torque kick.
- Hard bounce (rounds 3+): `BOUNCE_KICK_FULL`, `BOUNCE_TORQUE_ADD`
- Soft deflection (rounds 1–2): `BOUNCE_KICK_SOFT`, `BOUNCE_TORQUE_ADD_SOFT`

**Freeze → fade out:** `FREEZE_HOLD_MS` at full opacity, then `FREEZE_FADE_MS` alpha fade.

---

## Architecture

### File Organization

```
scripts/
  Types.ts              ← ALL interfaces, enums, events, payloads (no sibling imports)
  Constants.ts          ← All numeric gameplay constants (no sibling imports)
  Assets.ts             ← All TemplateAsset / TextureAsset refs
  LevelConfig.ts        ← Round definitions (ROUND_DEFS)
  Shared/
    FallingObjUtils.ts  ← Pure functions: getPrecision(), calcScore()
  services/             ← @service() singletons — auto-init, event-driven, no scene entity needed
    FallingObjService.ts  ← Log physics simulation (LogSim), freeze/fade, render emit
    InputManager.ts       ← Tap → score → freeze → phase transitions
    SpawnManager.ts       ← Round spawn layout, InitFallingObj dispatch
  components/           ← @component() — must be attached to a scene entity
    GameManager.ts        ← Scene entry point; forces service init; phase/score/restart
    ClientSetup.ts        ← Fixed camera + FocusedInteraction → Events.PlayerTap
    ui/
      FallingObjCanvas.ts        ← 2D sprite renderer consuming Events.RenderFallingObjs
      GameHUDViewModel.ts           ← Score display + countdown announcements
      LeaderboardHUDViewModel.ts    ← End-of-game leaderboard overlay
      FreezeFeedbackHUDViewModel.ts ← Grade/score line overlay on freeze
    GameplayObjects/
      BallObj.ts            ← Entity-based ball (active when Ball rounds are in LevelConfig)
      FloatingScoreText.ts  ← Animated grade+score text floating up on freeze
      FreezeLineVisual.ts   ← Horizontal line spawned at freeze Y position
```

### Service Architecture

Services auto-initialize and are globally accessible via `.get()`. `GameManager.onStart()` calls `.get()` on every service to guarantee registration at startup:

```typescript
// GameManager.onStart()
FallingObjService.get();
InputManager.get();
SpawnManager.get();
```

All services reset state in their `@subscribe(Events.Restart)` handler — no `dispose()`.

### Communication

All components and services communicate exclusively via `LocalEvent`. No direct references between components.

```
ClientSetup.onTouchStarted → Events.PlayerTap
  → GameManager.onPlayerTap  (Start/GameOver/End: phase transition)
  → InputManager.onPlayerTap (Falling: score + freeze)

SpawnManager.onPrepareRound → Events.InitFallingObj × N → FallingObjService
  → Events.AllObjsSpawned → GameManager → startRound()

GameManager._setPhase(Falling) → Events.PhaseChanged
  → GameManager._scheduleNextActivation → Events.FallingObjActivate (×N, 1s apart)

InputManager._handleTap → Events.FallingObjFreeze → FallingObjService.onFreeze
  → Events.FallingObjFrozen → GameManager (score)
  → HUDEvents.ShowGrade → FreezeFeedbackHUDViewModel (screen-space grade/score/line overlay)
  → (after RESUME_DELAY_MS) → RoundComplete or back to Falling

FallingObjService.onUpdate (every frame) → Events.RenderFallingObjs → FallingObjCanvas
```

### Key Files

| File | Class | Role |
|---|---|---|
| `Types.ts` | — | Enums, interfaces, all events and payloads |
| `Constants.ts` | — | All numeric gameplay constants |
| `LevelConfig.ts` | — | Round definitions (`ROUND_DEFS`) |
| `Assets.ts` | — | All template/texture asset paths |
| `services/FallingObjService.ts` | `FallingObjService` | Log physics simulation, freeze, render emit |
| `services/InputManager.ts` | `InputManager` | Tap → score → freeze → phase |
| `services/SpawnManager.ts` | `SpawnManager` | Round layout, entity spawn, InitFallingObj |
| `components/GameManager.ts` | `GameManager` | Scene entry point, phase/score/restart |
| `components/ClientSetup.ts` | `ClientSetup` | Camera + touch → Events.PlayerTap |
| `components/ui/FallingObjCanvas.ts` | `FallingObjCanvas` | 2D bamboo sprite assembly (3 canvas items per log) |
| `components/ui/GameHUDViewModel.ts` | `GameHUDViewModel` | Score + countdown HUD |
| `components/ui/LeaderboardHUDViewModel.ts` | `LeaderboardHUDViewModel` | Leaderboard overlay |
| `components/ui/FreezeFeedbackHUDViewModel.ts` | `FreezeFeedbackHUDViewModel` | Screen-space grade/score/line overlay on freeze |
| `components/GameplayObjects/BallObj.ts` | `BallObj` | Entity-based ball (unused until Ball rounds added) |
| `components/GameplayObjects/FloatingScoreText.ts` | `FloatingScoreText` | (Inactive — replaced by FreezeFeedbackHUDViewModel) |
| `components/GameplayObjects/FreezeLineVisual.ts` | `FreezeLineVisual` | (Inactive — replaced by FreezeFeedbackHUDViewModel) |

---

## Leaderboard System

Displayed automatically at the end of each game (GameOver or Victory).

| Feature | Description |
|---|---|
| Auto submission | Score submitted via `LeaderboardsService.updateEntryForPlayer()` |
| Top 10 | Displays top 10 scores with rank, name, score |
| Player highlight | Current player's row highlighted in gold |
| Medals | Top 3 colored: gold / silver / bronze |
| Loading / Error | Graceful loading and error states |

Configuration: `LEADERBOARD_API_NAME` in `Constants.ts` — must match the world leaderboard settings.

---

## Extension Points

### Adding a new falling object type

Requires changes in **4 places only**:

1. **`Types.ts`** — new value in `FallingObjType`
2. **`Assets.ts`** — new entry in `FallingObjTemplates`
3. **`LevelConfig.ts`** — use the type in a `WaveObjDef`
4. **`components/GameplayObjects/[TypeName].ts`** — new `@component()` implementing `IFallingObj`, registers via `FallingObjService.get().registerBall(this)` in `onInitFallingObj`

`SpawnManager` and `FallingObjService` need no changes for entity-based types.

For a **purely simulated type** (like Log), add a new inner simulation class to `FallingObjService` and handle it in `onInitFallingObj`.

| Feature | Where to intervene |
|---|---|
| New falling object (entity-based) | `FallingObjType` + `Assets` + `LevelConfig` + new `GameplayObjects/` component |
| New falling object (simulated, no entity) | `FallingObjType` + `LevelConfig` + new sim class in `FallingObjService` |
| New round / wave configuration | `LevelConfig.ts → ROUND_DEFS` |
| Grade visual feedback | `FreezeFeedbackHUDViewModel` subscribes to `HUDEvents.ShowGrade` (grade, pts, worldY) |
| Sound / audio | New component subscribed to `FallingObjFrozen`, `FallingObjHitFloor`, etc. |
| Special effects on freeze | Subscribe a VFX component to `Events.FallingObjFrozen` |
| Extended HUD | New payload in `HUDEvents` + handler in the relevant HUD component |
