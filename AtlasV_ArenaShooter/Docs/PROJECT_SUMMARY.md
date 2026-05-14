# Arena Vermin — Project Summary

## Overview
Arena Vermin is a portrait-format, auto-combat arena survivor game (like Vampire Survivors) built as a 2D game using the DrawingSurface API within Meta Horizon Engine. The player controls a chibi knight hero who will fight waves of mutant vermin. Combat is automatic — the player's only control is movement via a floating virtual joystick.

## Current State: Milestone 4+ — Custom Art Integration

### Implemented Features

#### Milestone 1 (Core Movement + Arena)
- **Flat top-down arena floor**: Map.png background image scrolling with camera (flat 2D projection, 1 world unit = 64 screen pixels)
- **Hero character**: Custom CharacterMain.png sprite with Weapon01.png, idle bob, walk bounce, weapon sway
- **Floating virtual joystick**: Touch-anywhere placement, dead zone, fading
- **Camera follow**: Hero centered, world scrolls, rectangular camera clamping to map bounds
- **Bounded arena**: Clamped world (16×16 units)
- **Title screen**: XAML overlay with START button

#### Milestone 2 (Combat Loop)
- **Auto-attack system**: Hero automatically attacks nearest enemy within 2.5 tile-unit range at 1.3 attacks/sec, 10 damage per hit, 8% crit chance (2× damage)
- **Grunt Rat enemies**: 25 HP, 3-state AI (IDLE/CHASE/ATTACK), 2.3 units/sec speed, 8 contact damage per 0.5s tick, 6-unit aggro radius
- **Attack swing animation**: 3-phase weapon rotation (anticipation → strike → settle) with body lean
- **Enemy spawn drop-in**: Fall from above + squash/stretch/settle animation (0.47s total)
- **Enemy death animation**: Side rotation from feet pivot using idle sprite, crossfade to pile-of-bones sprite at 0.3s, then opacity fade out (0.8s total)
- **Hit feedback**: White flash overlay (clipped to character silhouette), recoil offset with squash/stretch, hit-pause freeze (0.05s), camera shake
- **Slash VFX**: Directional crescent arc from hero toward target on each strike, white-gold color, scales up and fades over 0.15s
- **Particles**: Gold/orange/white hit sparks (4-6), crit sparks (8-12) + expanding ring, death explosions, sprite-based impact/critique effects (Impact.png, Splash.png, Critique.png), sprite-based Impact/Critique/Splash effects on hits
- **Floating damage numbers**: Pixel-art digit rendering with outlines, rise and fade, orange for crits
- **Attack range ring**: Two concentric circles (inner blue 40% opacity, outer orange 50% opacity with pulse) with glow strokes behind each
- **Hero hurt flash**: Red tint overlay clipped to body silhouette when taking contact damage

#### Milestone 3 (Wave System, HUD & Pickups)
- **Wave system**: 20 timed waves with escalating difficulty. Burst spawning at arena edges with randomized pauses between bursts. Enemy HP scales per wave (base HP × wave multiplier). 3-second breather between waves with no spawns. On wave timer zero, remaining enemies despawn with dissolve effect and drop reduced loot (50%).
- **XAML HUD**: Level bar (top-center, blue fill showing XP progress), wave timer board (bottom-center with TimerBoard.png sprite background), wave bar (right side with WaveBarContour.png sprite frame), enemy count (right side with EnnemiCount.png icon), coin count (top-left with CoinCount.png icon), pause button (top-left with PauseButton.png), wave announcement text (center).
- **Pickup system**: XP gems (gem01.png/gem02.png sprites with float animation, pulse scale), Gold coins, and Health hearts (health_heart.png with heartbeat pulse animation that restore 15 HP on collection, capped at max HP, with 12% drop chance from any enemy kill). Drop from killed enemies. Auto-collect within 1.5× radius. Persist 12s on ground, flash warning at 9s. Collection spawns particle burst. All pickups auto-vacuum to player when wave ends.
- **XP & Leveling**: XP gems fill level bar (1 XP per gem). Formula: xpToNext = 20 × level^1.4. Level-up triggers upgrade selection screen.
- **Upgrade selection UI**: On level-up, game pauses and shows 3 random upgrade cards (XAML overlay). Player taps one to unlock or upgrade a weapon. Cards show weapon name, level progression, and description. The player starts with NO weapons — all weapons are obtained through the upgrade selection UI on level-up.
- **Orbiting Drone weapon**: First implementable weapon. 5 upgrade levels that add drone count (1→2→3), increase rotation speed, orbit radius, and damage. Drones orbit the hero in world space, dealing damage to enemies on collision with per-enemy hit cooldown.
- **Arm Minigun weapon**: Second implementable weapon. 5 upgrade levels that increase fire rate (3→8 shots/sec), damage (5→10), and bullet count (1→3 with angular spread at levels 3+, ±5°→±10°). Targets nearest enemy within range and fires rapid yellow/orange projectiles. Pure logic module following DroneWeapon pattern.
- **Damage Circle weapon**: Third implementable weapon. Periodic AoE pulse centered on the hero that damages all enemies within blast radius. 5 upgrade levels with increasing radius (2→4 world units), damage (8→20), and pulse frequency (every 2s→1s). Expanding orange-red ring VFX on each pulse. Pure logic module following DroneWeapon/MinigunWeapon pattern.
- **Pause system**: Pause button freezes all game logic. Resume/Restart buttons in dark overlay menu.
- **Game restart**: Full state reset back to wave 1 with fresh stats.

#### Milestone 4 (New Enemy Types)
- **4 new enemy types** added alongside the original Grunt Rat (5 total):
  - **Gunner Mouse**: Steel gray ranged enemy that maintains distance (4-6 units). Fires 3-projectile bursts every 2s. Lower HP (45 base). Backs away if hero gets too close.
  - **Drone Rat**: Teal-green fast enemy with sinusoidal lateral movement. Speeds at 2.7 u/s making it harder to hit. Splash-immune (future-proofed for AoE).
  - **Sewer Bruiser**: Large dark-olive armored tank (150 HP). Slow (0.9 u/s) but high contact damage (25). Frontal armor reduces incoming damage by 50% when attacked from the front.
  - **Gas Rat**: Sickly yellow-green enemy with gas mask (55 HP, 1.8 u/s). Drops poison gas clouds every 6-8s that linger for 4s. Clouds deal 5 damage per tick to the hero standing inside.
- **Projectile system**: Gunner Mouse fires slow-moving (4 u/s) projectiles that deal 8 damage on hero contact. Rendered as missile.png sprites rotated to face travel direction. Expire after 3s.
- **Gas cloud system**: Gas Rat drops translucent green circles that deal tick damage (0.5s interval). Clouds fade out in their last second.
- **Wave-based type mixing**: Waves 1-3 are 100% Grunt Rats. Wave 4+ adds 20% Gunner Mice, wave 5+ adds 15% Drone Rats, wave 6+ adds 10% Sewer Bruisers, wave 7+ adds 10% Gas Rats. Each type has its own base HP scaled by the wave multiplier.
- **Per-type loot drops**: Grunt (1 gem, 15% coin), Gunner (2 gems, 30% coin), Drone (2 gems, 20% coin), Bruiser (5 gems, 60% of 2 coins), Gas (3 gems, 40% coin). All enemies have 12% chance to drop a health heart.
- **Expanded enemy sprite pool**: 25 XAML sprite slots (up from 15) to handle more enemies on screen.
- **Elite enemy variants**: From wave 5 onward, ~10% of spawns become elite (rising to ~20% at wave 15+). Elite enemies have 2.5× HP, 1.3× speed, 1.5× damage, and 1.5× sprite scale. They are visually distinguished by pulsing colored glow rectangles rendered on the XAML Canvas layer (5 dedicated glow slots placed behind enemy sprites), using each enemy type's primary hue with opacity pulsing 50%→90%→50% over 1.5s. Glow size is 2× the elite sprite dimensions. Elites drop 2× loot. A "⚠ ELITE INCOMING!" HUD warning appears for 3 seconds when elites spawn. Wave 1 includes a debug elite Grunt Rat for testing.
- **Type-specific rendering**: Each enemy type has unique sprite texture and body dimensions. Bruiser is 42×64px (larger). All use generic bones sprite on death. Special enemy types (Gunner Mouse, Drone Rat, Sewer Bruiser, Gas Rat) display weapon sprites positioned at their hand anchor points; Grunt Rat has no weapon.
- **Rat King Boss**: Spawns every 5 waves (5, 10, 15, 20) with scaling HP (500 base + 200 per boss wave). Large sprite (90×135px). Two-phase AI: CHASE (normal speed) → CHARGE (4.5× speed rush) → SUMMON (spawns 4 Grunt Rat minions) cycling every 6 seconds. 30 contact damage. Boss HP bar displayed at top of screen during fight. "⚠ BOSS INCOMING!" warning text for 3 seconds when boss spawns. Drops massive loot on death: 12 gems, 3 guaranteed coins, guaranteed health heart.

### Rendering Architecture
- **XAML ItemsControl layer** renders character sprites (hero + 25 enemies) via a data-bound collection of CharacterSpriteViewModel instances. Each entry has body, weapon, and flash Rectangles with ImageBrush fills, ScaleTransform/RotateTransform, and OpacityMask flash overlays. ItemContainerStyle binds Canvas.Left/Top/ZIndex for positioning and depth sorting.
- **DrawingSurface** renders map.png background, attack range ring, gas clouds, missile projectile sprites, slash VFX, gem pickup sprites, particles + sprite effects (Impact/Critique), floating text, joystick, and elite glow markers
- A fixed pool of 26 CharacterSpriteViewModel items (25 enemies + 1 hero) is updated in-place each frame; enemies are Y-sorted for correct depth ordering
- All enemies use unified Vilain.png sprite

### Canvas
390×844 portrait, fullscreen Viewbox with Uniform stretch

### Controls
Single-touch floating virtual joystick. Combat is automatic.

## Architecture
- `scripts/ArenaVerminComponent.ts` — Main game component (state machine, input, hero movement, camera, combat integration, wave system, projectile/gas integration, pickup collection, upgrade system integration, drone weapon update, HUD updates, rendering)
- `scripts/UpgradeSystem.ts` — Pure logic: tracks weapon levels, generates random upgrade options, applies upgrades
- `scripts/DroneWeapon.ts` — Pure logic: drone orbit physics, enemy collision detection, DrawingSurface rendering
- `scripts/MinigunWeapon.ts` — Pure logic: rapid-fire projectile targeting, multi-bullet spread at higher levels, collision detection, DrawingSurface rendering
- `scripts/DamageCircleWeapon.ts` — Pure logic: periodic AoE pulse damage within radius, expanding ring VFX rendering on DrawingSurface
- `scripts/SpriteUpdater.ts` — Creates and manages a pool of 26 CharacterSpriteViewModel instances; computes screen-space transforms for hero and enemy XAML sprites each frame (type-aware sizing and textures)
- `scripts/IsoRenderer.ts` — Flat 2D top-down projection math (worldToScreen/screenToWorld with PIXELS_PER_UNIT=64), map background rendering, attack range ring (circles)
- `scripts/CombatSystem.ts` — Auto-attack logic, target finding, contact damage, Sewer Bruiser frontal armor
- `scripts/EnemySystem.ts` — Enemy spawning (type-aware with HP scaling), type-specific AI (Gunner kite, Drone sine, Gas cloud timer), timers, despawn, cleanup
- `scripts/WaveSystem.ts` — Wave state machine (20 waves), typed burst spawning with wave-based enemy mixing, breather periods
- `scripts/ProjectileSystem.ts` — Gunner Mouse projectile pool, spawning, movement, hero collision, DrawingSurface rendering
- `scripts/GasCloudSystem.ts` — Gas Rat cloud pool, spawning, aging, tick damage, DrawingSurface rendering (translucent circles)
- `scripts/PickupSystem.ts` — Pickup spawning, lifetime/flash/collection, DrawingSurface rendering (gems + coins)
- `scripts/AnimationSystem.ts` — Attack swing, spawn/death/hurt transforms, camera shake, easing
- `scripts/ParticleSystem.ts` — Hit sparks, crit sparks, death explosion, particle update/draw
- `scripts/FloatingText.ts` — Pixel-art damage number rendering
- `scripts/CharacterSpriteViewModel.ts` — @uiViewModel class representing a single character sprite in the ItemsControl collection (position, body, weapon, flash properties)
- `scripts/ArenaVerminViewModel.ts` — ViewModel with DrawingSurface binding, characterSprites collection (26-item pool of CharacterSpriteViewModel), HUD state, and UiEvents
- `scripts/Constants.ts` — All game constants (canvas, combat, enemy type stats, animation, particle, wave data table, pickup specs, XP formula, HUD layout)
- `scripts/Types.ts` — TypeScript interfaces and enums for all game state (including EnemyType, WeaponId, DroneState, UpgradeOption, ProjectileState, GasCloudState)
- `scripts/Assets.ts` — TextureAsset declarations for all custom art assets (CharacterMain, Vilain, Weapon01-03, enemy weapon sprites (DroneRatWeapon, BruiserWeapon, GasRatWeapon), gem01/02, health_heart, missile, Impact/Splash/Critique, HUD sprites, map.png, drone_weapon.png) with legacy aliases for backward compatibility
- `xaml/game.xaml` — Thin shell XAML layout with DrawingSurface elements and ContentControl references to GlobalResources templates
- `xaml/GlobalResources.xaml` — Auto-loaded ResourceDictionary containing all UI DataTemplates: SpriteItemTemplate, HudTemplate, PauseMenuTemplate, UpgradeScreenTemplate, TitleScreenTemplate, DeathOverlayTemplate, DeathScreenTemplate, shared GameButtonTemplate, SpriteContainerStyle, and BooleanToVisibilityConverter

## Entity Setup
- `2d_game_entity` — Scene entity with CustomUiPlatformComponent (pointing to game.xaml) and ArenaVerminComponent
