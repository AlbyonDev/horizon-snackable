# Art Direction

## Visual Style

3D realistic and sporty style for a football/soccer game. Objects have a modern, clean look with detailed textures. Colors are vivid and dynamic, evoking the energy of the sport.

## Key Elements

### Ball
- Realistic modern soccer ball with classic black pentagon / white hexagon pattern
- Scale 0.56 world units (radius 0.28)

### Goal
- Voxel-style soccer goal with 4 clearly visible blocky posts, stepped crossbar, and geometric net
- White cubic aesthetic with retro blocky design
- Dimensions: 6.2m wide x 2.4m tall x 1.4m deep

### Goalkeepers
- Three distinct character models with different body proportions matching their gameplay archetype:
  - Keeper 1 (Aggressive): Athletic build
  - Keeper 2 (Big Slow): Larger, wider frame
  - Keeper 3 (Quick Stepper): Smaller, agile build

### Field
- Green grass surface with white boundary lines
- Penalty area markings, penalty spot, and arc
- Single plane primitive (Ground) centered in the scene

### Stadium Background
- Full-width plane primitive (Background) placed behind the goal as a stadium backdrop

## Color Palette

### UI Colors
| Element | Color | Hex |
|---------|-------|-----|
| Goal feedback | Gold | #FFD700 |
| Save feedback | Red | #FF4444 |
| Post feedback | White | #FFFFFF |
| Miss feedback | Orange | #FF6B35 |
| Score cartouche | Dark semi-transparent | #CC111111 |
| Game over overlay | Dark overlay | #CC000000 |
| Replay button | Gold | #FFD700 |
| Star rating (active) | Gold | #FFD700 |

### VFX Colors
| Effect | Colors |
|--------|--------|
| Goal confetti | Gold tones |
| Save particles | Blue / white |
| Post sparks | White |
| Miss dust | Brown / green |
| UI confetti | 8-color palette: gold, red, blue, green, pink, purple, orange, cyan |

## Typography

- Font family: Roboto
- Feedback text: 260px (GOAL), scaled per outcome
- HUD score: Large bold in cartouche badge
- Game over score: 130px bold golden with black outline
- Stats labels: Gray, values in white

## Camera

- Fixed camera at (0, 3, 13), looking at (0, 1.2, 0)
- FOV 58 degrees
- Portrait mobile orientation (9 x 16 world units play area)
