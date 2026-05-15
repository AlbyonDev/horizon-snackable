# AtlasV Fishing — Project Summary

## Concept

Mobile portrait fishing game (9×16 world units) built with Meta Horizon Worlds SDK.
Single player, local-only. Designed to be **snackable** — a satisfying session in under 3 minutes with no explanation needed.

The game is built around 3 S:
- **Simple** — one tap to cast, swipe to steer, automatic everything else
- **Satisfying** — juice at every beat: freeze frames, shake, flash, stretch/squash
- **Short** — one run = cast → dive → surface → catch reveal → reset

## Gameplay Loop

1. **Idle** — Hook hangs from rod at water surface, fish swim at depth.
2. **Throwing** — Tap anywhere → hook launches in a physics arc toward the center of the play area (slight random spread). No player input during flight.
3. **Diving** — Hook enters water and descends automatically. Player swipes horizontally to steer. Fish within range attach to the hook automatically.
4. **Surfacing** — Hook automatically rises at speed, dragging hooked fish up.
5. **Launching** — Fish fly upward in a staggered arc reward animation and exit the screen.
6. **Reset** — Brief pause, then back to Idle.

There is no reel mechanic, no power gauge, no timing challenge. The engagement comes from steering during the dive and the anticipation of what you'll catch.

## Fish Database

31 species across 4 zones. Rarity: common / rare / legendary.

| Zone | Depth (world Y) | Species |
|------|-----------------|---------|
| 1 — Surface   | 4.5 → -8.5  | Clownfish, Koi, Blue Discus, Butterflyfish, Angelfish, Rainbow Fish, Emperor Snapper, Neon Tetra |
| 2 — Mid-depth | -8.5 → -24.5 | Silver Carp, Green Discus, Dolphin, Flame Angelfish, Sand Flounder, Sea Turtle, Manta Ray, Lionfish, Sunfish |
| 3 — Abyss     | -24.5 → -38.5 | Violet Barracuda, Blue Flounder, Reef Shark, Pink Dolphin, Barracuda, Pink Shark, Hammerhead Shark, Electric Eel, Jellyfish |
| 4 — Deep Abyss | -38.5+ | Lanternfish, Abyssal Anglerfish, Goblin Shark, Golden Seahorse, Phantom Pufferfish |

Fish from all zones swim at depth regardless of unlock state.

All 31 species are rendered as 2D sprites on a fullscreen DrawingSurface canvas overlay (FishSpriteRenderer), with their 3D meshes hidden. No 3D fish models remain in active gameplay.

## Zone Progression

Zones unlock by catching unique species — no XP, no currency.

| Unlock | Threshold |
|--------|-----------|
| Zone 2 | 3 unique species |
| Zone 3 | 7 unique species |

The hook's max dive depth increases as zones unlock, giving access to deeper fish.

## Architecture

```
ClientSetup           → camera lock, focused interaction, registers camera entity to GameCameraService
GameManager           → phase state machine (Idle → Throwing → Diving → Surfacing → Launching → Reset)
HookController        → hook physics, line rendering, fish collection, launch reward anim
SimpleFishController  → per-fish swim AI, hooked follow, launch arc (implements IFishInstance)
FishRegistry          → live IFishInstance spatial lookup (findHits)
FishPoolService       → entity pool — pre-spawns fish, activates/benches without spawning/destroying; rolls species by depth wave formula
FishDefs              → static data: all 30 species definitions
FishCollectionService → catch journal (unique counts, persisted via PlayerProgressService)
PlayerProgressService → server-side save/load; syncs gold, upgrades, catch journal to client
GameCameraService     → vertical scroll following hook during dive + one-shot and continuous camera shake
VFXService            → centralised juice: shake, flash, freeze frame, haptic stub, stretch/squash
GoldCoinsService      → coin burst + gold value text animation on FishCollected (canvas-based, pooled)
BubblePool            → pre-spawns bubble entities; fish request bubbles via acquire(); auto-release on surface hit
InteractiveHUDViewModel → buttons-only HUD layer (cast button + upgrade buttons); isInteractable=true during Idle, isVisible=false otherwise to stop blocking swipe input
GameHUDViewModel      → counters HUD layer (gold + depth + max depth + collection open button); isInteractable=true (button needs touch); counter panels use IsHitTestVisible=False so they don't block InteractiveHUD
FishingHUDViewModel   → species discovery progress bar + fish counter (hooked/max) during dive
FishCollectionUIComponent → fullscreen collection overlay; grid of all 31 fish species showing caught/uncaught state; detail view on tap; starts invisible (isVisible=false) to avoid blocking touch; becomes visible only when opened via GameHUD button; integrates with FishCollectionService for catch data
FishSpriteRenderer    → fullscreen DrawingSurface overlay rendering all 30 sprite-based fish species each frame; converts world positions to canvas pixels using GameCameraService scroll offset; applies physics-based animation transforms (trail lag, tilt, squash/stretch, wiggle) to hooked fish via HookedFishAnimator
HookedFishAnimator    → per-fish spring-damper animation for hooked fish: trailing offset, rotation tilt from horizontal hook velocity, squash/stretch from speed, wiggle oscillation; reacts to hook movement for juicy feel
TitleScreenUIComponent → fullscreen title screen overlay with background image (BGStart.png), game logo (FishingLegend_logo.png), and orange buzzer-style Play button; fires TitleScreenPlayRequested LocalEvent when pressed; renderOrderOffset=10 to display above all other UI
```

## VFX System

All juice flows through `VFXService`:

| Method | Effect |
|--------|--------|
| `shake(dur, amp)` | Camera shake via GameCameraService |
| `flash(dur, r, g, b)` | Full-screen color overlay fade-out |
| `freeze(durationMs)` | Global time-stop (camera exempt) |
| `haptic(intensity)` | Stub — ready for SDK haptic API |
| `stretch(entity, factor, dur)` | Scale Y up / X down then recover |
| `squash(entity, factor, dur)` | Scale Y down / X up then recover |

Built-in trigger: `FishHooked` → freeze 60ms + shake 0.30s + flash 0.18s.

The `isFrozen` flag is checked at the top of `HookController.onUpdate` and `SimpleFishController.onUpdate`. `GameCameraService` is exempt so shake continues during freeze.

## Depth Gradient Shader

An unlit surface shader (`Shaders/DepthGradient.surface`) colors geometry based on world Y position, creating the underwater atmosphere. The gradient transitions from turquoise at the surface (Y 5.0) to deep night blue at the abyss (Y -40.0). A matching material (`Materials/DepthGradient.material`) is ready to apply to water background meshes. The four tunable properties (top color, bottom color, top Y, bottom Y) can be adjusted per-material instance to fine-tune the look.

## Key Extension Points

| Goal | Where |
|------|-------|
| Add a fish species | One entry in `FishDefs.ts` + sprite in `Sprites/Fish/` + entry in `FishSpriteAssets.ts` |
| Add a juice trigger | Subscribe to an event in `VFXService`, call shake/flash/freeze |
| Add a trail or particle FX | New method in `VFXService` |
| New gameplay phase | Add value to `GamePhase` enum, handle in `GameManager` + `HookController` |
| Tweak cast arc | `CAST_CENTER_VX`, `CAST_VX_RANDOM`, `CAST_VY`, `CAST_GRAVITY` in `Constants.ts` |
| Tweak dive feel | `DIVE_SPEED`, `DIVE_SWIPE_FORCE`, `DIVE_CENTER_PULL`, `DIVE_BOUNCE` in `Constants.ts` |
