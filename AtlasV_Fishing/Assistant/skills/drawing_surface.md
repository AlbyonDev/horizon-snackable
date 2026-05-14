---
name: drawing_surface
summary: DrawingSurface overview, architecture, coordinate system, and complete DrawingCommandsBuilder API reference
include: always
agents: [global]
---

# DrawingSurface API for 2D Games

The DrawingSurface is a Noesis custom component that enables procedural 2D rendering in Horizon Worlds. It provides an immediate-mode drawing API similar to HTML5 Canvas, allowing you to create 2D games entirely through TypeScript.

## When to Use DrawingSurface vs Standard XAML UI

**DrawingSurface** is designed for **game rendering** - dynamic, procedural graphics that update every frame:
- Game worlds, backgrounds, and environments
- Player characters, enemies, and game objects
- Particle effects and animations
- Any content that requires frame-by-frame drawing

**Standard Custom UI XAML** should be used for **UI elements**:
- Menus, buttons, and interactive controls
- HUD elements (score displays, health bars, inventory)
- Dialog boxes and text overlays
- Settings screens and configuration panels
- Any static or event-driven UI components

**Best Practice:** Combine both approaches - use DrawingSurface for the game canvas and overlay standard XAML UI elements on top for menus, HUD, and interactive controls. This gives you the best of both worlds: performant game rendering with proper, accessible UI components.

## Architecture Overview

The system consists of three main parts:

1. **XAML Layout** - Defines the UI structure with a `<local:DrawingSurface>` element
2. **UiViewModel** - Bridges TypeScript game state to XAML data binding
3. **DrawingCommandsBuilder** - TypeScript API that constructs drawing commands

## Rendering Options

DrawingSurface supports two rendering approaches:

| Approach | Best For | Performance |
|----------|----------|-------------|
| **Sprite/Image Rendering** (PREFERRED) | Characters, enemies, backgrounds, logos, HUD labels, game objects | Excellent - GPU optimized, looks great |
| **Vector Graphics** | Particles, procedural content | Good for < 50 objects |

**⚠️ CRITICAL: Sprites should be the DEFAULT for nearly all visual elements.** Generated sprite images look significantly better than procedural vector graphics. Use the **sprites** skill to generate images for characters, enemies, backgrounds, logos, title text, HUD labels (like "SCORE" or "HEALTH"), and any other visual element. Reserve vector graphics (`drawPath`, `drawEllipse`, `drawRect`) for particle effects or when the user explicitly requests procedural art.

**For dynamic numeric values** (actual score number, timer countdown), use `drawText()` — but consider pairing with a sprite-based label image for the static portion (e.g., a stylized "SCORE:" sprite next to the dynamic number).

## Core Imports

```typescript
import {
  CustomUiComponent,
  uiViewModel,
  UiViewModel,
  UiEvent,
} from 'meta/custom_ui';
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  FlowDirection,
  TextAlignment,
  TextTrimming,
  Stretch,
  TileMode,
  CoordinateType,
} from 'meta/custom_ui_experimental';
import {
  Color,
  OnEntityCreateEvent,
  OnWorldUpdateEvent,
  Component,
  component,
  subscribe,
} from 'meta/platform_api';
import { TextureAsset } from 'meta/worlds';
```

## Loading Texture Assets

**⚠️ CRITICAL: Use `TextureAsset` from `meta/worlds` with relative `@` paths to load texture assets in code.** Do NOT use component properties with entity asset links — that approach is unreliable and inefficient.

**Asset path format:** `@<folder>/<filename>`

The `@` prefix refers to the current package root. The path is relative to the package folder on disk.

**⚠️ CRITICAL: The `TextureAsset` constructor argument MUST be a static string literal.** Variables, template expressions, function calls, and string concatenation are NOT allowed. Each asset must be its own `new TextureAsset("@path/to/file.png")` with a hardcoded string.

### Recommended Pattern: Dedicated Asset File

Create an `Assets.ts` file that declares all texture assets in one place:

```typescript
// Assets.ts
import { TextureAsset } from 'meta/worlds';

// Each TextureAsset MUST use a static string literal — no variables or templates!
export const playerTexture: TextureAsset = new TextureAsset("@sprites/player.png");
export const enemySlimeTexture: TextureAsset = new TextureAsset("@sprites/enemy_slime.png");
export const backgroundTexture: TextureAsset = new TextureAsset("@sprites/background.png");
export const logoTitleTexture: TextureAsset = new TextureAsset("@sprites/logo_title.png");
export const labelScoreTexture: TextureAsset = new TextureAsset("@sprites/label_score.png");
```

### Using Assets in Draw Calls

```typescript
// GameRenderer.ts
import { playerTexture, enemySlimeTexture, backgroundTexture } from './Assets';
import { ImageBrush } from 'meta/custom_ui_experimental';

// Use directly with ImageBrush
const playerBrush = new ImageBrush(playerTexture);
this.builder.drawRect(playerBrush, null, player.x, player.y, 32, 32);

// Or with drawImage
this.builder.drawImage(backgroundTexture, 0, 0, 480, 800);
```

## Basic Game Structure

```typescript
@uiViewModel()
class MyGameViewModel extends UiViewModel {
  drawCommands: string = '';

  override readonly events = {
    onRestart: new UiEvent('onRestart'),
  };
}

@component()
export class MyGameComponent extends Component {
  private viewModel: MyGameViewModel = new MyGameViewModel();
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();

  @subscribe(OnEntityCreateEvent)
  onCreate() {
    const customUiComponent = this.entity.getComponent(CustomUiComponent);
    if (customUiComponent != null) {
      customUiComponent.dataContext = this.viewModel;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate() {
    this.updateGameLogic();
    this.render();
  }

  private render(): void {
    this.builder.clear();
    // Draw game content here
    this.builder.applyTo(this.viewModel, 'drawCommands');
  }
}
```

## Key Concepts

### Resource-Based Drawing

Resources (brushes, pens, fonts) are created as standalone class instances via `new` and passed directly to draw calls:

```typescript
// Create resources as class instances
const redBrush = new SolidBrush(Color.fromHex('#FF0000'));
const whiteBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
const outlinePen = new Pen(whiteBrush, 2);

// Use resources in draw calls
this.builder.drawRect(redBrush, outlinePen, x, y, width, height);
```

### Frame-by-Frame Rendering

Unlike retained-mode graphics, DrawingSurface requires redrawing everything each frame:

```typescript
private render(): void {
  // ALWAYS clear at the start of each frame
  this.builder.clear();

  // Draw background first (painter's algorithm - back to front)
  this.drawBackground();

  // Draw game objects
  this.drawGameObjects();

  // Apply commands to send to DrawingSurface
  this.builder.applyTo(this.viewModel, 'drawCommands');
}
```

**Note:** HUD and UI elements should generally use standard XAML controls overlaid on the DrawingSurface, not DrawingSurface rendering. See the `standard_ui_vs_drawingsurface` skill.

### Coordinate System

- Origin (0,0) is at the **top-left** corner
- X increases to the **right**
- Y increases **downward**
- Use consistent canvas dimensions (e.g., 480x640 for portrait, 640x480 for landscape)

## Input Handling

**CRITICAL: DrawingSurface does NOT handle input.** It is purely a rendering component. You cannot detect clicks, touches, or any user interaction directly on the DrawingSurface itself.

### Solution: FocusedInteractionService

Use `FocusedInteractionService` to capture touch input with precise coordinates. This provides:

- Touch start, move, and end events
- Normalized screen coordinates (0-1 range)
- Multi-touch support via `interactionIndex`

```typescript
import {
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputEventPayload,
} from 'meta/worlds';

// Enable touch input mode
private enableTouchInput(): void {
  const service = FocusedInteractionService.get();
  service.enableFocusedInteraction({
    disableFocusExitButton: false,
    disableEmotesButton: true,
    interactionStringId: 'game_touch',
  });
}

// Handle touch events
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
  const pos = this.screenToCanvas(payload.screenPosition);
  // Handle touch start at pos.x, pos.y
}

@subscribe(OnFocusedInteractionInputMovedEvent)
onTouchMove(payload: OnFocusedInteractionInputEventPayload) {
  const pos = this.screenToCanvas(payload.screenPosition);
  // Handle touch move
}

@subscribe(OnFocusedInteractionInputEndedEvent)
onTouchEnd(payload: OnFocusedInteractionInputEventPayload) {
  const pos = this.screenToCanvas(payload.screenPosition);
  // Handle touch end
}
```

See the **Touch Input** skill for complete coordinate mapping details and examples.

## Performance Considerations

1. **Use sprites as the default for all visual elements** - Generate sprite images for characters, enemies, backgrounds, logos, HUD labels, and game objects using the **sprites** skill
2. **Minimize resource creation** - Create commonly used brushes/pens/fonts once as class fields, not per frame
3. **Batch similar operations** - Draw all objects of the same type together when possible
4. **Use transforms** - Push/pop transforms for complex object rendering instead of recalculating positions

### When to Use Vector vs Sprite Rendering

| Use Case | Recommended Approach |
|----------|---------------------|
| Characters, enemies, NPCs | Sprites (ALWAYS — use sprite generation tools) |
| Backgrounds, terrain | Sprites (generated images) |
| Logos, title text, HUD labels | Sprites (stylized generated images) |
| Game objects, collectibles | Sprites |
| Simple geometric gameplay (Tetris blocks, Pong paddles) | Vector (`drawRect`, `drawPath`) — acceptable |
| Particle effects | Vector (small, numerous, short-lived) |
| Dynamic numeric values (score number, timer) | `drawText()` or XAML `<TextBlock>` |
| Instructional/tutorial text | `drawText()` or XAML `<TextBlock>` |
| User explicitly requests procedural art | Vector |

## ⚠️ REQUIRED: Fullscreen Game Layout Pattern

**For fullscreen 2D games, you MUST use the proper XAML wrapper pattern.** See the **XAML Setup** skill for the required structure.

The pattern uses an outer Grid with black background and a Viewbox with Uniform stretch to ensure:
- The game fills the entire screen
- The 3D world is completely hidden behind it
- Content scales uniformly to fit any screen size

See the **XAML Setup** skill for detailed examples and the **Complete Example** skill for a full working template.

## Common Canvas Sizes

| Orientation | Width | Height | Use Case |
|-------------|-------|--------|----------|
| Portrait    | 480   | 800    | Mobile-style games |
| Landscape   | 800   | 480    | Arcade games |
| Square      | 600   | 600    | Puzzle games |

**Note:** When using the fullscreen pattern, the inner Grid dimensions define your game's logical resolution. Use FocusedInteractionService for all touch input - see the Touch Input skill for coordinate mapping details.


---

# DrawingCommandsBuilder API Reference

The `DrawingCommandsBuilder` class constructs binary command buffers for the `DrawingSurface` component.

## Imports

The DrawingCommandsBuilder and related types are exported from the **experimental** custom UI module.

**Resource classes** (brushes, pens, fonts) are instantiated directly via `new` — they are NOT created through builder methods.

```typescript
// Runtime values (classes, enums)
import {
  DrawingCommandsBuilder,
  SolidBrush,
  LinearGradientBrush,
  RadialGradientBrush,
  ImageBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  FlowDirection,
  TextAlignment,
  TextTrimming,
  Stretch,
  TileMode,
  CoordinateType,
} from 'meta/custom_ui_experimental';

// Type-only imports (interfaces) - MUST use 'import type'
import type {
  Brush,
  GradientStop,
  DrawTextOptions,
  ImageBrushOptions,
} from 'meta/custom_ui_experimental';
```

> **⚠️ CRITICAL: Type-Only Imports Required**
>
> When `verbatimModuleSyntax` is enabled (default in this project), type-only exports **MUST** be imported using `import type` syntax. The following types require `import type`:
>
> - `Brush` - Abstract base class (used as a type for parameters)
> - `GradientStop`, `DrawTextOptions`, `ImageBrushOptions` - Interfaces
>
> **Error if imported incorrectly:**
> ```
> 'Brush' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
> ```

**✅ CORRECT - Separate type imports (RECOMMENDED):**
```typescript
// Runtime values (classes, enums)
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
} from 'meta/custom_ui_experimental';

// Type-only imports (interfaces) - MUST use 'import type'
import type {
  Brush,
  GradientStop,
  DrawTextOptions,
  ImageBrushOptions,
} from 'meta/custom_ui_experimental';
```

**✅ ALSO CORRECT - Inline type keyword:**
```typescript
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  type Brush,
  type GradientStop,
  type DrawTextOptions,
  type ImageBrushOptions,
} from 'meta/custom_ui_experimental';
```

**Note:** The main `meta/custom_ui` module exports `CustomUiComponent`, `uiViewModel`, `UiViewModel`, `UiEvent`, etc. The drawing-related types are in the experimental module.

## Type Definitions

```typescript
// Abstract base class for all brush types
abstract class Brush {
  abstract readonly kind: string;
}

interface GradientStop {
  offset: number;  // 0.0 to 1.0
  color: Color;
}
```

## Enums

### Text Enums

```typescript
enum FlowDirection {
  LeftToRight = 0,
  RightToLeft = 1,
}

enum TextAlignment {
  Left = 0,
  Right = 1,
  Center = 2,
  Justify = 3,
}

enum TextTrimming {
  None = 0,
  CharacterEllipsis = 1,
  WordEllipsis = 2,
}
```

### Font Enums

```typescript
enum FontFamily {
  Almendra = 'Almendra',
  Anton = 'Anton',
  Bangers = 'Bangers',
  FiraMono = 'Fira Mono',
  Galindo = 'Galindo',
  Kallisto = 'Kallisto',
  NotoSans = 'Noto Sans',
  Oswald = 'Oswald',
  Roboto = 'Roboto',
  RobotoMono = 'Roboto Mono',
  SpaceMono = 'Space Mono',
  SpecialElite = 'Special Elite',
  Teko = 'Teko',
}

enum FontWeight {
  Thin = 100,
  ExtraLight = 200,
  Light = 300,
  SemiLight = 350,
  Normal = 400,
  Medium = 500,
  SemiBold = 600,
  Bold = 700,
  ExtraBold = 800,
  Black = 900,
  ExtraBlack = 950,
}

enum FontStyle {
  Normal = 0,
  Oblique = 1,
  Italic = 2,
}

enum FontStretch {
  UltraCondensed = 1,
  ExtraCondensed = 2,
  Condensed = 3,
  SemiCondensed = 4,
  Normal = 5,
  SemiExpanded = 6,
  Expanded = 7,
  ExtraExpanded = 8,
  UltraExpanded = 9,
}
```

### Image Brush Enums

```typescript
enum Stretch {
  None = 0,       // Content preserves its original size
  Fill = 1,       // Content is resized to fill destination; aspect ratio NOT preserved
  Uniform = 2,    // Content is resized to fit destination while preserving aspect ratio (letterbox)
  UniformToFill = 3,  // Content fills destination while preserving aspect ratio (may crop)
}

enum TileMode {
  None = 0,    // Base tile is drawn but not repeated; remaining area is transparent
  Tile = 1,    // Base tile repeats to fill the area
  FlipX = 2,   // Alternate columns of tiles are flipped horizontally
  FlipY = 3,   // Alternate rows of tiles are flipped vertically
  FlipXY = 4,  // Combination of FlipX and FlipY
}

enum CoordinateType {
  Absolute = 0,              // Coordinates are absolute pixel values
  RelativeToBoundingBox = 1, // Coordinates are relative to the bounding box (0-1 range)
}
```

## Interfaces

### DrawTextOptions

Optional text layout parameters for `drawText()`:

```typescript
interface DrawTextOptions {
  flowDirection?: FlowDirection;    // Default: LeftToRight
  lineHeight?: number;              // Line height in pixels. 0 uses font default. Default: 0
  textAlignment?: TextAlignment;    // Default: Left
  textTrimming?: TextTrimming;      // Default: WordEllipsis
}
```

### ImageBrushOptions

Optional parameters for `ImageBrush`:

```typescript
interface ImageBrushOptions {
  sourceRect?: {x: number; y: number; w: number; h: number};  // Source rectangle for sprite sheets
  stretch?: Stretch;           // How the image stretches. Default: Fill
  tileMode?: TileMode;         // How the image tiles. Default: None
  coordinateType?: CoordinateType;  // How sourceRect coordinates are interpreted. Default: Absolute
}
```

## Initialization and Lifecycle

```typescript
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
} from 'meta/custom_ui_experimental';

// Create a builder instance (reusable across frames)
private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();

// In render loop:
this.builder.clear();           // Reset for new frame
// ... draw commands ...
this.builder.applyTo(viewModel, 'propertyName');  // Send to UI
```

## Resource Classes

Resources are created as standalone class instances via `new`. The builder automatically registers them in the binary command stream when used in draw calls — you do NOT need to register them manually.

**Resources are deduplicated by identity**: if you pass the same object instance to multiple draw calls within a frame, the builder encodes it only once. For maximum efficiency, create resource objects once and reuse them across frames.

### SolidBrush

Creates a solid color fill brush.

```typescript
new SolidBrush(color: Color)
```

**Example:**
```typescript
const red = new SolidBrush(Color.fromHex('#FF0000'));
const semiTransparent = new SolidBrush(new Color(1, 1, 1, 0.5));
```

### LinearGradientBrush

Creates a gradient brush between two points with color stops.

```typescript
new LinearGradientBrush(
  sx: number,      // Start X
  sy: number,      // Start Y
  ex: number,      // End X
  ey: number,      // End Y
  stops: GradientStop[]
)
```

**Example:**
```typescript
const gradient = new LinearGradientBrush(
  0, 0,      // Start point
  0, 100,    // End point (vertical gradient)
  [
    { offset: 0, color: Color.fromHex('#FFD700') },
    { offset: 1, color: new Color(1, 0.3, 0, 0) }  // Fade to transparent
  ]
);
```

### RadialGradientBrush

Creates a radial gradient brush with center, radii, and optional gradient origin.

```typescript
new RadialGradientBrush(
  cx: number,           // Center X
  cy: number,           // Center Y
  rx: number,           // Horizontal radius
  ry: number,           // Vertical radius
  stops: GradientStop[],
  ox?: number,          // Gradient origin X (defaults to cx)
  oy?: number           // Gradient origin Y (defaults to cy)
)
```

**Example:**
```typescript
const radial = new RadialGradientBrush(
  100, 100,    // Center
  50, 50,      // Radii
  [
    { offset: 0, color: Color.fromHex('#FFFFFF') },
    { offset: 1, color: Color.fromHex('#000000') }
  ]
);

// With offset origin (creates highlight effect)
const highlight = new RadialGradientBrush(
  100, 100,    // Center
  50, 50,      // Radii
  [
    { offset: 0, color: new Color(1, 1, 1, 0.8) },
    { offset: 1, color: new Color(1, 1, 1, 0) }
  ],
  80, 80       // Offset origin for highlight effect
);
```

### ImageBrush

Creates an image-based brush from a texture asset. Useful for tiled backgrounds, patterned fills, and sprite-based rendering on shapes.

```typescript
new ImageBrush(image: TextureAsset, options?: ImageBrushOptions)
```

**Example - Simple image fill:**
```typescript
const textureBrush = new ImageBrush(backgroundTexture);
this.builder.drawRect(textureBrush, null, 0, 0, 480, 800);
```

**Example - Sprite from sprite sheet:**
```typescript
const spriteBrush = new ImageBrush(spriteSheet, {
  sourceRect: {x: 32, y: 0, w: 32, h: 32},  // Select frame from sheet
  stretch: Stretch.Uniform
});
this.builder.drawRect(spriteBrush, null, enemy.x, enemy.y, 32, 32);
```

**Example - Tiled pattern:**
```typescript
const tiledBrush = new ImageBrush(patternTexture, {
  stretch: Stretch.None,
  tileMode: TileMode.Tile
});
this.builder.drawRect(tiledBrush, null, 0, 0, 480, 800);
```

### Pen

Creates a stroke pen from a brush.

```typescript
new Pen(brush: Brush, thicknessPx: number)
```

**Example:**
```typescript
const whiteBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
const thinPen = new Pen(whiteBrush, 1);
const thickPen = new Pen(whiteBrush, 3);
```

### Font

Creates a font resource for use with `drawText()`.

```typescript
new Font(
  family: string | FontFamily,  // Font family name or enum
  weight: FontWeight,           // Font weight
  style: FontStyle,             // Font style
  stretch: FontStretch           // Font stretch
)
```

**Example:**
```typescript
// Simple font
const gameFont = new Font(
  FontFamily.Roboto,
  FontWeight.Bold,
  FontStyle.Normal,
  FontStretch.Normal
);

// Monospaced font for scores
const monoFont = new Font(
  FontFamily.RobotoMono,
  FontWeight.Normal,
  FontStyle.Normal,
  FontStretch.Normal
);

// Custom font family string
const customFont = new Font(
  'My Custom Font',
  FontWeight.Normal,
  FontStyle.Normal,
  FontStretch.Normal
);
```

## Drawing Primitives

All drawing methods accept `null` for `brush` (no fill) or `pen` (no stroke).

### Draw Line

```typescript
drawLine(pen: Pen, x1: number, y1: number, x2: number, y2: number): void
```

**Example:**
```typescript
this.builder.drawLine(whitePen, 0, 0, 100, 100);
```

### Draw Rectangle

```typescript
drawRect(
  brush: Brush | null,     // Fill brush (null = no fill)
  pen: Pen | null,         // Stroke pen (null = no stroke)
  x: number, y: number,   // Top-left corner
  w: number, h: number    // Width and height
): void
```

**Example:**
```typescript
// Filled rectangle
this.builder.drawRect(redBrush, null, 10, 10, 100, 50);

// Outlined rectangle
this.builder.drawRect(null, whitePen, 10, 10, 100, 50);

// Filled and outlined
this.builder.drawRect(redBrush, whitePen, 10, 10, 100, 50);
```

### Draw Rounded Rectangle

```typescript
drawRoundRect(
  brush: Brush | null,
  pen: Pen | null,
  x: number, y: number,
  w: number, h: number,
  rx: number, ry: number    // Corner radii
): void
```

**Example:**
```typescript
this.builder.drawRoundRect(blueBrush, null, 10, 10, 100, 50, 8, 8);
```

### Draw Ellipse

```typescript
drawEllipse(
  brush: Brush | null,
  pen: Pen | null,
  cx: number, cy: number,   // Center point
  rx: number, ry: number    // X and Y radii
): void
```

**Example:**
```typescript
// Circle (equal radii)
this.builder.drawEllipse(brush, null, 100, 100, 25, 25);

// Ellipse
this.builder.drawEllipse(brush, null, 100, 100, 50, 25);
```

### Draw Path

Draws using SVG path data syntax.

```typescript
drawPath(brush: Brush | null, pen: Pen | null, data: string): void
```

**SVG Path Commands:**
- `M x,y` - Move to (start point)
- `L x,y` - Line to
- `H x` - Horizontal line to
- `V y` - Vertical line to
- `Z` - Close path
- `C x1,y1 x2,y2 x,y` - Cubic bezier
- `Q x1,y1 x,y` - Quadratic bezier

**Example:**
```typescript
// Triangle
const trianglePath = 'M 0 -12 L 8 10 L -8 10 Z';
this.builder.drawPath(brush, pen, trianglePath);

// Ship shape
const shipPath = 'M 0 -12 L 8 10 L 0 6 L -8 10 Z';
this.builder.drawPath(fillBrush, outlinePen, shipPath);
```

### Draw Text

Draws text within a bounding box with a specified font and optional layout parameters.

```typescript
drawText(
  text: string,
  x: number, y: number,      // Top-left position
  w: number, h: number,      // Bounding box width and height
  fontSizePx: number,        // Font size in pixels
  brush: Brush,              // Brush for the text fill (use SolidBrush for simple colors)
  font: Font,                // Font resource (REQUIRED)
  options?: DrawTextOptions  // Optional layout parameters
): void
```

**Example - Simple text:**
```typescript
const textBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
const font = new Font(FontFamily.Roboto, FontWeight.Normal, FontStyle.Normal, FontStretch.Normal);

this.builder.drawText('SCORE', 10, 10, 100, 30, 16, textBrush, font);
this.builder.drawText(String(score), 80, 10, 100, 30, 24, textBrush, font);
```

**Example - Centered text:**
```typescript
const titleBrush = new SolidBrush(Color.fromHex('#FF4444'));
const titleFont = new Font(FontFamily.Bangers, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);

this.builder.drawText(
  'GAME OVER',
  0, 300,
  480, 50,
  32,
  titleBrush,
  titleFont,
  { textAlignment: TextAlignment.Center }
);
```

**Example - Multi-line text with custom line height:**
```typescript
const bodyBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
const bodyFont = new Font(FontFamily.NotoSans, FontWeight.Normal, FontStyle.Normal, FontStretch.Normal);

this.builder.drawText(
  'Line 1\nLine 2\nLine 3',
  20, 100,
  200, 150,
  14,
  bodyBrush,
  bodyFont,
  { lineHeight: 20, textTrimming: TextTrimming.WordEllipsis }
);
```

### Draw Image

Draws an image at the specified rectangle. For simple, full-image drawing without sprite sheet features.

```typescript
drawImage(
  image: TextureAsset,
  x: number,                 // Left edge of destination
  y: number,                 // Top edge of destination
  w: number,                 // Width of destination
  h: number                  // Height of destination
): void
```

**Example:**
```typescript
// Draw entire texture
this.builder.drawImage(backgroundTexture, 0, 0, 480, 800);

// Draw scaled image
this.builder.drawImage(iconTexture, 10, 10, 32, 32);
```

**Note:** For sprite sheets and advanced image features (source rectangles, tiling, stretch modes), use `ImageBrush` with `drawRect()` instead.

## Sprite Sheet Rendering with ImageBrush

For sprite sheets and animations, use `ImageBrush` with `sourceRect` to select frames:

```typescript
// Draw a 32x32 sprite from a sprite sheet
const frameX = frameIndex * 32;
const spriteBrush = new ImageBrush(spriteSheet, {
  sourceRect: {x: frameX, y: 0, w: 32, h: 32}
});
this.builder.drawRect(spriteBrush, null, enemy.x - 16, enemy.y - 16, 32, 32);
```

**Animation frames example:**
```typescript
// Animate through frames in a horizontal sprite strip
const frameWidth = 32;
const frameIndex = Math.floor(this.frameCount / 6) % 4;  // 4 frames, change every 6 ticks
const sourceX = frameIndex * frameWidth;

const animBrush = new ImageBrush(walkAnimation, {
  sourceRect: {x: sourceX, y: 0, w: 32, h: 32}
});
this.builder.drawRect(animBrush, null, player.x - 16, player.y - 16, 32, 32);
```

**Performance Note:** For games with many moving objects (bullets, enemies, particles), sprite-based rendering with `ImageBrush` is **significantly faster** than vector drawing methods like `drawEllipse()` or `drawPath()`. The GPU is optimized for texture sampling, and multiple sprites from the same texture can be batched efficiently.

## Transform Stack

Transforms affect all subsequent drawing commands until popped.

### Push Translate

```typescript
pushTranslate(x: number, y: number): void
```

### Push Rotate

```typescript
pushRotate(angleDeg: number, cx: number, cy: number): void
// angleDeg: rotation angle in degrees (clockwise)
// cx, cy: center of rotation (required)
```

### Push Scale

```typescript
pushScale(sx: number, sy: number, cx: number, cy: number): void
// sx, sy: scale factors
// cx, cy: center of scaling (required)
```

### Push Clip

```typescript
pushClip(data: string): void
// data: SVG path for clipping region
```

### Pop

```typescript
pop(): void
// Removes the last pushed transform or clip
```

**IMPORTANT:** Always match push/pop calls. Every `pushX()` must have a corresponding `pop()`.

**Example - Drawing a rotated ship:**
```typescript
this.builder.pushTranslate(shipX, shipY);
this.builder.pushRotate(shipAngle, 0, 0);  // Rotate around origin (already translated)
this.builder.drawPath(fillBrush, outlinePen, shipPath);
this.builder.pop();  // Pop rotate
this.builder.pop();  // Pop translate
```

**Example - Scaled asteroids:**
```typescript
for (const asteroid of this.asteroids) {
  this.builder.pushTranslate(asteroid.x, asteroid.y);
  this.builder.pushRotate(asteroid.angle, 0, 0);
  this.builder.pushScale(asteroid.radius, asteroid.radius, 0, 0);
  this.builder.drawPath(fillBrush, outlinePen, asteroidShape);
  this.builder.pop();  // scale
  this.builder.pop();  // rotate
  this.builder.pop();  // translate
}
```

## Sending Commands to UI

```typescript
// Apply commands to a ViewModel property
this.builder.applyTo(this.viewModel, 'drawCommands');
```

## Color Creation

```typescript
// From hex string
Color.fromHex('#FF0000')     // Red
Color.fromHex('#00FF00')     // Green
Color.fromHex('#0000FF')     // Blue

// From RGBA values (0-1 range)
new Color(1, 0, 0, 1)        // Red, full opacity
new Color(1, 1, 1, 0.5)      // White, 50% opacity
new Color(0, 0, 0, 0.8)      // Black, 80% opacity
```

## Common Patterns

### Efficient Resource Reuse

Create resources once and reuse them across frames for best performance:

```typescript
// Create resources once (e.g., as class fields)
private bgBrush = new SolidBrush(Color.fromHex('#000000'));
private whiteBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
private outlinePen = new Pen(this.whiteBrush, 1);
private gameFont = new Font(FontFamily.Roboto, FontWeight.Normal, FontStyle.Normal, FontStretch.Normal);

private render(): void {
  this.builder.clear();

  // Use resources for multiple objects
  for (const obj of this.objects) {
    this.builder.drawRect(this.bgBrush, this.outlinePen, obj.x, obj.y, obj.w, obj.h);
  }

  this.builder.applyTo(this.viewModel, 'drawCommands');
}
```

### Sprite-like Objects with Path (Vector)

```typescript
// Define path once (ship pointing up)
const SHIP_PATH = 'M 0 -12 L 8 10 L 0 6 L -8 10 Z';

// Define resources once
private shipFill = new SolidBrush(Color.fromHex('#004400'));
private shipOutlineBrush = new SolidBrush(Color.fromHex('#00FFAA'));
private shipOutline = new Pen(this.shipOutlineBrush, 1.5);

// Draw at position with rotation
this.builder.pushTranslate(ship.x, ship.y);
this.builder.pushRotate(ship.rotation, 0, 0);
this.builder.drawPath(this.shipFill, this.shipOutline, SHIP_PATH);
this.builder.pop();
this.builder.pop();
```

### Sprite Rendering with Texture Atlas

For games with many objects, use `ImageBrush` with sprite sheets:

```typescript
// In Assets.ts - define sprite sheet asset (MUST be static string literal)
import { TextureAsset } from 'meta/worlds';
export const bulletSheetTexture: TextureAsset = new TextureAsset("@sprites/bullet_sheet.png");

// In GameRenderer.ts - use the exported texture
import { bulletSheetTexture } from './Assets';

// Draw multiple sprites efficiently
private drawBullets(): void {
  const frameSize = 16;

  for (const bullet of this.bullets) {
    // Select sprite frame based on bullet type
    const frameX = bullet.type * frameSize;

    const bulletBrush = new ImageBrush(bulletSheetTexture, {
      sourceRect: {x: frameX, y: 0, w: frameSize, h: frameSize}
    });

    this.builder.drawRect(
      bulletBrush,
      null,
      bullet.x - 8, bullet.y - 8,  // Destination (centered)
      16, 16                        // Destination size
    );
  }
}
```

### Animated Character with Sprite Sheet

```typescript
private drawPlayer(): void {
  const frameWidth = 32;
  const frameHeight = 32;
  const framesPerRow = 4;
  const animSpeed = 6;  // Frames per animation frame

  // Calculate current animation frame
  const animFrame = Math.floor(this.frameCount / animSpeed) % framesPerRow;
  const row = this.player.direction;  // 0=down, 1=left, 2=right, 3=up

  const playerBrush = new ImageBrush(this.characterSheet, {
    sourceRect: {
      x: animFrame * frameWidth,
      y: row * frameHeight,
      w: frameWidth,
      h: frameHeight
    }
  });

  this.builder.drawRect(
    playerBrush,
    null,
    this.player.x - 16, this.player.y - 16,
    32, 32
  );
}
```


## Common Pitfalls

### Forgetting to Clear the Builder

Drawing commands accumulate across frames without clear(), causing memory growth and visual artifacts.

```typescript
// WRONG - Missing clear()
private render(): void {
  this.drawBackground();
  this.builder.applyTo(this.viewModel, 'drawCommands');
}

// CORRECT
private render(): void {
  this.builder.clear();
  this.drawBackground();
  this.builder.applyTo(this.viewModel, 'drawCommands');
}
```

### Forgetting to Apply Commands

Nothing renders because commands are never sent to the UI. Always call applyTo() at the end of render.

### Unmatched Push/Pop Operations

Every pushTranslate/pushRotate/pushScale/pushClip must have a corresponding pop(). Missing pops corrupt the transform stack.

### Creating Resources Inside Loops

Create brushes/pens/fonts once as class fields, not inside loops. The builder deduplicates by identity.

### Wrong Coordinate System

Origin is TOP-LEFT, Y increases downward. Negative Y is off-screen.

### Type-Only Import Error

Types like Brush, GradientStop, DrawTextOptions, ImageBrushOptions REQUIRE import type syntax.

```typescript
import { DrawingCommandsBuilder, SolidBrush, Pen } from 'meta/custom_ui_experimental';
import type { Brush, GradientStop } from 'meta/custom_ui_experimental';
```
