---
name: 2d_games_in_mhe
summary: Overarching guide for creating 2D games in Meta Horizon Engine using DrawingSurface, XAML UI, and touch input
include: always
agents: [global]
---

# 2D Game Development in Meta Horizon Engine

This is the master guide for building 2D games using the DrawingSurface API in Meta Horizon Worlds. 2D games are built entirely through TypeScript scripting with three core systems:

1. **DrawingSurface** — Immediate-mode 2D rendering (game world, characters, effects)
2. **Standard XAML UI** — Menus, HUD, buttons, overlays (all traditional UI)
3. **FocusedInteractionService** — Touch input with coordinate mapping

## 🛑 MANDATORY: Plan Before You Build

**Before writing ANY code, you MUST complete these planning steps in order.** Do not skip or combine them. This prevents confusion and wasted effort during implementation.

### Step 1: Write the Game Design Document

Create a `docs/` folder inside the game package (if it doesn't exist) and write a **Game Design Document** (GDD) to `docs/game_design.md`. This document is language-agnostic — it describes WHAT the game is, not HOW it's coded. It must include:

1. **Game Overview** — One-paragraph description of the game, genre, and core gameplay loop
2. **Controls** — How the player interacts (tap, swipe, drag, hold, etc.)
3. **Game Objects** — Every entity in the game (player, enemies, collectibles, obstacles, projectiles, etc.) with descriptions of appearance and behavior
4. **Game Flow / States** — Title screen → Playing → Paused → Game Over → Restart. Describe what happens in each state and how transitions work
5. **Scoring & Progression** — How the player earns points, what causes difficulty to increase, level/wave system if any
6. **Visual Style** — Art direction, color palette, mood. Remember: use sprites for nearly everything visual (see Sprite-First Strategy below)
7. **Sprite Asset List** — Enumerate EVERY sprite that needs to be generated: characters, enemies, backgrounds, logos, title text, HUD labels ("SCORE", "HEALTH", etc.), icons, game objects. This is the most important section for implementation
8. **UI Layout** — What XAML UI elements are needed (menus, HUD, overlays) vs what is rendered on the DrawingSurface canvas
9. **Sound / Music** — Any audio requirements (optional)
10. **Canvas Dimensions** — Portrait (480×800), landscape (800×480), or square (600×600)

### Step 2: Write the Execution Plan

After the GDD is complete, write an **Execution Plan** to `docs/execution_plan.md`. This document describes HOW you will build the game, broken into ordered tasks. It must include:

1. **Task List** — A numbered checklist of every implementation task, in dependency order. Each task should be small and specific (e.g., "Create GameViewModel with state properties", not "Build the game"). Mark each task with a status:
   - `[ ]` — Not started
   - `[x]` — Completed
2. **File Plan** — Which TypeScript/XAML files will be created and what each contains (keep all files under 1000 lines)
3. **Rendering Strategy** — For each visual element, whether it uses DrawingSurface (sprites or vectors) or standard XAML UI
4. **Sprite Generation Plan** — Which sprites to generate first (before any code that references them)

**Example task list structure:**
```markdown
## Tasks

- [x] 1. Create docs/game_design.md
- [x] 2. Create docs/execution_plan.md
- [ ] 3. Generate sprite assets (player, enemies, background, logo, HUD labels)
- [ ] 4. Process sprites (remove backgrounds, crop to content)
- [ ] 5. Create Constants.ts (canvas size, colors, speeds)
- [ ] 6. Create Types.ts (interfaces for game objects)
- [ ] 7. Create GameViewModel.ts (UI state, events)
- [ ] 8. Create game.xaml (fullscreen layout, DrawingSurface, XAML UI overlays)
- [ ] 9. Create GameRenderer.ts (all draw functions)
- [ ] 10. Create GameComponent.ts (game loop, input, state management)
- [ ] 11. Test and iterate
```

### Step 3: Execute the Plan

Work through the execution plan tasks **in order**. After completing each task, **update `docs/execution_plan.md`** by marking the task as `[x]` completed. This keeps the plan in sync with reality and helps you stay oriented if the implementation is complex.

**⚠️ If you realize mid-implementation that the plan needs to change** (new tasks, reordering, removing tasks), update the execution plan document FIRST, then continue.

### Step 4: When Modifying an Existing Game

If the user asks to modify or remix an existing game:
1. Read the existing code to understand the current architecture
2. Write (or update) `docs/game_design.md` with the changes
3. Write (or update) `docs/execution_plan.md` with the modification tasks
4. Execute the plan, updating task status as you go

## 🎨 REQUIRED: Sprite-First Visual Strategy

**Generated sprite images should be the DEFAULT for virtually all visual game elements.** Sprites look significantly better than procedural vector graphics or plain text and should be used for:

- **Characters** — Player characters, enemies, NPCs, bosses
- **Game objects** — Collectibles, obstacles, projectiles, power-ups
- **Backgrounds** — Environments, terrain, sky, ground
- **Logos and titles** — Game title, "Game Over", "You Win" graphics
- **HUD labels** — Stylized labels like "SCORE", "TIME LEFT", "HEALTH" rendered as sprite images rather than plain text
- **Icons** — Hearts, stars, coins, arrows, and any symbolic UI element

Use the **sprites** skill and `generate_image_bulk` / `remove_image_background` / `crop_image_to_content` tools to create these assets.

### When NOT to Use Sprites

- **Gameplay instructions or tutorial text** — Use standard XAML `<TextBlock>` or DrawingSurface `drawText()` for longer explanatory text that needs to be readable
- **Dynamic numeric values** — The actual score number (e.g., "1250"), timer countdown, health points — use `drawText()` or XAML `<TextBlock>` since these change every frame
- **User-requested vector/path graphics** — If the user specifically asks for procedural or path-based art, honor that request
- **Simple geometric gameplay elements** — If the game mechanic inherently uses simple shapes (e.g., a Pong paddle, Tetris blocks), path graphics are acceptable
- **Particle effects** — Small, numerous, short-lived particles can use simple vector primitives for performance

### Example: Sprite-First Approach

Instead of rendering a score HUD with plain text:
```typescript
// Acceptable but plain
this.builder.drawText('SCORE', 10, 10, 100, 30, 16, textBrush, font);
this.builder.drawText(String(this.score), 80, 10, 100, 30, 24, textBrush, font);
```

Generate a stylized "SCORE" label sprite and combine it with dynamic text:
```typescript
// Better — stylized sprite label + dynamic number
const scoreLabelBrush = new ImageBrush(this.scoreLabelSprite);
this.builder.drawRect(scoreLabelBrush, null, 10, 8, 70, 24);
this.builder.drawText(String(this.score), 85, 10, 100, 30, 24, textBrush, font);
```

## Rendering Strategy Quick Reference

**DrawingSurface (Game Graphics Only):**
- Game world, backgrounds, terrain
- Player characters, enemies, game objects
- Projectiles, particles, animations
- Anything requiring per-frame procedural or sprite-based drawing

**Standard XAML UI (All UI Elements):**
- Title screens / Start menus
- HUD elements (score, timer, health, ammo)
- Pause menus / Game over screens
- Buttons (start, restart, settings)
- Dialog boxes, inventory, settings

## Architecture Overview

The system consists of these main parts:

1. **XAML Layout** — Defines the UI structure with a `<local:DrawingSurface>` element for game rendering and standard XAML controls for UI
2. **UiViewModel** — Bridges TypeScript game state to XAML data binding
3. **DrawingCommandsBuilder** — TypeScript API that constructs drawing commands for the game canvas
4. **FocusedInteractionService** — Captures touch input with precise coordinates
5. **Component** — Game logic, loop, and state management

## Skills Reference

### Essential (Always Loaded)

| Skill | Summary | When to Use |
|-------|---------|-------------|
| **drawing_surface** | DrawingSurface overview, full API reference (brushes, pens, fonts, primitives, transforms, ImageBrush) | When writing any draw calls or understanding the rendering system |
| **xaml_and_ui** | XAML layout, fullscreen pattern, standard UI controls, UiEvent button pattern, visibility bindings | When setting up game UI structure, menus, HUD, or buttons |
| **viewmodel** | UiViewModel setup, data binding, connecting ViewModel to components | When bridging TypeScript state to XAML |
| **touch_input** | FocusedInteractionService, coordinate mapping, input patterns | When implementing touch controls |
| **complete_example** | Full working game template with checklist | When starting a new game |

### On-Context (Loaded When Relevant)

| Skill | Summary | When to Use |
|-------|---------|-------------|
| **game_loop_and_physics** | Game loop, timing, collision detection, physics, grid logic | When implementing game logic |
| **rendering_patterns** | Sprites, animations, layering, visual effects, tile maps | When drawing game graphics |
| **game_mechanics** | Scoring, levels, power-ups, state machines, spawning, camera | When implementing game mechanics |
| **svg_paths** | SVG path syntax for custom shapes | When using drawPath() |
| **multiplayer** | Networked multiplayer patterns | When adding multiplayer |
| **sprites** | Sprite generation tool usage | When creating sprite assets |

## Common Tasks Quick Links

| Task | Primary Skill | Related Skills |
|------|---------------|----------------|
| Set up fullscreen game | xaml_and_ui | drawing_surface |
| Implement touch controls | touch_input | viewmodel |
| Draw sprites/images | drawing_surface | rendering_patterns |
| Add collision detection | game_loop_and_physics | — |
| Create animated characters | rendering_patterns | drawing_surface |
| Add scoring/levels | game_mechanics | viewmodel |
| Build title/menu screens | xaml_and_ui | viewmodel |
| Build HUD elements | xaml_and_ui | viewmodel |
| Handle button clicks | xaml_and_ui | viewmodel |
| Add multiplayer | multiplayer | — |
| Debug touch offset issues | touch_input | — |

## File Structure

```
your_game_package/
├── docs/
│   ├── game_design.md          (game design document - written first)
│   └── execution_plan.md       (task checklist - written second, updated during implementation)
├── scripts/
│   ├── Assets.ts               (AssetDependency declarations for all texture assets)
│   ├── GameComponent.ts
│   └── GameComponent.ts.assetmeta  (auto-generated)
├── sprites/                    (generated sprite images, descriptively named)
│   ├── player.png
│   ├── enemy_slime.png
│   ├── background.png
│   └── label_score.png
├── xaml/
│   ├── game.xaml
│   └── game.xaml.assetmeta  (auto-generated)
└── space.hstf  (scene file with CustomUiComponent)
```

## ⚠️ General Pitfalls

These pitfalls apply broadly and don't fit neatly into a single topic skill.

### TypeScript Files Must Be Under 1000 Lines

**Problem:** Horizon Assistant times out when attempting to add to or modify TypeScript files with 1000 lines or more.

**Rule:** **Keep ALL TypeScript files under 1000 lines.** This is a hard limit.

**Solution:** Split large files into multiple smaller files with logical separation of concerns.

```
your_game_package/
├── scripts/
│   ├── GameComponent.ts      # Main component, game loop, initialization (<200 lines)
│   ├── GameViewModel.ts      # ViewModel and UI bindings (<100 lines)
│   ├── Assets.ts             # AssetDependency declarations for all textures (<100 lines)
│   ├── GameState.ts          # Game state management (<200 lines)
│   ├── Player.ts             # Player class and logic (<150 lines)
│   ├── Enemies.ts            # Enemy types and AI (<300 lines)
│   ├── Combat.ts             # Combat system, projectiles, collisions (<250 lines)
│   ├── Rendering.ts          # Drawing functions and visual effects (<300 lines)
│   ├── Input.ts              # Touch input handling (<150 lines)
│   ├── Audio.ts              # Sound effects and music (<100 lines)
│   └── Constants.ts          # All game constants (<100 lines)
```

**Recommended file organization:**

| File | Contents | Target Lines |
|------|----------|--------------|
| `GameComponent.ts` | Main component class, lifecycle methods, game loop | < 300 |
| `GameViewModel.ts` | ViewModel class, UI state properties, commands | < 150 |
| `Assets.ts` | AssetDependency declarations and TextureAsset exports for all textures | < 100 |
| `GameState.ts` | Game state interface, state management functions | < 200 |
| `Player.ts` | Player class, movement, abilities | < 200 |
| `Enemies.ts` | Enemy classes, AI behaviors, spawning | < 300 |
| `Combat.ts` | Projectiles, collisions, damage calculations | < 300 |
| `Rendering.ts` | All draw functions, visual effects, animations | < 400 |
| `Input.ts` | Touch handling, coordinate mapping, gestures | < 200 |
| `Constants.ts` | All constants (colors, sizes, speeds, etc.) | < 150 |
| `Types.ts` | Interfaces, type definitions, enums | < 150 |

### Hardcoded Magic Numbers

**Problem:** Difficult to maintain and adjust game feel.

```typescript
// ❌ WRONG - Magic numbers scattered throughout
if (this.frameCount % 58 === 0) {
  this.playerY += 3.5;
  if (this.score > 1000) { ... }
}

// ✅ CORRECT - Named constants at module level
const kDropIntervalFrames = 58;
const kMoveSpeed = 3.5;
const kScoreThreshold = 1000;

if (this.frameCount % kDropIntervalFrames === 0) {
  this.playerY += kMoveSpeed;
  if (this.score > kScoreThreshold) { ... }
}
```

### Modifying Arrays During Iteration

**Problem:** Skipped elements or index errors when removing items.

```typescript
// ❌ WRONG - Forward iteration with splice
for (let i = 0; i < this.bullets.length; i++) {
  const b = this.bullets[i];
  b.life--;
  if (b.life <= 0) {
    this.bullets.splice(i, 1);  // Skips next element!
  }
}

// ✅ CORRECT - Iterate backwards when removing
for (let i = this.bullets.length - 1; i >= 0; i--) {
  const b = this.bullets[i];
  b.life--;
  if (b.life <= 0) {
    this.bullets.splice(i, 1);  // Safe - earlier indices unaffected
  }
}
```

### Division by Zero

**Problem:** NaN values corrupt game state.

```typescript
// ❌ WRONG - Potential division by zero
const percent = current / max;

// ✅ CORRECT - Guard against zero
const percent = max > 0 ? current / max : 0;

// For normalization:
const len = Math.sqrt(dx * dx + dy * dy);
if (len > 0) {
  dx /= len;
  dy /= len;
}
```

### Missing Event Subscription Decorator

**Problem:** Event handlers never trigger.

```typescript
// ❌ WRONG - Missing @subscribe decorator
onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
  // This never gets called!
}

// ✅ CORRECT - Include decorator
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
  // Now it works
}
```

### Forgetting to Set Premultiply Alpha on Sprite Assets

**Problem:** Sprites do not have transparency and have colored borders in game

**Cause:** The **Premultiply Alpha** setting was not enabled on the texture asset in the editor. This is the most commonly forgotten step when adding sprites to a game.

**Solution:** After importing every sprite texture asset into the project, you MUST enable **Premultiply Alpha** in the asset's properties in the editor. This is a setting on the asset itself — it cannot be set in code or at runtime.

### Using Variables or Templates in TextureAsset Constructor

**Problem:** Sprites silently fail to load. The game runs but no images appear.

**Cause:** The `TextureAsset` constructor requires a **static string literal**. Variables, template expressions (`` `${var}/file.png` ``), function calls, and string concatenation are NOT allowed.

```typescript
// ❌ WRONG - template expression
const SPRITES = '@sprites';
new TextureAsset(`${SPRITES}/player.png`);

// ❌ WRONG - variable
const path = '@sprites/player.png';
new TextureAsset(path);

// ❌ WRONG - function call
new TextureAsset(getPath('player'));

// ✅ CORRECT - static string literal
new TextureAsset("@sprites/player.png");
```
