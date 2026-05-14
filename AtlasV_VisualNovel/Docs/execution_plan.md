# Hooked on a Feeling — Execution Plan: Milestone 1 (Foundation)

## Goal
A single fish (Nereia) appears, the Cast loop works, the game saves.

## Tasks

- [x] 1. Read design documents (GDD, Visual Bible, VN Systems Bible)
- [x] 2. Create docs/game_design.md summary
- [x] 3. Create docs/execution_plan.md (this file)
- [x] 4. Generate Nereia sprite assets (4 expressions: NEUTRAL, CURIOUS, WARM, ALARMED)
- [x] 5. Generate Nereia's pond background (The Lily Shallows)
- [x] 6. Process sprites (remove background, crop to content)
- [x] 7. Copy sprites to sprites/ folder with descriptive names
- [x] 8. Set Premultiply Alpha on all sprite textures
- [x] 9. Create scripts/Assets.ts (TextureAsset declarations)
- [x] 10. Create scripts/Constants.ts (canvas dimensions, colors, game config)
- [x] 11. Create scripts/Types.ts (interfaces for game state, fish, beats, actions)
- [x] 12. Create scripts/FloaterViewModel.ts (ViewModel + UiEvents)
- [x] 13. Create xaml/floater.xaml (fullscreen DrawingSurface + XAML overlays)
- [x] 14. Create scripts/FlagSystem.ts (centralized flag store)
- [x] 15. Create scripts/SaveSystem.ts (AUTO_ONLY persistence)
- [x] 16. Create scripts/CastData.ts (Nereia Tier 1 Beat content)
- [x] 17. Create scripts/FloaterRenderer.ts (draw background, fish, float, line, dialogue, action menu)
- [x] 18. Create scripts/FloaterGame.ts (main component: game loop, Cast phases, input handling)
- [x] 19. Build all scripts and verify compilation
- [x] 20. Set up scene entity with CustomUiComponent + game script
- [ ] 21. Verify full Cast loop plays through correctly (manual playtest needed)

## File Plan

| File | Purpose | Target Lines |
|------|---------|--------------|
| scripts/Assets.ts | TextureAsset declarations for all sprites | <50 |
| scripts/Constants.ts | Canvas size, colors, timing, action definitions | <150 |
| scripts/Types.ts | Interfaces: GameState, Fish, Beat, Action, Flag | <150 |
| scripts/FloaterViewModel.ts | ViewModel with drawCommands + UI state | <80 |
| scripts/FlagSystem.ts | Flag store, get/set/check, namespace support | <100 |
| scripts/SaveSystem.ts | Auto-save after Beat resolution | <80 |
| scripts/CastData.ts | Nereia Tier 1 dialogue content (2 Beats) | <200 |
| scripts/FloaterRenderer.ts | All draw functions | <400 |
| scripts/FloaterGame.ts | Main component: lifecycle, input, Cast loop | <500 |
| xaml/floater.xaml | Fullscreen layout with DrawingSurface | <50 |

## Sprite Generation Plan
Generate BEFORE any code that references them:
1. nereia_neutral.png — Koi, EXPR_NEUTRAL state
2. nereia_curious.png — Koi, EXPR_CURIOUS state  
3. nereia_warm.png — Koi, EXPR_WARM state
4. nereia_alarmed.png — Koi, EXPR_ALARMED state
5. bg_lily_shallows.png — Nereia's territory background

## Rendering Strategy
- **DrawingSurface:** Background, fish portrait, float, fishing line, dialogue box, action menu, emotion icons
- **XAML:** Title screen (start button), HUD overlay (score/tier text)
