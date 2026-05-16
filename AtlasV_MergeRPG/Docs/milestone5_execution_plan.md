# Milestone 5: Dungeon System - Execution Plan

## Overview
Build the dungeon progression system with 3-room structure (2 combat + 1 boss), dungeon selection screen, map overlay, room transitions, and reward system.

## Tasks

- [ ] 1. Generate dungeon background sprites (Forest, Crypt, Volcano)
- [ ] 2. Generate boss enemy sprites (Nature Boss, Undead Boss, Fire Boss)
- [ ] 3. Create scripts/DungeonTypes.ts (dungeon definitions, enemy pools, rewards)
- [ ] 4. Create scripts/DungeonState.ts (current dungeon, room progress, rewards tracking)
- [ ] 5. Create scripts/DungeonSelectionViewModel.ts (dungeon selection UI state)
- [ ] 6. Create xaml/dungeon_selection.xaml (3 dungeon buttons, roster preview)
- [ ] 7. Update scripts/GameViewModel.ts (add dungeon map overlay state)
- [ ] 8. Create scripts/DungeonMapRenderer.ts (render map overlay with checkpoints)
- [ ] 9. Create scripts/RoomTransitionHandler.ts (room completion, rewards, next room)
- [ ] 10. Create scripts/XpSystem.ts (hero XP gain, level up, stat increases)
- [ ] 11. Update scripts/GameComponent.ts (integrate dungeon flow, room transitions)
- [ ] 12. Update xaml/game.xaml (add dungeon map overlay, room rewards panel)
- [ ] 13. Create scripts/DungeonCompletionViewModel.ts (completion screen UI)
- [ ] 14. Create xaml/dungeon_completion.xaml (rewards summary, next dungeon button)
- [ ] 15. Test full dungeon flow (selection → room 1 → room 2 → boss → completion)

## File Plan

| File | Contents | Target Lines |
|------|----------|--------------|
| `scripts/DungeonTypes.ts` | Dungeon definitions, enemy pools, reward configs | < 200 |
| `scripts/DungeonState.ts` | Current dungeon state, room tracking, rewards | < 150 |
| `scripts/DungeonSelectionViewModel.ts` | Dungeon selection UI state | < 100 |
| `scripts/DungeonMapRenderer.ts` | Map overlay rendering | < 200 |
| `scripts/RoomTransitionHandler.ts` | Room completion logic, rewards | < 250 |
| `scripts/XpSystem.ts` | XP gain, level up, stat progression | < 200 |
| `xaml/dungeon_selection.xaml` | Dungeon selection screen layout | < 150 |
| `xaml/dungeon_completion.xaml` | Completion screen layout | < 100 |

## Dungeon Definitions

### Forest Dungeon
- **Background**: Green forest interior with vines
- **Enemies**: Slime (RED), Goblin (GREEN)
- **Boss**: Nature Treant (GREEN/YELLOW)

### Crypt Dungeon
- **Background**: Dark stone crypt with torches
- **Enemies**: Skeleton (BLUE), Ghost (PURPLE)
- **Boss**: Undead Lich (PURPLE/BLUE)

### Volcano Dungeon
- **Background**: Lava cave with fire
- **Enemies**: Fire Elemental (RED), Demon (YELLOW)
- **Boss**: Inferno Dragon (RED/YELLOW)

## Reward Structure

### Combat Rooms (1-2)
- Gold: 50 per room

### Boss Room
- Gold: 100
- 1 Random Hero Card (placeholder for Milestone 6)

### XP System
- XP per room: 20 XP
- XP per boss: 50 XP
- Level up every 100 XP
- Stat increase per level: +5 ATK, +20 HP

## Hero State Between Rooms
- ✅ HP persists
- ❌ Buffs/debuffs reset
- ❌ Mana resets to 0
- ✅ XP accumulates

## Implementation Order

1. **Sprite Generation** (backgrounds + bosses)
2. **Data Layer** (DungeonTypes, DungeonState)
3. **Dungeon Selection Screen** (UI + ViewModel)
4. **Dungeon Map Overlay** (visual progress indicator)
5. **Room Transition System** (completion → rewards → next room)
6. **XP System** (gain XP, level up, stat increases)
7. **Dungeon Completion Screen** (summary + rewards)
8. **Integration & Testing** (full flow)
