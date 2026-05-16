# PuzzleQuest - Execution Plan

## Tasks

- [x] 1. Create docs/game_design.md
- [x] 2. Create docs/execution_plan.md
- [x] 3. Generate gem sprite assets (red, blue, green, yellow, purple)
- [x] 4. Process sprites (remove backgrounds, crop to content)
- [x] 5. Set premultiply alpha on all gem sprites
- [x] 6. Create scripts/Assets.ts with TextureAsset declarations
- [x] 7. Create scripts/Constants.ts (canvas size, board dimensions, colors, speeds)
- [x] 8. Create scripts/Types.ts (interfaces for gems, board state, game state)
- [x] 9. Create scripts/TitleScreenViewModel.ts (title screen UI state)
- [x] 10. Create xaml/title_screen.xaml (title screen layout)
- [x] 11. Create scripts/GameViewModel.ts (game HUD state, events)
- [x] 12. Create xaml/game.xaml (fullscreen layout, DrawingSurface, XAML HUD)
- [ ] 13. Create scripts/BoardLogic.ts (match detection, gem swapping, cascading)
- [ ] 14. Create scripts/GameRenderer.ts (all draw functions for board and gems)
- [ ] 15. Create scripts/GameComponent.ts (game loop, input, state management)
- [ ] 16. Configure scene template with CustomUiComponent
- [ ] 17. Test and iterate

## File Plan

| File | Contents | Target Lines |
|------|----------|--------------|
| `scripts/Assets.ts` | TextureAsset declarations for all sprites | < 50 |
| `scripts/Constants.ts` | Canvas size, board dims, colors, speeds | < 100 |
| `scripts/Types.ts` | Interfaces, enums, type definitions | < 100 |
| `scripts/TitleScreenViewModel.ts` | Title screen ViewModel | < 50 |
| `scripts/TitleScreenComponent.ts` | Title screen component | < 100 |
| `scripts/GameViewModel.ts` | Game HUD ViewModel, events | < 100 |
| `scripts/BoardLogic.ts` | Match detection, cascading, board state | < 400 |
| `scripts/GameRenderer.ts` | All draw functions | < 400 |
| `scripts/GameComponent.ts` | Main component, game loop, input | < 400 |

## Rendering Strategy

- **DrawingSurface**: Game board, gems, match animations, particles
- **Standard XAML**: Title screen, score HUD, level display, game over overlay

## Sprite Generation Plan (Completed)

All 5 gem sprites generated and processed:
- sprites/gem_red.png
- sprites/gem_blue.png
- sprites/gem_green.png
- sprites/gem_yellow.png
- sprites/gem_purple.png
