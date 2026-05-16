# PuzzleQuest - Match-3 RPG Game Design

## Game Overview
PuzzleQuest is a Match-3 RPG puzzle game where players swap gems on a grid to create matches of 3 or more, earning points and triggering combo effects. The game features vibrant anime-styled crystal gems with a JRPG aesthetic.

## Controls
- **Tap & Drag**: Tap a gem and drag to an adjacent gem to swap them
- **Valid Swaps Only**: Swaps only execute if they create a match of 3+

## Game Objects

### Gems (5 Types)
1. **Red (Crimson)** - Fire element crystal
2. **Blue (Azure)** - Water element crystal
3. **Green (Emerald)** - Nature element crystal
4. **Yellow (Aureate)** - Light element crystal
5. **Purple (Void)** - Dark element crystal

### Board
- 8×8 grid of gems
- Gems fall from top when matches are cleared
- New gems spawn at top to fill empty spaces

## Game Flow / States
1. **Title Screen** → Start button begins gameplay
2. **Playing** → Match gems, earn score, advance levels
3. **Game Over** → Score display with restart option

## Scoring & Progression
- 3-match: 100 points
- 4-match: 250 points
- 5-match: 500 points
- Cascading combos multiply score
- Level increases every 1000 points (speeds up or adds challenge)

## Visual Style
- 2D Anime JRPG with chibi proportions
- Vibrant, glowing crystals with clean outlines
- Dark fantasy board background
- Particle effects on matches

## Sprite Asset List
- `gem_red.png` - Red crimson crystal
- `gem_blue.png` - Blue azure crystal
- `gem_green.png` - Green emerald crystal
- `gem_yellow.png` - Yellow aureate crystal
- `gem_purple.png` - Purple void crystal
- `title_text.png` - Game title logo
- `tagline_text.png` - Tagline text
- `logo_horizon.png` - Horizon logo

## UI Layout
- **XAML**: Title screen, HUD (score, level, combo), game over overlay
- **DrawingSurface**: Game board with gem rendering, match animations, particle effects

## Canvas Dimensions
- Portrait: 480×800
