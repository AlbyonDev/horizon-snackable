# Gameplay — AtlasV Breakout

The complete mechanical reference. Every system below is traceable to a specific file.

---

## Scene & UI Overview

The game is built in three layers. Knowing which layer owns what is essential before editing anything visual.

### 1. Screen-space UI (XAML, no depth)

Rendered on top of everything, in pixel space (`900×1600` design size). No world position, no camera transform.

- `UI/GameHUD.xaml`         — score, lives hearts, center text ("Tap to start", "Cleared", …)
- `UI/ComboHUD.xaml`        — combo counter overlay
- `UI/HighScoreHUD.xaml`    — game-over leaderboard

Each XAML is hosted on a scene entity carrying a `CustomUiComponent` (type `ScreenSpace`) + the matching `*ViewModel` component. Editing an XAML never affects gameplay; the ViewModel is the only contract — read its `@uiViewModel()` class to see what bindings are exposed.

### 2. Spawned 3D entities (runtime pools, world-space)

Spawned once at startup, parked off-screen at `(0, -100, 0)`, reused via pools. They live on the XY play plane (Z ≈ 0) and obey the AABB collider rules.

- **Bricks** — 106 entities pre-warmed by `LevelLayout` from `BrickAssets.Normal` (`Templates/GameplayObjects/Brick.hstf`). One pool, recycled across all levels.
- **Particles** — 170 general + 30 trail entities pre-warmed by `VfxService.prewarm()` from `Templates/Particle.hstf`. Used for impact bursts, coin rendering, ball trail.
- **Power-ups** — spawned on demand from `PowerUpAssets` (currently empty registry, see "Re-enabling Power-Ups"). Destroyed when collected or out of bounds.

### 3. Scene-placed 3D entities (`Templates/Breakout.hstf`, persistent)

Fixed entities authored in the editor. They carry the gameplay components and the SoundComponent pool. Move/rotate/scale them in the editor — do not recreate from code.

- **Manager** — host for `GameManager`, `LevelLayout`, `PowerUpManager`, `LeaderboardManager`. `LevelLayout.background` property is wired to the `Background` entity.
- **Ball** — entity carrying the `Ball` component; visuals are on a `Sphere` child with `ColorComponent`. Reset position = its starting transform.
- **Paddle** — entity carrying the `Paddle` component; visuals are on a `Torus` child with `ColorComponent`. Reset position = its starting transform.
- **Background** — textured unlit plane (10×18 world units, rotated 90° on X, at Z = −1). The "neon grid horizon" art. Replaceable by swapping the mesh/material; no code touches it.
- **ClientSetup** — also holds the active `CameraComponent` (see below).
- **GameHUD / ComboHUD / HighScoreHUD** — three screen-space UI hosts (one `CustomUiComponent` + one `*ViewModel` each). The `ComboHUD` entity additionally hosts the `ComboManager` gameplay component (combo counter logic, unrelated to its UI).
- **Audio pool** — ~13 child entities under the `Audio` parent, each with a `SoundComponent` + `AudioSource { soundId }`. Adding/removing a sound = adding/removing an entity here, not editing code.

### Game Camera

Defined on the `ClientSetup` entity in `Templates/Breakout.hstf`. Activated by `ClientSetup.setupCamera()`.

- **Position:** `(0, 0, 120)` — 120 units in front of the play plane (which sits at Z ≈ 0)
- **Orientation:** looks toward `−Z` with no roll (default rotation)
- **Field of view:** `10°` (narrow long-lens — chosen so the play area fills the screen with negligible perspective distortion, mimicking orthographic at the depth where gameplay happens)
- **Mode:** `CameraMode.Custom` set via `CameraService.setActiveCamera`; `CameraShakeService` then drives a per-frame `localPosition` offset for shake events

Practical consequences for art:
- All gameplay entities sit at Z ≈ 0; bumping Z by ±0.1 (coins use `COIN_Z = −0.1`) is safe and not visible at FOV 10°.
- Anything further than ~5 units in Z from the play plane will start showing perspective skew, even at FOV 10°.
- The view is portrait — width corresponds to X ∈ [−4.5, +4.5], height to Y ∈ [−8, +8] (see `BOUNDS`).
- Up/down/left/right in the camera = +Y/−Y/−X/+X in world. Front-face of any mesh must point at +Z.

---

## Core Loop

```
[Boot]
  └─ LevelLayout.onStart()                          → spawns brick pool, lays out `Title` screen
  └─ GameManager.onStart()                          → sets lives, shows "Tap to start"
  └─ VfxService.prewarm()                           → spawns 170 + 30 particle entities

[Tap to start]
  └─ GameManager.onTap() while _showingTitleScreen  → _loadLevel(0)
       └─ EventService.sendLocally(Events.LoadLevel, { levelIndex: 0 })
            ├─ LevelLayout.onLoadLevel              → parks active bricks, lays out new level after 200ms
            ├─ Ball.onLoadLevel                     → applies palette + physics + reveal scale
            ├─ Paddle.onLoadLevel                   → applies palette + paddleLerpFactor
            ├─ PowerUpManager.onLoadLevel           → applies powerUpSpawnChance + powerUps[]
            ├─ AudioManager.onLoadLevel             → SFX.LEVEL_START + stopMusic(MUSIC, 1s)

[Per frame]
  └─ OnWorldUpdateEvent
       ├─ Ball.onUpdate                             → 8-substep physics, wall/paddle/brick bounce, trail spawn
       ├─ Paddle.onUpdate                           → lerp toward touch target, squash/stretch, powerup tick
       ├─ Brick._onRevealUpdate / _onDeathUpdate    → reveal in, death shrink+spin
       ├─ CoinService._onUpdate                     → coin gravity, vacuum, collection
       ├─ VfxService.onUpdate                       → trail SOA + general particle pool
       ├─ JuiceService._onUpdate                    → freeze timer
       └─ CameraShakeService.onUpdate               → decaying random offset

[Brick destroyed]
  └─ Events.BrickDestroyed
       ├─ GameManager: _bricksDestroyedThisLevel++ → _checkVictory() → _advanceLevel() if won
       ├─ ComboManager: combo++, heat++             → ComboHUDEvents.IncrementCombo + HeatEvents.IncrementHeat
       ├─ Ball: speedBonus += ballSpeedIncrementPerBrick
       ├─ CoinService: spawn 1–3 coins at brick position
       ├─ VfxService: spawn 3 impact particles
       ├─ JuiceService: freeze 0.04s + shake 0.08/0.15
       ├─ PowerUpManager: returns early (disabled by default)
       └─ AudioManager: SFX.BRICK_DESTROYED (random pitch 0.85–1.15)

[Level cleared]
  └─ GameManager._advanceLevel()
       ├─ Events.LevelCleared                       → Ball.locks + hides, CoinService stays alive
       ├─ CoinService.activateSuperVacuum()         → all coins drawn to paddle
       └─ Wait for activeCoinCount === 0, then +1s
            └─ _finishLevelTransition()             → _loadLevel((currentLevel + 1) % LEVELS.length)

[Ball lost]
  └─ Ball: ny - r <= BOUNDS.y → Events.BallLost
       ├─ GameManager: _lives--
       │    ├─ If lives <= 0:
       │    │    ├─ Events.LevelCleared (freeze ball)
       │    │    ├─ LeaderboardEvents.LeaderboardDisplayRequest (local)
       │    │    └─ LeaderboardEvents.LeaderboardSubmitScore (network, server-handled)
       │    └─ Else: Events.ResetRound + "Tap to start"
       ├─ Ball: _isIdle = true, velocity = 0, sticky reset, clearedLevelsAccumulator = 0
       ├─ ComboManager: combo reset + heat reset
       └─ CoinService: clear all coins

[Game over → Tap to dismiss]
  └─ GameManager._dismissHighScoresAndRestart()
       ├─ _lives = maxLives, _score = 0
       ├─ Events.Restart (resets services)
       └─ _loadLevel(this._currentLevel)            // stays on current level, no regression
```

State variables that gate the loop (all on `GameManager`):
- `_showingTitleScreen` — true at boot until first tap
- `_showingHighScores` — true between BallLost (lives=0) and next tap
- `_waitingForCoins` — true between LevelCleared and _finishLevelTransition

---

## Game Flow (State Machine)

Five states, all managed by `GameManager`. Transitions are driven by tap events and internal signals.

```
[TITLE SCREEN]
   │  tap
   ▼
[PLAYING] ──── all bricks destroyed ────► [LEVEL CLEARED]
   │                                        │  coins drained + 1 s
   │  ball lost                             ▼
   │                               _loadLevel(next) → [PLAYING]
   ├── lives > 0 ──► [RESET ROUND]
   │                    │  tap → [PLAYING] (same level, lives intact)
   │
   └── lives = 0 ──► [GAME OVER]
                        │  tap → reset score + lives → [PLAYING] (same level)
```

| State | Flag / condition | Entry | Exit |
|---|---|---|---|
| **Title Screen** | `_showingTitleScreen = true` | boot | first tap |
| **Playing** | all flags false | `_loadLevel()` | ball lost or all bricks destroyed |
| **Reset Round** | none (transient) | `Events.ResetRound` | next tap |
| **Level Cleared** | `_waitingForCoins = true` | `_advanceLevel()` | `activeCoinCount === 0` + 1 s |
| **Game Over** | `_showingHighScores = true` | `Events.BallLost` with lives = 0 | next tap |

On **Game Over**, the leaderboard is submitted via `LeaderboardEvents.LeaderboardSubmitScore` and displayed via `LeaderboardEvents.LeaderboardDisplayRequest`. The player restarts on the level they died on (no regression), with score reset to 0.

---

## Ball Physics

**Owner:** `Scripts/Components/Ball.ts`

- Base speed `BALL_SPEED_BASE = 8.5` units/s, multiplied by `BallPowerService.speedMultiplier` and the per-level `ballSpeedMultiplier`, plus a per-brick speed bonus.
- **Substep count** = `min(8, ceil(speed * dt / radius))` — guarantees the ball never travels more than one radius per substep.
- **Wall bounce:** clamps inside `BOUNDS` and flips the corresponding axis; floor (`ny - r <= BOUNDS.y`) emits `Events.BallLost`.
- **Paddle bounce:** angle = `hitFactor * (π/3)`, where `hitFactor = (ballX − paddleCenterX) / (paddleHalfWidth)`. Bounce only happens when `_velocity.y < 0` (ball moving down).
- **Brick bounce:** computes X and Y overlap depth between the ball AABB and the brick AABB; flips the axis with the smaller overlap. Velocity sign check prevents double-flip when ball is already moving away.
- **Bounce randomness:** if `physics.bounceRandomness > 0`, applies a random angular jitter (0–90° at value 1.0) on each bounce. Default 0 (deterministic).
- **Pierce:** if `BallPowerService.pierceCount > 0`, brick collisions skip the bounce and call `BallPowerService.consumePierce()` (drains 2 heat).
- **Gravity:** `physics.gravity` is applied per substep to `vy`. Default 0.
- **Progressive difficulty:** each level cleared adds `0.05` to `_speedMultiplier` (capped only by the heat curve and pierce thresholds). Resets on `BallLost`.

### Sticky mode

`StickyBallState` tracks two flags: `_active` (sticky power-up is on) and `_stuck` (ball is currently attached). On paddle collision, `tryStick` captures the X offset and returns true. While stuck, `getConstrainedPosition` overrides ball position to follow the paddle. On tap, `_launch` reads the offset and computes the launch angle the same way as a paddle bounce.

---

## Coins & Vacuum

**Owner:** `Scripts/Services/CoinService.ts`

- On `Events.BrickDestroyed`: spawns `COIN_MIN + floor(rand * COINS_PER_BRICK)` = 1 to 3 coins with scatter `COIN_SCATTER = 1.5`, initial Vy = `−1` plus random −1.5, no initial Vx beyond ±1.5.
- Coins are virtual — not entities. They are rendered each frame through `VfxService.spawnParticle(...)` and have no collider.
- **Vacuum (normal):** within `VACUUM_RADIUS = 3.5` units of paddle, coins are pulled directly toward the paddle center. Radial speed is preserved; tangential speed is multiplied by `1 − TANGENT_DAMPING` (i.e. damped by 85%) — no orbiting.
- **Vacuum (super):** activated by `GameManager._advanceLevel()` on level clear. Pulls all coins at constant `SUPER_VACUUM_FORCE = 25` regardless of distance, until `activeCoinCount === 0`.
- **Collection:** when distance to paddle < `COLLECT_RADIUS = 0.5`, fires `Events.CoinCollected { value }` where `value = COIN_VALUE * (1 + comboCount * 0.5)` (=10 base, +50% per current combo level). Spawns 3 golden burst particles and re-emits `Events.PaddleHit` for flash.
- **Lifetime:** `COIN_MAX_LIFE = 6` seconds; coin is discarded if it falls below `BOUNDS.y − 1`. Super-vacuum ignores both expirations.
- **Combo coupling:** `_comboCount` is incremented by `ComboHUDEvents.IncrementCombo` and reset on `PaddleHit` (with `ballVelocityY !== 0`). Higher combo → higher coin value.

---

## Combo & Heat

**Owner:** `Scripts/Components/ComboManager.ts`

| Counter | Increments on | Resets on |
|---|---|---|
| Combo | `Events.BrickDestroyed` | `Events.ResetRound` (paddle hit triggers ResetRound when ball goes back up? NO — see below), `BallLost`, `Restart` |
| Heat | `Events.BrickDestroyed` | `Events.BallLost`, `Events.Restart` only — survives paddle hits |

Notes:
- `Events.ResetRound` is emitted by `GameManager` on `BallLost` (not on paddle hit), so in practice combo resets only on ball death.
- `CoinService` separately resets its own `_comboCount` on `Events.PaddleHit` for the score-multiplier calculation. This is a different counter from `ComboManager._combo`.

`ComboManager` emits `ComboHUDEvents.IncrementCombo` and `HeatEvents.IncrementHeat` events; `BallPowerService` subscribes to `HeatEvents` directly.

---

## Ball Power (Speed + Pierce)

**Owner:** `Scripts/Services/BallPowerService.ts`

`speedMultiplier` (read by `Ball._effectiveSpeed`):
```
baseSpeed     = min(POWER_MAX_SPEED_BASE, 1 + POWER_SPEED_SCALE * log(1 + heat * POWER_SPEED_RATE))
              = min(2.0, 1 + 0.621 * log(1 + heat * 0.2))
speedMult     = baseSpeed + pierceCount * POWER_PIERCE_SPEED_BONUS  (bonus is 0 by default)
```
At heat = 20 the curve reaches the cap of 2.0×.

`pierceCount` (max bricks the ball passes through per frame):

| Heat ≥ | Pierces |
|---|---|
| 20 | 3 |
| 10 | 2 |
| 5 | 1 |
| < 5 | 0 |

`consumePierce()` is called by `Ball` each time a pierce is actually used. It drains `PIERCE_COMBO_COST = 2` heat per brick — bulldozer mode is powerful but self-limiting.

---

## Bricks

**Owner:** `Scripts/Components/Brick.ts`. Subclass: `ExplosiveBrick.ts`.

- Initialized by `Events.InitBrick` (sent from `LevelLayout._layoutLevel`): sets HP, indestructible flag, color palette, reveal delay/style, title-anim flag.
- HP defaults to 1; color palette keyed by remaining HP allows multi-hit color steps. `indestructible: true` makes the brick visually present but never destructible.
- Collision is **disabled during the reveal animation** — `CollisionManager.register(this)` is called only when the reveal completes. This prevents the ball from hitting an invisible brick.
- **Death:** on HP=0, unregisters from `CollisionManager`, emits `Events.BrickDestroyed`, then runs the death animation (0.15s shrink + Z-spin). When the animation completes, emits `Events.BrickRecycle` and parks the entity off-screen for pool reuse.
- **Reveal styles** (`RevealStyle` enum): Pop, DropIn, Spin, Stretch. Each is a private method `_revealPop`/`_revealDropIn`/`_revealSpin`/`_revealStretch` invoked with `t ∈ [0,1]`.

### Explosive bricks

`ExplosiveBrick` extends `Brick` and overrides `triggerDestruction()` + `onDestroyBrick()`:
- Module-level `Set<ExplosiveBrick>` (`_explodingBricks`) prevents infinite chain recursion.
- On destruction, queries `CollisionManager.query(pos, explosionRadius)` for adjacent bricks (default radius 1.0), calls `triggerDestruction()` on each.
- Emits `Events.ExplosionChain { position, chainSize }` for scaled juice (longer freeze, bigger shake).
- Not currently referenced by any `LevelConfig` — see "Re-enabling explosive bricks" below to use it.

---

## Levels

**Owner:** `Scripts/LevelConfig.ts` (data) + `Scripts/Components/LevelLayout.ts` (runtime).

`LevelConfig` per-level fields (all optional except `brickTemplates` and `grid`):

| Field | Default | Purpose |
|---|---|---|
| `brickTemplates` | required | char → `{ asset, hits, indestructible, colors }` |
| `grid` | required | newline-separated string; `0` and space = empty cell |
| `brickWidth` / `brickHeight` | 1.2 / 0.4 | cell size |
| `paddingX` / `paddingY` | 0.1125 / 0.1125 | gap between cells |
| `startY` | 4 | Y center of the first (top) row |
| `powerUpSpawnChance` | 0.2 | probability per destroyed brick (`PowerUpManager` currently ignores this and returns early — see below) |
| `powerUps` | `[BigPaddle:1, Sticky:1]` | weighted selection table |
| `victory` | `{ kind: 'allBricksDestroyed' }` | win condition |
| `physics` | see `LEVEL_DEFAULTS` | `ballSpeedMultiplier`, `gravity`, `bounceRandomness`, `paddleSpeedMultiplier`, `paddleLerpFactor`, `ballSpeedIncrementPerBrick` |
| `gameplay` | — | `ballSizeMultiplier`, `paddleWidthMultiplier` |
| `palette` | `DEFAULT_PALETTE` | `ball`, `paddle`, `background` (RGB triplets 0–1) |
| `livesOverride` | undefined | per-level life count override |

Title screen layout is `Title` (also in `LevelConfig.ts`) — uses a 15×~20 small-brick grid spelling "BRICK IT DOWN" with a 15-color rainbow gradient.

### Layout algorithm (`LevelLayout._layoutLevel`)

1. Park all currently active bricks back into the pool.
2. Compute total width = `cols * brickWidth + (cols−1) * paddingX`; `originX = −totalW/2 + brickWidth/2`.
3. Apply background color from `palette.background`.
4. Pick a random `RevealStyle` and a random delay pattern (1 of 5) for the whole level.
5. For each non-empty cell, `_acquire()` a brick from the pool, set its world position and `localScale`, send `Events.InitBrick` with the reveal delay computed from (row, col).

### Victory conditions

Handled in `GameManager._checkVictory()`:
- `allBricksDestroyed`: `_bricksDestroyedThisLevel >= _destructibleBrickCount`
- `bricksDestroyed`: `_bricksDestroyedThisLevel >= victory.count`
- `survivalTime`: counted down in `GameManager.onUpdate`; triggers `_advanceLevel()` when reaching 0.

Indestructible bricks are excluded from `_destructibleBrickCount` by `_countDestructibleBricks`.

---

## Paddle

**Owner:** `Scripts/Components/Paddle.ts`.

- Reads touch input from `OnFocusedInteractionInputMovedEvent` (single-finger drag). Ray-casts to the paddle's Z plane and sets `_targetPosition`.
- Per-frame `lerp(currentX, targetX, _lerpFactor)` where `_lerpFactor` comes from level physics (default 0.88).
- Clamped against `BOUNDS` using `_normalScale.x` (NOT the current squash scale) to prevent visual clipping at edges.
- **Squash & stretch:**
  - Impact squash on ball collision: scale → (1.3, 0.7) over 0.08s, recover over 0.15s.
  - Movement stretch: scale.x += `min(|smoothVelocity| * STRETCH_FACTOR, 0.3)`; scale.y compresses slightly (`-stretchAmount * 0.3`).
- **Color flash:** on ball collision, color jumps to white for 50ms then restores to `_baseColor` (from level palette).
- **Power-up dispatch:** `Events.PowerUpCollected` → `createPaddleEffect(type)` from `PaddleEffects.ts`. Effects implement `IPowerUpEffect` (`onStart`, `onEnd`, optional `onStackChanged`). `BigPaddle` is stackable; each instance has its own timer. `StickyPaddle` is non-stackable.

---

## Audio

**Owner:** `Scripts/Services/AudioManager.ts`. Helper: `Scripts/Components/AudioSource.ts`.

### Architecture

- Scene entities each carry a `SoundComponent` (asset assigned, `autoStart = false`) plus an `AudioSource` component with a `soundId: string`.
- On entity start, `AudioSource` calls `AudioManager.register(soundId, entity)` — the manager stores the `SoundComponent` in a `Map<string, SoundComponent[]>`.
- Multiple entities can share the same `soundId` — they are pooled and played round-robin (`_soundIndex`) to avoid clipping on rapid-fire sounds.
- `AudioManager.register` auto-starts the music with `playMusic(SFX.MUSIC, 1)` if the registered sound has `soundId === SFX.MUSIC`.

### Sound IDs (all in `SFX` const)

| Category | IDs | Trigger |
|---|---|---|
| Ball | `sfx_paddle_hit`, `sfx_ball_launch`, `sfx_ball_lost` | `PaddleHit` (pitch from \|vY\|), `ReleaseBall`, `BallLost` |
| Bricks | `sfx_brick_hit`, `sfx_brick_destroyed`, `sfx_explosion_chain` | `BrickHit` (vol 0.7), `BrickDestroyed` (pitch 0.85–1.15), `ExplosionChain` (vol/pitch scale with chainSize) |
| Power-ups | `sfx_powerup_collected`, `sfx_sticky_activated`, `sfx_sticky_deactivated` | `PowerUpCollected`, `StickyPaddleActivated/Deactivated` |
| Coins | `sfx_coin_collected` | `CoinCollected` (vol 0.6) |
| Combo | `sfx_combo_2/5/10/15` | `ComboHUDEvents.IncrementCombo` at threshold |
| Heat | `sfx_heat_5/10/20` | `HeatEvents.IncrementHeat` at exact level |
| Game state | `music`, `sfx_level_start`, `sfx_level_cleared`, `sfx_game_over`, `sfx_restart`, `sfx_message_show` | Various lifecycle events |

### Music

- `playMusic(soundId, fadeIn)` — `loop = true`, fade-in via `SoundPlayInfo.fadeInDuration`.
- `stopMusic(soundId, fadeOut)` — `sound.stop(fadeOut)`.
- Auto-starts on register; stops on `LoadLevel` (fade 1s); resumes on `ShowHighScores` (fade 1s).

### Adding a new sound

1. Create a scene entity in the editor with a `SoundComponent` (asset assigned, `autoStart = false`).
2. Add an `AudioSource` component; set `soundId = 'your_id'`.
3. Add the ID to the `SFX` object in `AudioManager.ts`.
4. Add a `@subscribe` handler in `AudioManager` that calls `this.playSound(SFX.YOUR_ID, volume?, pitch?)`.

---

## HUD

**Files:** `Scripts/Components/{GameHUDViewModel,ComboHUDViewModel,BackgroundAnimViewModel,HighScoreHUDViewModel}.ts` + `UI/{GameHUD,ComboHUD,Background,HighScoreHUD}.xaml`.

| ViewModel | Bindings / Behavior |
|---|---|
| `GameHUDViewModel` | Score (casino roll-up + scale punch + golden glow), lives hearts, center text (DVD bounce ±300px, squash on wall hit), `showScore` toggle (hidden until first `LoadLevel`) |
| `ComboHUDViewModel` | Combo counter, pop-in to 6× overflow scale at ~18% opacity, neon color tier (cyan @2, hot pink @5, magenta @10, gold @15), shake + glow, fade between hits |
| `BackgroundAnimViewModel` | Hue-cycling overlay, pulses destroyed brick's color on `Events.BrickDestroyed`, top-concentrated gradient (fades to transparent at bottom), idle decay to neutral after 1.5s |
| `HighScoreHUDViewModel` | ItemsControl-backed leaderboard, staggered right-to-left slide-in (ViewModel-driven lerp, NOT XAML storyboard), top 3 medal colors, current player row highlighted gold/white, 240px bottom margin to keep GameHUD score visible |

---

## Leaderboard

**Owner:** `Scripts/Services/LeaderboardManager.ts`. Leaderboard name: `'score'`.

### Server-side (Networking is server-context)

1. `OnPlayerCreateEvent` → `_serverFetchAndBroadcast(payload.entity)` pre-fetches a 10-entry window centered on the player's rank.
2. `LeaderboardEvents.LeaderboardSubmitScore` → only updates the leaderboard if the new score beats the player's existing entry (or there's no existing entry). Then re-fetches and broadcasts.
3. Broadcast is `LeaderboardEvents.LeaderboardEntriesFetched` (NetworkEvent) sent globally.

### Client-side

1. On `LeaderboardEntriesFetched` → cache `entries`. If `_isDisplaying` is true, immediately emit `HighScoreHUDEvents.ShowHighScores`.
2. On `LeaderboardDisplayRequest` → if cache has entries, show; otherwise emit empty entries, then try `fetchEntryForPlayer` as a fallback to show at least the local player.
3. `HighScoreHUDEvents.HideHighScores` → resets `_isDisplaying`.

The 10-entry window is centered using `CENTER_OFFSET = 5`: `startingRank = max(0, myRank − 5)`.

---

## Juice (Feedback Layer)

**Owner:** `Scripts/Services/JuiceService.ts`, plus `CameraShakeService.ts` and `VfxService.ts`.

| Event | Hit Freeze | Camera Shake (intensity, duration) | Particles |
|---|---|---|---|
| `BrickHit` | 0.02s | (0.04, 0.08) | `BRICK_CRACK_COUNT = 2` colored debris |
| `BrickDestroyed` | 0.04s | (0.08, 0.15) | `VFX_IMPACT_COUNT = 3` colored bursts (spawned by `VfxService`, not `JuiceService`) |
| `PaddleHit` | — | (0.03, 0.06) | `PADDLE_SPARK_COUNT = 4` directional white sparks |
| `ExplosionChain` | 0.10s × (0.5 + chainSize×0.1) | (0.25 × (0.6 + chain×0.08), 0.35) | Chain bricks handle their own particles |
| `BallLost` | 0.06s | (0.20, 0.35) | — |

Hit-freeze sets `JuiceService.frozen = true`; `Ball.onUpdate` early-returns while frozen, suspending physics for the freeze duration.

---

## Re-enabling Power-Ups (currently disabled)

The power-up system is built and complete, but turned off by default. To re-enable:

1. **Register the templates** in `Scripts/Assets.ts`:
   ```typescript
   export const PowerUpAssets = {
     BigPaddle:    new TemplateAsset('@Templates/GameplayObjects/BigPaddle.hstf'),
     StickyPaddle: new TemplateAsset('@Templates/GameplayObjects/StickyPaddle.hstf'),
   } as const;
   ```
   The key must match the `PowerUpType` enum name exactly.

2. **Wire the spawn call** in `Scripts/Components/PowerUpManager.ts` (currently the `onBrickDestroyed` handler returns early). Replace its body with:
   ```typescript
   if (Math.random() > this._spawnChance) return;
   this._spawnPowerUp(_payload.position);
   ```
   `_spawnPowerUp` and `_selectRandom` are already implemented.

3. **Enable per level** by setting `powerUpSpawnChance > 0` in any `LevelConfig` entry (e.g. `powerUpSpawnChance: 0.2`). Optionally override `powerUps: [{ type, weight, powerUpDuration }, ...]` to change weights or types.

To add a new power-up type:
- Add a value to `PowerUpType` in `Scripts/Types.ts`.
- Add an `IPowerUpEffect` class to `Scripts/Components/PaddleEffects.ts` and extend `createPaddleEffect()` switch.
- Create the `.hstf` template under `Templates/GameplayObjects/` and add it to `PowerUpAssets` with the matching key.

---

## Re-enabling Explosive Bricks

The `ExplosiveBrick.ts` component is fully working but no `LevelConfig` references it.

1. Create a template asset entry in `Scripts/Assets.ts`:
   ```typescript
   export const BrickAssets = {
     Normal:    new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
     Explosive: new TemplateAsset('@Templates/GameplayObjects/ExplosiveBrick.hstf'),
   } as const;
   ```
   Note: the prefab `Templates/GameplayObjects/ExplosiveBrick.hstf` exists on disk. The `LevelLayout` pre-warms only `BrickAssets.Normal`, so this path will require extending `_prewarmPool` to also pool explosive bricks (or spawning on demand without pooling, which is slower).

2. Reference it in a level's `brickTemplates`:
   ```typescript
   'E': { asset: BrickAssets.Explosive, hits: 1, colors: { 1: [1, 0.3, 0] } }
   ```

---

## Extending: Adding a New Level

1. Open `Scripts/LevelConfig.ts`.
2. Append a new `LevelConfig` literal to the `LEVELS` array. Required: `brickTemplates`, `grid`. Recommended: `palette`, `brickWidth/brickHeight/paddingX/paddingY/startY`, `physics`.
3. The level is automatically inserted into the infinite cycle — `GameManager._finishLevelTransition` uses `(currentLevel + 1) % LEVELS.length`.

Grid characters: `0` and space = empty. Any other character must be a key in `brickTemplates`.

---

## Extending: Adding a New Victory Type

1. Add a new variant to the `VictoryCondition` union in `Scripts/LevelConfig.ts`.
2. Initialize any per-level state in `GameManager._initLevelState` (called on `_loadLevel`).
3. Add a branch to `GameManager._checkVictory()` (event-driven) or `GameManager.onUpdate()` (per-frame, like `survivalTime`).
4. Call `_advanceLevel()` when the condition is met.

---

## Known Issues

None at this time.
