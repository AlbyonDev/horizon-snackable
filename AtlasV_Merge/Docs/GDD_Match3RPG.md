# GAME DESIGN DOCUMENT — MATCH-3 RPG (WORKING TITLE: CRYSTAL VANGUARD)
**Version 1.0 — Mobile Portrait 2D**

---

## TABLE OF CONTENTS

1. [Art Style & Visual Direction](#1-art-style--visual-direction)
2. [Color & Mana System](#2-color--mana-system)
3. [Hero System](#3-hero-system)
4. [Match-3 Board](#4-match-3-board)
5. [Combat System](#5-combat-system)
6. [Power System](#6-power-system)
7. [Enemy AI](#7-enemy-ai)
8. [Dungeon System](#8-dungeon-system)
9. [Recovery & Offline Progression](#9-recovery--offline-progression)
10. [UI Architecture](#10-ui-architecture)
11. [Animation Catalog](#11-animation-catalog)
12. [Milestones](#12-milestones)

---

## 1. ART STYLE & VISUAL DIRECTION

### 1.1 General Aesthetic

The game uses a **2D Anime JRPG** aesthetic. Every visual decision must be compatible with AI image generation prompting. No element may deviate from this style to ensure content scalability.

**Style label for all AI prompts:** `2D anime JRPG, chibi proportions (head-to-body ratio 1:2.5), clean black lineart (2px), flat shading with one-step cel-shading highlight, vibrant saturated colors, no gradients on characters, transparent background, no shadow under character`

### 1.2 Character Proportions (Non-Negotiable)

- Head: 1/3 of total character height
- Eyes: large, 1/3 of head height, anime-style with highlight dot
- Limbs: stubby, rounded
- Expression: always visible, readable at 120×120px
- Outline: solid black, uniform 2px equivalent

### 1.3 UI Visual Style

The UI follows a **Dark Crystal** aesthetic:

- **Background:** near-black navy `#0D0F1A`
- **Panels:** dark translucent overlay `#1A1D2E` at 90% opacity
- **Panel borders:** 1px solid golden gradient `#C9A84C → #F5E08B` (left to right)
- **Accent glow:** color matches the active mana color (see §2.1)
- **UI elements (buttons, frames):** beveled rectangle with inner shadow, corner radius 8px
- **Text rendering:** always on dark surface, never on gradient

### 1.4 Typography

Three fonts are used. No other font may be used.

| Role | Font | Size | Color |
|------|------|------|-------|
| Title / Hero names | **Cinzel Decorative Bold** | 28px | `#F5E08B` |
| Body / Stats / Labels | **Nunito Bold** | 18px | `#FFFFFF` |
| Numbers / Counters | **Orbitron Regular** | 22px | color matches mana color |

All text has a 1px black stroke and a `drop-shadow(0 2px 4px #00000088)`.

### 1.5 Background Images

Dungeon backgrounds are **pre-rendered 1080×1920 PNG illustrations**, not procedural. Each dungeon chapter has one unique background per combat room type.

**Background AI prompt template:**
`anime JRPG environment background, [DUNGEON_THEME], no characters, wide establishing shot, dark moody lighting, saturated colors, 1080x1920 portrait, detailed environment, painterly style`

Example dungeon themes:
- `ancient crystal cave with glowing blue formations`
- `overgrown forest ruins at dusk with orange sky`
- `floating sky citadel with purple storm clouds`

### 1.6 Gem Sprites (Match-3)

Each gem is a **standalone PNG sprite** (not in a spritesheet). Gems are 96×96px.

**Gem AI prompt template:**
`single anime-style magic gem, [COLOR] crystal, glowing, rounded octagonal shape, bright highlight on top-left, transparent background, no text, no shadow, isolated object`

The 5 gem colors are defined in §2.1. Each gem also has a **shattered version** (same sprite, cracks added) used during destruction animation.

### 1.7 Hero Portraits

Each hero has exactly **3 portrait variants**, all 256×512px PNG, transparent background:

| Variant | Usage | Description |
|---------|-------|-------------|
| `idle` | Default in combat, roster | Standing neutral pose |
| `attack` | Plays during attack animation | Action pose, weapon forward |
| `hurt` | Plays when hit | Recoil pose, pained expression |

All three variants share the same character design, color palette, and lineart style.

### 1.8 Enemy Sprites

Same rules as heroes. Enemies have 3 variants: `idle`, `attack`, `hurt`. Enemies face **left** (mirrored from hero direction convention). Size: 256×512px PNG.

---

## 2. COLOR & MANA SYSTEM

### 2.1 The Five Colors

| ID | Name | Hex | Gem Glow | Archetype | Role |
|----|------|-----|----------|-----------|------|
| `RED` | Crimson | `#E84040` | `#FF7070` | Warrior / Fire | Direct damage, raw DPS |
| `BLUE` | Azure | `#3080E8` | `#70B0FF` | Mage / Water | Debuff, crowd control |
| `GREEN` | Emerald | `#30B850` | `#70E890` | Ranger / Nature | Poison DoT, support |
| `YELLOW` | Aureate | `#F0C830` | `#FFE870` | Paladin / Light | Healing, shields |
| `PURPLE` | Void | `#9030C8` | `#C870FF` | Assassin / Shadow | Burst damage, effects |

### 2.2 Color Assignment to Heroes

At the start of each combat, each of the 5 colors is assigned to exactly one hero on the player's team. Each hero has a **Color Affinity Table** defined in their data sheet:

```
ColorAffinity[hero][color] = float (multiplier, range 0.5 to 3.0)
```

The color is assigned to the hero with the **highest multiplier** for that color. In the event of a tie, the hero with the higher level wins.

**Rule:** A hero can be assigned 0, 1, 2, or more colors. The system ensures all 5 colors are assigned to *some* hero (always the one with the highest multiplier for that color).

When a hero dies, all colors assigned to them are **immediately reassigned** to the surviving hero with the next-highest multiplier for each color. This reassignment triggers a visual indicator (see §11 Animation Catalog).

### 2.3 Mana Storage

- Mana is stored per color in the player's **Global Mana Bank**.
- **Cap per color:** 20 units.
- Mana above the cap is lost.
- Mana persists between turns within the same combat.
- Mana resets to zero when exiting a dungeon (win or loss).

### 2.4 Mana Gain from Match-3

| Match size | Mana gained |
|------------|-------------|
| 3 gems | +3 mana of that color |
| 4 gems | +5 mana of that color |
| 5 gems | +8 mana of that color |
| 5+ (L/T shape) | +10 mana of that color |

Cascade matches (gems falling and auto-matching) each grant mana separately using the same table.

---

## 3. HERO SYSTEM

### 3.1 Hero Data Structure

Each hero is defined by the following data fields. This structure is the single source of truth for all hero content:

```
Hero {
  id:              string        // unique key, e.g. "valeria_pyreblade"
  name:            string        // display name, e.g. "Valeria Pyreblade"
  class:           enum          // WARRIOR | MAGE | RANGER | PALADIN | ASSASSIN
  rarity:          int           // 1 to 5 (stars)
  
  base_hp:         int           // HP at level 1
  base_atk:        int           // Attack at level 1
  
  hp_growth:       float         // multiplier per level (e.g. 1.08)
  atk_growth:      float         // multiplier per level
  
  color_affinity: {
    RED:    float,
    BLUE:   float,
    GREEN:  float,
    YELLOW: float,
    PURPLE: float
  }
  
  power: {
    name:         string
    mana_color:   enum           // which color mana is consumed
    mana_cost:    int            // units consumed to trigger
    effect_type:  enum           // see §6.1
    effect_value: float          // magnitude (damage, heal amount, etc.)
    effect_target: enum          // ENEMY_FRONT | ALL_ENEMIES | ALLY_ALL | SELF
    description:  string         // plain text, max 80 chars
  }
  
  portrait_idle:   asset_path
  portrait_attack: asset_path
  portrait_hurt:   asset_path
}
```

### 3.2 Stats at Level N

```
HP(N)  = floor(base_hp  * hp_growth^(N-1))
ATK(N) = floor(base_atk * atk_growth^(N-1))
```

Level cap is 50.

### 3.3 Rarity

| Stars | Color | Base stat multiplier | Max level cap |
|-------|-------|---------------------|---------------|
| ★☆☆☆☆ | Grey `#888888` | ×1.0 | 20 |
| ★★☆☆☆ | Green `#44BB44` | ×1.2 | 30 |
| ★★★☆☆ | Blue `#4488FF` | ×1.5 | 40 |
| ★★★★☆ | Purple `#AA44FF` | ×2.0 | 50 |
| ★★★★★ | Gold `#F5E08B` | ×2.8 | 50 |

The rarity multiplier applies to both `base_hp` and `base_atk` at creation time.

### 3.4 Experience & Leveling

- XP is gained at the end of each combat room (win only).
- XP to reach level N: `XP(N) = 100 * N^1.6` (cumulative from level 1)
- XP is awarded per hero in the active team, not split.

### 3.5 Roster

- The player starts with 15 hero slots.
- Slots can be expanded: +5 slots for 500 gold (no limit on expansions).
- Heroes in the roster that are not in the active team **do not participate** in any dungeon.

### 3.6 Team Composition

- The player selects exactly **3 heroes** before entering a dungeon.
- Once in a dungeon, the team cannot be changed.
- Dead heroes in the team remain visible as greyed-out portraits (they do not fight).

---

## 4. MATCH-3 BOARD

### 4.1 Board Dimensions

- **Grid:** 7 columns × 8 rows
- **Gem size:** 96×96px logical, filling the full width of a 1080px portrait screen (with 24px margins on each side, yielding ~90px per cell — scale gem sprites accordingly)
- **Board position:** bottom 55% of the screen

### 4.2 Gem Types

The board contains only the 5 mana gem types (RED, BLUE, GREEN, YELLOW, PURPLE). No special gems in the base game (MVP). All gems are equally distributed at generation: each color has a 20% probability of appearing.

### 4.3 Player Interaction

The player **swaps two adjacent gems** (horizontal or vertical, no diagonal). The swap is only valid if it produces a match of 3 or more. Invalid swaps are rejected: the gems animate briefly in the swap direction then return (see §11).

### 4.4 Match Resolution

1. Player performs a valid swap → trigger **Swap Anim** (§11).
2. Matches are detected and highlighted.
3. Matched gems are destroyed → trigger **Gem Burst Anim** (§11).
4. Mana is added to the global bank.
5. **Front hero update:** based on which color was matched, evaluate if the assigned hero changes (see §5.3). If it changes, trigger **Front Hero Swap Anim** (§11).
6. Gems above destroyed cells fall down → trigger **Gem Fall Anim** (§11).
7. New gems fill the top → trigger **Gem Spawn Anim** (§11).
8. **Cascade check:** if new gem positions create new matches, go to step 2.
9. When cascade is complete: **Anti-block check** (§4.5).
10. Turn passes to enemies.

### 4.5 Anti-Block Rule

After every board fill or cascade, the system scans for any valid move (any swap that would produce a match). This check runs after every board state change.

**If no valid move exists:**
1. All gems on the board are destroyed simultaneously → trigger **Board Shuffle Anim** (§11).
2. The board is refilled with a new random set of gems.
3. Step 1–2 repeat until at least one valid move exists.
4. No mana is granted from a shuffle. No combat damage occurs during shuffle.

### 4.6 Board State Persistence

The board state persists across enemy turns. The enemy does not interact with or modify the board. Only the player modifies the board.

---

## 5. COMBAT SYSTEM

### 5.1 Combat Structure Overview

Combat is **strictly turn-based**, alternating between Player Turn and Enemy Turn.

```
[Start of Combat]
    → Initialize board (random fill, anti-block check)
    → Initialize front heroes (both sides: highest affinity for RED wins)
    → PLAYER TURN
        → Player performs ONE gem swap
        → Match resolution + cascade
        → Front hero update (auto)
        → Check: any hero power threshold reached? → player may trigger power(s) (§6)
        → Check: enemy HP = 0? → enemy dies, next enemy steps up, check win
    → ENEMY TURN
        → Each alive enemy hero gains mana (§7.2)
        → Each enemy hero checks if a power threshold is met → uses it immediately
        → Enemy front hero deals physical damage to player's front hero
        → Check: player hero HP = 0? → hero dies, next hero steps up, check loss
    → PLAYER TURN (repeat)
```

**Win condition:** All enemy heroes are reduced to 0 HP.
**Loss condition:** All player heroes are reduced to 0 HP.

### 5.2 Physical Damage (Enemy → Player Front Hero)

The enemy front hero deals physical damage each enemy turn:

```
PhysDamage = ATK(enemy_front) * 1.0
```

This damage is applied to the player's front hero's current HP. No randomness. No miss.

### 5.3 Player Damage (Match → Enemy)

When the player makes a match of color C, the hero assigned to color C deals damage to the **enemy front hero**:

```
MatchDamage = ATK(player_hero_assigned_to_C) * ColorAffinity[hero][C] * MatchBonus
```

Where MatchBonus is:
| Match size | Bonus |
|------------|-------|
| 3 | ×1.0 |
| 4 | ×1.4 |
| 5+ | ×2.0 |

Each match in a cascade applies damage independently.

### 5.4 Front Hero System

**Player side — Auto front hero rule:**

After every match (including cascade matches), evaluate:

1. Identify the color that was just matched: `C`
2. The hero assigned to `C` (see §2.2) is the **candidate**.
3. If the candidate is not already the front hero, trigger a front hero swap to the candidate.
4. The front hero **receives enemy physical damage** and is the **target of enemy powers**.

**Visual rule:** The front hero's portrait is displayed at **full opacity and full scale (×1.0)**. The two back heroes are displayed at **80% scale and 60% opacity**, shifted behind.

**After a cascade:** the front hero at the end of cascade resolution is whichever hero was last made front during the cascade. Order: the last color matched in the cascade sets the final front hero.

**When a front hero dies:** the front hero immediately becomes the hero with the highest total ATK among survivors.

**Enemy side — Mirror rules:** Identical logic applies to the enemy team (see §7).

### 5.5 Power as Front Hero Override

When the player activates a hero's power (§6), that hero becomes the **front hero immediately** and stays front until the next match-triggered swap or until the power resolves. This means that if the powered hero was in the back, they step forward and take the next enemy physical hit.

---

## 6. POWER SYSTEM

### 6.1 Power Effect Types

All powers belong to one of these types. No other type may be created without extending this list:

| Type | Description | Target options |
|------|-------------|----------------|
| `DAMAGE_DIRECT` | Deals ATK-based damage instantly | `ENEMY_FRONT`, `ALL_ENEMIES` |
| `DAMAGE_DOT` | Applies a damage-over-time for N enemy turns | `ENEMY_FRONT`, `ALL_ENEMIES` |
| `HEAL` | Restores HP to a hero | `SELF`, `ALLY_ALL` |
| `SHIELD` | Absorbs next N damage hits | `SELF`, `ALLY_ALL` |
| `DEBUFF_ATK` | Reduces enemy ATK by % for N turns | `ENEMY_FRONT`, `ALL_ENEMIES` |
| `BUFF_ATK` | Increases ally ATK by % for N turns | `SELF`, `ALLY_ALL` |
| `MANA_BOOST` | Adds flat mana to a color instantly | `N/A` |
| `DAMAGE_BURST` | High damage, costs extra mana | `ENEMY_FRONT` |

Power formula for damage types:
```
PowerDamage = ATK(hero) * effect_value
```

For `HEAL`:
```
HealAmount = HP_max(hero) * effect_value
```

### 6.2 Mana Threshold & Trigger

- Each power has a `mana_cost` for a specific `mana_color`.
- When the player's mana bank has **≥ mana_cost** for that color, a **Power Ready indicator** appears on that hero's portrait (see §10.4).
- The player can tap the hero portrait to trigger the power.
- Triggering costs exactly `mana_cost` units from the bank (remainder stays in bank).
- The player may trigger powers **after the cascade resolves** (not mid-cascade).
- The player may trigger **multiple powers in sequence** if multiple heroes are ready.
- Triggering a power does NOT end the player's turn. Only the gem swap ends the player's turn.
- Powers may be triggered **before or after** the gem swap on the same turn.

### 6.3 Power UI Flow

1. Player taps a hero portrait with the "Power Ready" indicator.
2. Hero portrait pulses with a glow ring (color = power's mana color).
3. **Power Preview Panel** slides up from the bottom (§10.5) showing: power name, description, mana cost, and a CONFIRM button.
4. Player confirms → hero steps to front → power animation plays (§11) → effect applied → panel dismisses.
5. If the player taps elsewhere while the panel is open, the panel dismisses with no effect.

---

## 7. ENEMY AI

### 7.1 Enemy Team Structure

Enemy teams follow the same 3-hero structure as the player. Enemy heroes are defined in dungeon data files with the same `Hero` data structure (§3.1), with the following additions:

```
EnemyHero {
  // All Hero fields +
  mana_gain: {          // flat mana gained per enemy turn
    RED:    int,
    BLUE:   int,
    GREEN:  int,
    YELLOW: int,
    PURPLE: int
  }
}
```

### 7.2 Enemy Turn Resolution

Each enemy turn executes the following sequence, **in order**, for each alive enemy hero (back to front):

1. **Mana gain:** Add `mana_gain[color]` to each enemy hero's private mana bank (separate from the player's bank). Each enemy hero maintains their own bank, capped at 20 per color.
2. **Power check:** If any enemy hero's bank has `≥ mana_cost` for their power color: consume the mana, the triggering hero becomes enemy front hero, power effect applies instantly.
3. **Physical attack:** The **enemy front hero** deals `PhysDamage` (§5.2) to the player's front hero.

If multiple enemy heroes could trigger a power simultaneously, the front hero's power triggers first, then back heroes in order.

### 7.3 Enemy Front Hero Rule

Identical to the player (§5.4), but the enemy front hero is determined at the **start of combat** by the highest `mana_gain` total across all colors (the most aggressive enemy leads). When an enemy hero triggers a power, they become front hero. When the front hero dies, the enemy with the highest ATK becomes front.

### 7.4 Combo Tension Mechanic

For every **cascade of 2+ consecutive matches** the player creates in a single turn, each enemy hero gains **+1 bonus mana** to their power color (in addition to their normal per-turn gain). This bonus is applied immediately at cascade resolution.

**Design intent:** Rewards the player for big combos with damage, but slightly accelerates enemy powers. Creates a risk/reward loop.

**Visual feedback:** A small floating text "+1" appears in the color of the affected enemy's power above their portrait for each cascade. (See §11.)

---

## 8. DUNGEON SYSTEM

### 8.1 Dungeon Structure

Each dungeon consists of **5 rooms in sequence**:

```
[Room 1: Combat] → [Room 2: Combat ★reward] → [Room 3: Combat] → [Room 4: Combat] → [Room 5: Boss Combat ★★reward]
```

- Rooms 1, 3, 4: Standard combat rooms.
- Room 2: Standard combat + intermediate reward on completion.
- Room 5: Boss combat + main dungeon reward on completion.

The player **cannot skip rooms** and must complete them in order. After each room, a short **Between Room Screen** (§10.7) is displayed.

### 8.2 Dungeon Data Structure

```
Dungeon {
  id:             string
  name:           string
  chapter:        int
  recommended_power: int        // sum of team ATK×level, shown as a warning threshold
  background_room:  asset_path  // used for rooms 1, 3, 4
  background_boss:  asset_path  // used for room 5
  
  rooms: [
    {
      room_number: int
      enemy_team: [EnemyHeroRef, EnemyHeroRef, EnemyHeroRef]
    }
  ]
  
  reward_intermediate: Reward   // Room 2
  reward_completion:   Reward   // Room 5
}

Reward {
  gold:           int
  xp_bonus:       int           // added to all heroes in team
  hero_fragments: [ { hero_id: string, count: int } ]
}
```

### 8.3 Win & Loss Conditions

**Win:** Defeat all enemies in Room 5.

**Rewards:**
- Room 2 reward is granted when Room 2 is completed, regardless of final outcome.
- Room 5 reward is granted only when Room 5 is completed.
- If the player exits the dungeon before completing Room 5, Room 2 reward is still kept.

**Loss:** All 3 player heroes reach 0 HP in any room.
- No Room 5 reward.
- Room 2 reward is kept if it was already collected.
- Heroes retain the HP damage and death state from the failed run.
- The player returns to the Dungeon Select screen.

**Flee:** The player may tap the **Flee button** (§10.3) at any point during their turn. This counts as a loss. No additional penalty beyond the normal loss condition.

### 8.4 World Map & Chapter Progression

- Dungeons are organized into **Chapters** (e.g., Chapter 1: Crystal Caves, Chapter 2: Ruined Temple).
- Each chapter contains **5 dungeons** arranged in a linear path.
- A dungeon is **locked** until the previous dungeon is completed at least once.
- Dungeons can be **replayed** unlimited times once unlocked.
- Replaying a completed dungeon grants rewards normally every time.

---

## 9. RECOVERY & OFFLINE PROGRESSION

### 9.1 HP Recovery

- Player hero HP recovers **offline at a rate of 1 HP every 2 minutes**.
- Recovery applies to all heroes simultaneously, including dead ones.
- Recovery runs whether the app is open or closed (server-side timestamp or reliable local delta).
- Recovery stops when HP is full.

### 9.2 Dead Hero Revival

- A hero at 0 HP is "KO'd". They are **revived automatically** after **15 minutes** of real-world time.
- At revival, the hero is restored to 1 HP and begins normal HP recovery.
- HP recovery and the 15-minute KO timer are separate. If a hero dies at 100 HP and it takes 15 minutes to revive, they will still need to recover HP normally after revival.

### 9.3 Gold Acceleration

The player may spend gold to accelerate recovery:

| Action | Cost |
|--------|------|
| Fully revive one KO'd hero instantly | 50 gold |
| Fully restore one hero's HP instantly | 30 gold |
| Restore all heroes HP + revive all KO'd heroes | 150 gold |

### 9.4 Recovery UI

- On the Hero roster screen, each hero card shows a **timer bar** for KO recovery or a **HP recovery timer** (e.g., "Full HP in 1h 24m").
- A notification (OS push notification) is sent when all heroes are fully healed.

---

## 10. UI ARCHITECTURE

All UI is implemented as XAML using **Noesis UI**. No in-world Unity UI objects. All panels and transitions are code-animated (see §11). No scene reloads for UI transitions — all screens are overlaid or swapped in a single root canvas.

### 10.1 Root Canvas Hierarchy

```
RootCanvas (1080×1920)
├── BackgroundLayer          // full-screen background images
│   └── Image (background_room or background_boss)
├── CombatLayer              // visible only during combat
│   ├── EnemyTeamPanel
│   ├── PlayerTeamPanel
│   └── BoardPanel
├── UILayer                  // always on top of game world
│   ├── HUDPanel             // HP bars, mana bank, turn indicator
│   ├── PowerPreviewPanel    // slides up when power is tapped
│   └── BetweenRoomPanel     // slides in after each room
├── ScreenLayer              // full-screen menus
│   ├── MainMenuScreen
│   ├── DungeonSelectScreen
│   ├── RosterScreen
│   ├── HeroDetailScreen
│   └── ResultScreen
└── OverlayLayer             // popups, confirmations
    └── ConfirmDialog
```

### 10.2 Combat Screen Layout

Portrait 1080×1920. All Y positions are from top.

```
[0 – 80px]    StatusBar: gold, back button (flee), settings icon
[80 – 480px]  EnemyTeamPanel (enemy portraits, HP bars, mana counters, front indicator)
[480 – 520px] TurnIndicator: "YOUR TURN" / "ENEMY TURN" label (centered, animated)
[520 – 780px] PlayerTeamPanel (player portraits, HP bars, power ready indicators)
[780 – 1880px] BoardPanel (match-3 grid, 7×8 = 1100px height)
[1880 – 1920px] BottomSafeArea
```

**EnemyTeamPanel:**
- 3 enemy portraits in a row, centered, each 160×260px
- Front hero portrait: full opacity, scale ×1.0, slightly forward (Y+20px)
- Back heroes: 80% opacity, scale ×0.85, Y at baseline
- Above each portrait: HP bar (240px wide, 16px tall), colored red
- Below HP bar: enemy name (Nunito Bold, 14px)
- Above portrait: power countdown indicator (see §10.4 enemy variant)

**PlayerTeamPanel:**
- 3 hero portraits in a row, centered, each 160×260px
- Same front/back visual rules as enemy
- Below each portrait: HP bar (240px wide, 16px tall), colored green
- Color-coded mana assignments: small colored dot (24px circle) above each portrait for each color assigned to that hero

**BoardPanel:**
- 7 columns × 8 rows of gems
- 24px margin left and right
- Each cell: 90×90px (with 6px padding between gems effectively)
- Bottom of board has a 40px bar showing 5 colored mana totals (see §10.3)

### 10.3 Mana Bank HUD

Located at the bottom of the BoardPanel (a 40px strip overlapping the bottom edge):

- 5 mana orbs in a row, one per color, in the order: RED, BLUE, GREEN, YELLOW, PURPLE
- Each orb: 56×56px circle, colored with the gem color
- Text inside each orb: current mana / cap (e.g. "12/20"), font Orbitron 14px white
- When mana = cap: orb pulses with an outer glow ring (1-second loop)
- Flee button: top-left of StatusBar, 80×80px, icon of a door with arrow, no text

### 10.4 Power Ready Indicator

When a hero's mana threshold is met:

- A **glowing ring** (animated, see §11) appears around the hero portrait, colored with the power's mana color
- A small icon of a lightning bolt (SVG, 32×32px, white) appears centered on the portrait
- The portrait becomes tappable (enlarged touch target: 200×300px)
- A **tooltip label** slides up from the portrait: "[PowerName] — TAP TO USE" (Nunito Bold 14px, white on dark panel)

**Enemy variant:** Instead of a glowing ring, a **countdown number** in large text (Orbitron 36px, color = power's mana color) is displayed above the enemy portrait, showing how many more mana units are needed before the power fires. This gives the player information to plan against.

### 10.5 Power Preview Panel

A **bottom sheet panel** (§11: slides up from bottom over 0.25s). Height: 420px. Blocks board interaction.

Layout (top to bottom inside panel):
```
[Handle bar: 40×6px rounded, centered, color #555]
[Hero portrait (idle, 120×180px) left + Power Name (Cinzel 24px) right]
[Horizontal divider: 1px #333]
[Power description: Nunito 16px, max 3 lines, left-aligned]
[Mana cost: colored icon + "Costs X [COLOR] mana" — Nunito 18px]
[CONFIRM button: full width, 64px tall, rounded 8px, color = power's mana color]
[CANCEL text link: centered below CONFIRM, Nunito 16px, white]
```

### 10.6 Main Menu Screen

Full-screen. Contains:

- **Background:** animated parallax (code animation, §11)
- **Logo:** game title image (centered, Y=300px from top), 600×200px
- **PLAY button:** centered, Y=900px, 480×80px, golden border, dark fill
- **ROSTER button:** centered, Y=1020px, same style
- **SETTINGS button:** centered, Y=1140px, same style, secondary visual weight (smaller: 360×60px)
- Bottom: version number (Nunito 12px, grey `#666`, Y=1880px)

### 10.7 Between Room Screen

Displayed after completing a room (not Room 5). **Full-screen overlay** over the current background, dark translucent `#000000CC`.

Content:
- "ROOM [N] CLEARED" in Cinzel Decorative 36px gold, centered Y=400px
- Intermediate reward display (if Room 2): reward icon + amount
- Current hero HP status: 3 hero cards with current HP bars
- "CONTINUE →" button: centered, Y=1400px, same style as PLAY button

Duration before auto-dismissal: not auto-dismissed. Player must tap CONTINUE.

### 10.8 Result Screen

Displayed after dungeon win or loss.

**Win:**
- Background: same dungeon background with a golden vignette overlay
- "VICTORY" text: Cinzel Decorative 56px, gold, Y=300px, plays **Victory Text Anim** (§11)
- Reward breakdown: each reward item appears one by one with a pop-in anim
- Hero XP gained: shown per hero with a XP bar fill animation
- "RETURN" button + "REPLAY" button side by side

**Loss:**
- Background: darken to near-black over 0.5s
- "DEFEATED" text: Cinzel Decorative 56px, red `#E84040`, Y=300px
- Recovery info: "Heroes will recover in [TIME]" — Nunito 18px white
- "RETURN" button only (centered)

### 10.9 Dungeon Select Screen

Vertical scroll view. Each chapter is a section with a title bar and 5 dungeon cards in a horizontal row.

Dungeon card (240×340px):
- Top 60%: dungeon background thumbnail (cropped)
- Bottom 40%: dark panel, dungeon name (Nunito Bold 18px), recommended power label (Orbitron 14px, grey or red if player team is below threshold), star rating for completion (★☆☆ = not completed, ★★☆ = Room 2 cleared, ★★★ = completed)
- Locked state: card is desaturated + padlock icon overlay

### 10.10 Roster Screen

Scrollable grid of hero cards (2 per row). Each card: 480×260px.

Hero card layout:
- Left 40%: hero portrait (idle, cropped to 180×260px)
- Right 60%: name (Cinzel 20px), class icon (SVG 32×32px), rarity stars, level badge (Orbitron 18px), HP bar, ATK value

Sort options (top bar): by Rarity ↓, by Level ↓, by ATK ↓, by Color (groups by highest affinity color).

Team selection: player taps 3 heroes to form a team. Selected heroes have a golden glow border. A "GO TO DUNGEON" button appears at the bottom once 3 are selected.

### 10.11 Hero Detail Screen

Full-screen. Accessed by tapping a hero card in roster.

Layout:
- Top 50%: hero idle portrait (centered, 256×512px scaled to fit width)
- Rarity stars below portrait
- Name + class below stars
- Stats panel: HP max, ATK, Level — in a 2-column grid layout
- Color affinity visualization: 5 bars (one per color), width proportional to affinity value, colored with the gem color
- Power section: power name, mana color icon, cost, description
- XP bar: current XP / next level XP, with level number on each side

---

## 11. ANIMATION CATALOG

All animations are **code-driven** (no sprite sheets, no animation files). All use easing unless stated otherwise. Durations are in milliseconds.

### 11.1 Board Animations

| ID | Trigger | Duration | Properties | Easing |
|----|---------|----------|------------|--------|
| `GEM_SWAP_VALID` | Valid swap input | 150ms | Position lerp between two cells | EaseInOut |
| `GEM_SWAP_INVALID` | Invalid swap input | 200ms | Position: move 20px toward target, return to origin | EaseOut then EaseIn |
| `GEM_BURST` | Gem matched | 120ms | Scale: 1.0→1.3→0.0, Opacity: 1.0→0.0 | EaseOut |
| `GEM_FALL` | Gem falls into empty cell | varies (50ms per row fallen) | Position Y: top to destination | EaseIn |
| `GEM_SPAWN` | New gem appears at top | 100ms | Scale: 0.0→1.0, Opacity: 0.0→1.0 | EaseOut spring (overshoot 1.1) |
| `BOARD_SHUFFLE` | Anti-block triggered | 600ms | All gems: Scale→0 (200ms), reposition (0ms), Scale→1 (200ms), board flashes white (100ms) | EaseInOut |
| `GEM_HIGHLIGHT` | Match detected (pre-burst) | 80ms | Outline glow appears on matched gems: intensity 0→max | Linear |
| `GEM_IDLE` | Always on ready gems | Loop, 3s offset per gem | Scale: 1.0→1.03→1.0 | Sine loop (staggered per gem using index seed) |

### 11.2 Combat Animations

| ID | Trigger | Duration | Properties | Easing |
|----|---------|----------|------------|--------|
| `HERO_TO_FRONT` | Hero becomes front hero | 200ms | Position X: move to front offset, Scale: 0.85→1.0, Opacity: 0.6→1.0 | EaseOut |
| `HERO_TO_BACK` | Hero moves to back | 150ms | Position X: move to back offset, Scale: 1.0→0.85, Opacity: 1.0→0.6 | EaseIn |
| `HERO_ATTACK` | Hero deals damage | 300ms | Swap to attack portrait (0ms), Position X: 30px forward lunge (100ms), 30px return (200ms), swap back to idle | EaseOut |
| `HERO_HURT` | Hero receives damage | 250ms | Swap to hurt portrait (0ms), Position X: 15px knockback (80ms), return (170ms), swap to idle | EaseOut |
| `HERO_DEATH` | Hero HP = 0 | 500ms | Opacity: 1.0→0.0 (300ms), then greyed-out placeholder fades in (200ms) | EaseIn |
| `HERO_POWER_STEP_FORWARD` | Power triggered | 200ms | Hero slides 60px forward, slight scale up ×1.1 | EaseOut spring |
| `HP_BAR_DRAIN` | HP changes | 400ms | Width lerp from old to new value | EaseOut |
| `COLOR_REASSIGN_FLASH` | Color reassigned after hero death | 300ms | Small colored dot next to new hero portrait: scale 0→2.0→1.0, color flash | EaseOut |

### 11.3 Power Animations

All power animations play on the front-hero portrait and enemy portrait. Duration includes all phases.

| ID | Effect type | Duration | Description |
|----|-------------|----------|-------------|
| `POWER_DAMAGE_DIRECT` | DAMAGE_DIRECT | 600ms | Hero portrait plays attack anim, colored energy projectile (code-drawn circle) travels from hero to enemy (200ms), enemy plays HERO_HURT anim |
| `POWER_DAMAGE_DOT` | DAMAGE_DOT | 500ms | Hero portrait plays attack anim, colored particles orbit enemy portrait (loop, 1 particle per tick) |
| `POWER_HEAL` | HEAL | 500ms | Yellow light rises from bottom of hero portrait to top (200ms), HP bar refills |
| `POWER_SHIELD` | SHIELD | 400ms | A translucent shield shape (SVG hexagon) materializes over hero portrait, stays until consumed |
| `POWER_DEBUFF_ATK` | DEBUFF_ATK | 500ms | Blue chains appear (SVG) around enemy portrait, shake (100ms), then fade to a persistent desaturate tint |
| `POWER_BUFF_ATK` | BUFF_ATK | 400ms | Upward arrows (SVG) float from hero portrait, hero portrait gets a warm glow tint |
| `POWER_MANA_BOOST` | MANA_BOOST | 300ms | Mana orb of the color scales up 1.0→1.4→1.0, number counter ticks up |
| `POWER_DAMAGE_BURST` | DAMAGE_BURST | 800ms | Screen-edge flash of power's color (100ms), full-width energy beam from hero to enemy (200ms), enemy HURT anim + HP drain |
| `SHIELD_CONSUME` | Shield hit | 200ms | Shield SVG shatters: scale 1.0→1.3→0.0 with opacity fade |

### 11.4 UI Animations

| ID | Trigger | Duration | Properties | Easing |
|----|---------|----------|------------|--------|
| `PANEL_SLIDE_UP` | Power Preview opens | 250ms | Panel Y: 1920→1500 | EaseOut |
| `PANEL_SLIDE_DOWN` | Power Preview closes | 200ms | Panel Y: 1500→1920 | EaseIn |
| `POWER_READY_RING` | Hero power threshold met | Loop, 1.5s | Ring Scale: 1.0→1.15→1.0, Opacity: 0.8→1.0→0.8, Ring color = power color | Sine loop |
| `MANA_CAP_PULSE` | Mana orb at cap | Loop, 1s | Outer glow Scale: 1.0→1.2→1.0 | Sine loop |
| `TURN_INDICATOR_IN` | Turn changes | 400ms | Label: scale 0.5→1.0, Opacity 0→1, Color flash (YOUR TURN=green, ENEMY TURN=red) | EaseOut spring |
| `VICTORY_TEXT` | Win condition met | 800ms | Text: scale 0.2→1.1→1.0, Opacity 0→1, golden particle burst (code) | EaseOut spring |
| `FLOAT_TEXT` | Enemy combo bonus "+1" | 600ms | Text spawns at portrait top, Position Y: -60px, Opacity 1→0 | EaseOut |
| `RESULT_REWARD_POP` | Reward item reveal | 150ms per item | Scale 0→1.15→1.0, staggered by 120ms per item | EaseOut spring |
| `XP_BAR_FILL` | XP gain on result screen | 800ms | Width lerp to new value, if level-up: bar fills, resets, continues | EaseInOut |
| `MENU_PARALLAX` | Main menu idle | Loop | Background layers move at different speeds (0.1× for far layer, 0.4× for mid) using a slow sine oscillation on X (±30px, period 8s) | Sine |
| `CARD_SELECT_GLOW` | Hero selected in roster | 200ms | Card border: opacity 0→1, color = gold | EaseOut |

### 11.5 Animation Rules

- **No two `HERO_ATTACK` and `HERO_HURT` animations run simultaneously** across different heroes. They queue in order of resolution.
- **Board animations complete fully before combat damage is applied** visually. Internal damage calculation happens instantly; visuals are queued.
- **All loop animations** have a **random start offset** (0 to loop duration) seeded from the entity ID to prevent visual synchronization.
- **Screen transitions** between non-combat screens: Opacity fade out (150ms) → swap content → fade in (150ms). No slides for screen transitions (only panels use slides).

---

## 12. MILESTONES

Each milestone is a **standalone testable build**. Each one validates specific gameplay bricks. Milestones are ordered by dependency.

---

### MILESTONE 1 — Match-3 Board (No Combat)

**Goal:** Validate the board is fun, responsive, and anti-block works.

**Scope:**
- Board renders correctly (7×8, 5 gem types, correct sizing for portrait)
- Player can swap gems
- Valid/invalid swap detection
- Match detection (3, 4, 5, L/T shapes)
- Gem destruction, fall, spawn
- Cascade resolution
- Anti-block shuffle
- Mana bank HUD (display only, no combat use)
- All board animations from §11.1

**Not in scope:** Heroes, combat, enemies, powers, dungeons.

**Test criteria:**
- Board never gets stuck (anti-block fires correctly)
- Cascades resolve in correct visual order
- Mana totals update correctly per match

---

### MILESTONE 2 — Hero Portraits & Front Hero System

**Goal:** Validate the front hero swap system with real visual feedback.

**Scope:**
- 2 placeholder hero sprites (idle/attack/hurt) per side
- Player team panel (3 portraits, HP bars)
- Enemy team panel (3 portraits, HP bars)
- Color assignment system (§2.2) — static team, no combat yet
- Front hero visual state (front vs back positioning and opacity)
- Front hero swap triggered by gem color matched
- `HERO_TO_FRONT` and `HERO_TO_BACK` animations
- Color assignment dots on player portraits
- Turn indicator label

**Not in scope:** Actual HP damage, powers, enemies attacking, dungeon.

**Test criteria:**
- Each of the 5 colors triggers a front hero swap to the correct hero
- Front hero is visually distinct from back heroes
- Color assignment dots update correctly

---

### MILESTONE 3 — Combat Loop (No Powers)

**Goal:** Validate full turn-by-turn combat from start to win/loss.

**Scope:**
- Player Turn: match → mana → damage dealt to enemy front → HP drain anim
- Enemy Turn: enemy mana gain (fixed values), enemy physical attack on player front
- Hero death: HERO_DEATH anim, color reassignment, new front hero
- Win/Loss detection
- Flee button functionality
- Basic Result Screen (no rewards, just WIN/LOSS text)
- All combat animations from §11.2 (except power animations)
- Enemy combo bonus "+1" float text (§11.4)

**Not in scope:** Powers, dungeon rooms, rewards.

**Test criteria:**
- Combat resolves correctly (win/loss triggered at right moment)
- Color reassignment fires on hero death
- Enemy attack applies damage to the correct hero (front hero)
- Physical damage numbers are correct

---

### MILESTONE 4 — Power System

**Goal:** Validate power triggering, all effect types, UI flow.

**Scope:**
- Power Ready indicator on hero portrait
- Power Preview Panel (slide up/down)
- Confirm/Cancel flow
- All 8 power effect types (§6.1) implemented and tested with placeholder values
- Hero steps to front on power trigger
- All power animations from §11.3
- Mana consumption on trigger
- Enemy powers trigger correctly on their turn

**Not in scope:** Dungeon, rewards, hero data files.

**Test criteria:**
- Each power type applies its effect correctly (verify with debug overlay)
- Mana consumed equals `mana_cost` exactly
- Enemy powers fire at correct mana threshold
- Multiple powers can be triggered in sequence in one turn
- Shield absorbs exactly N hits then is consumed

---

### MILESTONE 5 — Dungeon System & Rewards

**Goal:** Validate full dungeon run from select to result screen.

**Scope:**
- Dungeon Select screen (2 chapters, 5 dungeons each — placeholder content)
- World map with locked/unlocked state
- Between Room Screen
- Full 5-room dungeon flow
- Intermediate reward (Room 2)
- Completion reward (Room 5)
- Result Screen with reward display and XP bar animation
- Basic gold counter in StatusBar
- Hero XP gain and level up logic (no visual level up fanfare yet)

**Not in scope:** Roster management, hero collection/unlocking, offline recovery.

**Test criteria:**
- Room 2 reward persists even on later loss
- Dungeon locks correctly before prior dungeon is completed
- Rewards display in correct order on Result Screen
- XP applies to heroes and level-up triggers correctly

---

### MILESTONE 6 — Roster, Collection & Offline Recovery

**Goal:** Validate the full game loop outside combat.

**Scope:**
- Roster screen with scrollable hero cards
- Hero Detail screen
- Team selection (choose 3 heroes before dungeon)
- Hero rarity system (1★–5★) with visual differentiation
- Sort options on roster
- HP recovery timer display per hero
- KO revival timer display per hero
- Gold-accelerated recovery (spend gold to heal)
- Push notification when heroes fully healed
- Hero slot system (default 15, expand with gold)
- All UI animations from §11.4 (main menu parallax, card select glow, etc.)
- Main Menu screen (complete, polished)

**Test criteria:**
- HP recovery rate is exactly 1 HP per 2 minutes offline
- KO revival triggers at exactly 15 minutes
- Gold cost is deducted correctly on accelerated recovery
- Team selection blocks dungeon entry if 0–2 heroes selected
- Roster sort orders are correct

---

*End of Document — Version 1.0*
*All sections are prescriptive and implementation-ready. No section may be changed without updating version number and annotating the change.*
