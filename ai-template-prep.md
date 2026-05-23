# Skill: AI Template Preparation

**Purpose:** Prepare a Meta Horizon Studio (MHS) game project to be published as an AI Template on the Template Hub. This skill is executed by an AI agent. It is interactive — the agent MUST ask the user clarifying questions whenever required information is missing or ambiguous.

---

## Template File Structure Requirements

Before running any phase, understand where files must live for the Template Hub to pick them up:

| What | Required Location | Notes |
|---|---|---|
| Template docs | `/Docs/` folder — all `.md` files | `PROJECT_SUMMARY.md`, `ART_DIRECTION.md`, `GAMEPLAY.md`, `TASK_BOARD.yaml` |
| Skills | `/Assistant/Skills/` folder — all `.md` skill files | NOT `Docs/skills/` — must be at project root level |
| Assistant package | `package.json` — `dependencies` array | Must include `{ "name": "meta/assistant", "version": "*" }` |

**Skills folder path:** `Assistant/Skills/` (at project root, not inside `Docs/`). All skill `.md` files the agent creates go here.

---

## Overview of Steps

Run these phases **in order**. Each phase has a gate: if the gate condition is not met, resolve it (interactively if needed) before proceeding.

1. Audit project docs
2. Verify `package.json`
3. Rebuild `PROJECT_SUMMARY.md`
4. Rebuild `ART_DIRECTION.md`
5. Rebuild `GAMEPLAY.md`
6. Clean `TASK_BOARD.yaml`
7. Verify and create skills
8. Code hygiene pass
9. Constants & configurability audit
10. Asset audit
11. Final readiness check

---

## GenAI Writing Rules (Apply to ALL docs and skill files)

These rules apply to every document written or rewritten by this skill. They are not optional.

### Structure for machine parsing
- Use flat, scannable sections with `##` headers. Avoid deep nesting (no `####`).
- Prefer tables and bullet lists over prose paragraphs.
- Every section must have a clear, specific header — never "Overview" alone, always "Game Overview" or "Combat Overview".

### Use concrete values, not ranges
- Bad: "Enemies have moderate HP."
- Good: "Enemies have 80–400 HP depending on type and room depth."

### Name every system and file
- When describing a mechanic, always name the TypeScript file or class that owns it.
- Example: "Match detection is handled by `MatchDetector.ts`. Cascade logic runs in `MatchResolver.ts`."

### No history, no changelog
- Docs describe the **current state** of the game only.
- Never include "we used to do X", "this was changed from Y", or milestone history.
- Completed milestones belong in `TASK_BOARD.yaml` `done:` only.

### No aspirational content
- Docs describe what **exists now**, not what is planned.
- Planned features belong in `TASK_BOARD.yaml` `tasks:` only.
- Exception: `GAMEPLAY.md` may have a "Known Issues" section.

### Staleness rule
- Before writing any section, read the relevant source files to verify the information is current.
- If a doc section contradicts the code, the code wins. Rewrite the doc to match the code.
- If a doc section describes a feature that no longer exists in code, delete it.

---

## Phase 1 — Audit Project Docs

Read the following files (they may not all exist yet):

- `Docs/PROJECT_SUMMARY.md`
- `Docs/ART_DIRECTION.md`
- `Docs/GAMEPLAY.md`
- `Docs/TASK_BOARD.yaml`
- Any other `.md` files in `Docs/`
- `package.json` (project root)
- Any existing skill files in `Assistant/Skills/`

Also read the main script files to understand the current state of the codebase:
- `scripts/Constants.ts` (or equivalent)
- `scripts/Types.ts` (or equivalent)
- Any catalog files (`Assets.ts`)

**Gate:** If no docs exist at all, ask the user:
> "I don't see any project docs yet. Can you describe the game — its genre, core loop, and visual style — so I can create them?"

Use the answer to seed Phases 3–5.

---

## Phase 2 — Verify package.json

The `meta/assistant` package must be declared as a dependency for the Template Hub to recognize this project as an AI Template.

### Check

Read `.meta/package.json`. Verify the `dependencies` array contains:

```json
{
    "name": "meta/assistant",
    "version": "*"
}
```

Remove any provisional/experimental package, parse the code to find if any provisional/experimental code is being used and ask the user ways to remove them.

### Fix

If the entry is missing, add it to the `dependencies` array. Do not modify any other entries.

If `package.json` does not exist, ask the user:
> "I can't find a package.json at the project root. Can you point me to it?"

---

## Phase 3 — Rebuild PROJECT_SUMMARY.md

`PROJECT_SUMMARY.md` is the primary orientation file for any AI agent working on this project. It must describe the current state of the game accurately and completely. **Rewrite it from scratch** using the current codebase as the source of truth — do not preserve stale content.

### Required Sections (in this order)

#### 1. Header block
```markdown
# Project Summary — [Game Name]

**Genre:** [e.g. Match-3 RPG]
**Platform:** [e.g. Meta Horizon Studio — Mobile Portrait 1080×1920]
**Art Style:** [one-line summary]
**Engine:** [e.g. DrawingSurface API + XAML UI (Noesis)]
```

#### 2. Game Overview
2–4 sentences. Describe: what the player does, the core loop, and the win/loss condition. No history. No plans.

#### 3. Technical Architecture
A tree or flat list of every major script/component with a one-line description of its responsibility. Derive this from the actual files in `scripts/`. Example:
```
GameComponent           — top-level orchestrator, frame loop, event routing
├── BoardState          — gem grid data
├── MatchResolver       — match detection, mana award, damage visuals
```

#### 4. Current Content
Exact counts and names. Read catalog files to get accurate numbers. Example:
```
- Heroes: 16 defined in HeroCatalog.ts (player starts with 3)
- Enemies: 12 types in EnemyCatalog.ts
- Dungeons: 3 (Enchanted Forest, Shadow Crypt, Volcanic Depths), 3 rooms each
- Power types: 12 (list them)
```

#### 5. Key Design Principles
3–6 bullet points describing non-obvious architectural decisions that affect how the codebase should be modified. Example:
- "All animation is frame-driven (delta-time). Never use setTimeout for gameplay logic."
- "CombatFlowController is a pure state machine polled every frame — no async callbacks."

### What to REMOVE from PROJECT_SUMMARY.md
- Milestone history tables (move to TASK_BOARD.yaml done: if not already there)
- "Next Steps" / planned features (move to TASK_BOARD.yaml tasks:)
- Any section describing a system that no longer exists in code

### Interactive Gate
If the architecture tree cannot be derived from reading the files (e.g. files are missing or ambiguous), ask:
> "I can see [X] script files but I'm not sure which is the top-level entry point. Which file is the main game component?"

---

## Phase 4 — Rebuild ART_DIRECTION.md

`ART_DIRECTION.md` is used by AI agents to generate new visual assets that match the game's style. It must be precise enough that an image generation model can produce consistent results without seeing any existing assets.

**Rewrite it from scratch** using the current art direction as the source of truth. Read existing sprites and XAML files to verify what is actually in use.

### Required Sections (in this order)

#### 1. Header block
```markdown
# Art Direction — [Game Name]

**Visual Style:** [one-line summary, e.g. "2D Anime JRPG with chibi proportions"]
```

#### 2. Character & Sprite Style
Describe exactly:
- Body proportions (e.g. "chibi, head-to-body ratio 1:2.5")
- Lineart style (e.g. "clean black outlines, 2px, uniform weight")
- Shading approach (e.g. "flat colors with one-step cel-shading, no gradients")
- Eye style if characters have faces
- Minimum readable size
- Background treatment (transparent PNG, solid color, etc.)

#### 3. Color Palette
List every named color used in the game with hex codes. Group by category:
- Gem/element colors
- UI background colors
- UI accent colors
- Text colors

#### 4. UI Visual Style
Describe:
- Background color(s) with hex
- Panel style (border, opacity, corner radius)
- Button style
- Typography (font names, sizes, colors for each text role)

#### 5. Environment / Background Style
Describe how backgrounds are rendered:
- Rendering style (painterly, pixel, flat, etc.)
- Lighting mood
- Whether characters appear in backgrounds
- Dimensions and orientation

#### 6. Sprite Specifications
For each sprite category, specify:
- Pixel dimensions
- Background treatment
- Facing direction
- Any naming conventions

### What to REMOVE from ART_DIRECTION.md
- Any style description that doesn't match the actual sprites on disk
- References to assets that no longer exist
- Aspirational style notes ("we want to eventually...")

### Interactive Gate
If the visual style cannot be determined from existing files, ask:
> "I can see the existing sprites but I want to confirm the intended style. How would you describe the visual style in one sentence?"

---

## Phase 5 — Rebuild GAMEPLAY.md

`GAMEPLAY.md` is the complete mechanical reference for the game. It is used by AI agents to understand how systems work before modifying them. It must be accurate, code-linked, and free of history.

**Rewrite or update it** by reading the source files. Every mechanic described must be traceable to a specific file.

### Required Sections

#### 1. Core Loop
A diagram or numbered flow showing the full game loop from launch to game over. Include state names and the file/enum that tracks them.

#### 2. Scene & UI Overview
A short section orienting the agent to **what lives where** so it knows which file to open when remixing visuals. The agent can read scene `.hstf` and XAML files itself for specifics — this section is the map, not the territory.

Required content:
- **The layer split.** List every visual/audio surface in the project and assign it to one of these layers:
  - **Screen-space UI** (XAML + ViewModel pairs, no world position) — list each `.xaml` file with a one-line role, and name the ViewModel class that owns its bindings
  - **Spawned runtime entities** (pools, templates spawned by code) — list each pool with its size, source template, and parking position
  - **Scene-placed entities** (authored in the editor in the main scene/template files) — list each named entity with the components it carries and its role
- **Game camera.** Document the active camera as concrete numbers a remixer can copy:
  - Source: which entity/component holds the camera, and which script activates it
  - Position (world coords) and orientation (look direction, any roll)
  - Field of view (degrees) and mode (`Perspective`/`Orthographic`/`Custom`/`Fixed`)
  - Practical consequences for art: safe Z-offset range, axis mapping (which world axis is "up" / "right" on screen), front-face direction for meshes

Keep it short. If a project has dozens of scene entities, list only the gameplay-relevant ones — group decorative entities under one line.

#### 3. One section per major system
For each system (board, combat, powers, progression, save, etc.), include:
- What it does (2–4 sentences)
- The file(s) that own it
- Key data structures or formulas
- Any non-obvious rules or edge cases

#### 4. Extension Axes
For each type of content a remixer might add (new hero, new enemy, new level, new power type, etc.), provide a numbered step-by-step guide. Each step must name the exact file to edit.

#### 5. Known Issues
Table format: `| Severity | File | Description |`
Only confirmed bugs. No speculation.

### What to REMOVE from GAMEPLAY.md
- Any system description that no longer matches the code
- Milestone history
- Planned features

### Interactive Gate
If a system's behavior is unclear from reading the code, ask:
> "I see [system X] in the code but I'm not sure how [specific behavior] works. Can you explain?"

---

## Phase 6 — Clean TASK_BOARD.yaml

The task board must be clean and accurate so a future agent understands what is done, what is in progress, and what is planned.

### Rules

- All completed tasks must be in `done:` as one-liners: `"- Name -- <=10 word outcome"`
- No task should be stuck at `in_progress` unless it is genuinely unfinished
- `tasks:` contains only active work (`in_progress`, `not_started`, `parked`)
- `chopping_block:` lists disabled systems, temp scaffolding, failed approaches
- `notes:` contains non-obvious design decisions that don't fit elsewhere (e.g. "Grid is 7×7", "Heroes face RIGHT toward enemies")
- Remove milestone history from `done:` if it has been captured in PROJECT_SUMMARY.md

### Interactive Gate

For any task marked `in_progress`:
> "The task '[name]' is still marked in progress. Is it done, or should it stay open?"

---

### Extra Docs file
For each other docs in the Docs folder you can remove it unless it cover a very specific topic not covered by any other docs file.


## Phase 7 — Skills

Skills are `.md` files that give AI agents domain-specific knowledge about the project. They live in `Assistant/Skills/` at the project root. Check whether each required skill exists. Create any that are missing by synthesizing from the project docs and source files.

Skills should only be created for prompt that repeatedly fails, most of the time the docs and code is a sufficient resource to make sure the prompting succeed.
If you find any skill that is no longer relevant confirm with the user you can delete them.

## Phase 8 — Code Hygiene Pass

Read the main script files. Flag and fix the following.

### Remove

- `console.log` statements that are debug-only (keep `console.error` and `console.warn`)
- Commented-out blocks of dead code (>5 lines)
- TODO/FIXME comments that reference abandoned approaches
- Temp scaffolding: debug buttons, test UI, hardcoded test values

### Verify (fix silently if clearly wrong)

- No .ts file exceeds 1000 lines (split if needed, ask user before splitting)
- All imports are used (no unused imports)
- No hardcoded player names, test world IDs, or dev-only entity references

### Interactive Gate

List all found issues and ask once:
> "I found the following debug/dead code. Should I remove it, or keep any of it? [list]"

Do NOT silently delete code without user confirmation.

---

## Phase 9 — Constants & Configurability Audit

A remixable template must expose its key tuning values as named constants so a future AI agent can find and change them without hunting through logic code.

### Check for a Constants File

Look for `Constants.ts` (or equivalent) in the scripts folder.

If it doesn't exist, create one. If it exists, verify it contains all of the following categories (add any that are missing):

- Canvas dimensions (width, height)
- Board/grid dimensions (rows, columns, cell size)
- Player starting stats (HP, gold, lives)
- Enemy base stats (HP, damage, speed)
- Difficulty scaling values
- Spawn rates and timers
- Mana costs and caps
- Level/XP thresholds
- Any other magic numbers found in logic files

### Format

```typescript
// Constants.ts
// All tunable game values live here for easy AI remixing.
// Change values here to adjust game feel without touching logic files.

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

export const BOARD_COLS = 7;
export const BOARD_ROWS = 8;
export const CELL_SIZE = 96;

export const MANA_CAP = 20;
export const MAX_HERO_LEVEL = 10;
// ... etc
```

If magic numbers are found in logic files, move them to `Constants.ts` 

---

## Phase 10 — Asset Audit

### Sprites / Images

- Read `Assets.ts` (or equivalent asset registry).
- Verify every referenced sprite file exists on disk.
- Flag any sprite files on disk that are NOT referenced in code (orphaned assets).
- Verify all sprite `.assetmeta` files have `"premultiplyAlpha": true` for transparent sprites.

### XAML Files

- Verify every `.xaml` file referenced in `.hstf` scene files exists on disk.
- Flag any `.xaml` files on disk not referenced anywhere (orphaned).

### Interactive Gate

For orphaned assets, list them and ask once:
> "I found these files that aren't referenced anywhere: [list]. Should I delete them or keep them?"

---

## Phase 11 — Final Readiness Check

Run through this checklist. Report the result to the user as a pass/fail table.

| Check | Pass Condition |
|---|---|
| `package.json` has `meta/assistant` dependency | ✅ / ❌ |
| `Docs/PROJECT_SUMMARY.md` — current, no history, no plans | ✅ / ❌ |
| `Docs/ART_DIRECTION.md` — matches actual assets, all sections present | ✅ / ❌ |
| `Docs/GAMEPLAY.md` — all systems documented, code-linked, no stale content | ✅ / ❌ |
| `Docs/TASK_BOARD.yaml` — clean, no stale `in_progress` | ✅ / ❌ |
| No script file exceeds 1000 lines | ✅ / ❌ |
| `Constants.ts` exists with all tunable values | ✅ / ❌ |
| No orphaned sprite or XAML assets | ✅ / ❌ |
| All sprite `.assetmeta` files have `premultiplyAlpha: true` | ✅ / ❌ |
| No debug `console.log` or dead code blocks | ✅ / ❌ |

After the table:
- **All pass:** "This project is ready to publish as an AI Template."
- **Any fail:** List the failing checks and offer to fix them now, one at a time.

---

## Agent Behavior Rules

- **Never skip a phase.** Run all 10 phases even if earlier ones look clean.
- **Ask one question at a time.** Never present a list of questions. Ask the most important one, wait for the answer, then continue.
- **Never silently delete or overwrite.** Always confirm with the user before removing code, assets, or doc content.
- **Read before write.** Always read existing files before updating them. Never overwrite blindly.
- **Code is the source of truth.** If a doc contradicts the code, rewrite the doc to match the code.
- **Be specific when flagging issues.** Don't say "the docs need work" — say "PROJECT_SUMMARY.md still has a milestone history table that should be removed."
- **Synthesize from code when possible.** If a doc section can be derived from reading the source files, do it — don't ask the user to write it themselves.
- **Docs describe now.** History goes in TASK_BOARD.yaml. Plans go in TASK_BOARD.yaml. Docs describe the current state only.
