---
name: rendering_patterns
summary: Common rendering patterns for 2D games including sprites, animations, effects, and layering
include: always
agents: [global]
---

# Rendering Patterns

This document covers common visual patterns for 2D games using the DrawingSurface API.

## ⚠️ CRITICAL: Sprite-First Approach

**Generated sprite images should be the DEFAULT for nearly all visual game elements.** Sprites look significantly better than vector graphics. Use the **sprites** skill to generate images for characters, enemies, backgrounds, logos, HUD labels, and game objects.

Reserve vector graphics for particle effects or when the user explicitly requests procedural art. Use `drawText()` or XAML `<TextBlock>` for dynamic numeric values and longer instructional text.

## Choosing Between Vector and Sprite Rendering

| Rendering Type | Best For | Performance |
|----------------|----------|-------------|
| **Sprite** (`ImageBrush` with texture atlas) (PREFERRED) | Characters, enemies, backgrounds, logos, HUD labels, game objects | Excellent - GPU optimized, batches well |
| **Vector** (`drawRect`, `drawEllipse`, `drawPath`) | Particles, procedural content | Moderate - each shape is a draw call |

**Rule of thumb:** Default to sprites for visual quality. Only use vector primitives for particle effects or when the user requests it.

## Sprite Rendering with ImageBrush

For sprite sheet and animation support, use `ImageBrush` with `sourceRect` to select specific frames from a texture atlas.

### Basic Sprite Drawing

```typescript
// In Assets.ts - define texture with static string literal
import { TextureAsset } from 'meta/worlds';
export const characterTexture: TextureAsset = new TextureAsset("@sprites/character.png");

// In GameRenderer.ts - use the exported texture
import { characterTexture } from './Assets';

private drawCharacter(): void {
  const spriteBrush = new ImageBrush(characterTexture);
  this.builder.drawRect(
    spriteBrush, null,
    this.player.x - 16, this.player.y - 16,
    32, 32
  );
}
```

### Simple Image Drawing

For full images without sprite sheet features, use `drawImage()`:

```typescript
// Draw a full texture (no sprite sheet selection)
this.builder.drawImage(backgroundTexture, 0, 0, 480, 800);
```

### Sprite Sheet (Texture Atlas)

A sprite sheet contains multiple sprites in a single texture. Use `sourceRect` in `ImageBrush` to select which sprite to draw:

```typescript
// Sprite sheet layout (example):
// Row 0: Player idle frames (0-3)
// Row 1: Player walk frames (0-7)
// Each frame is 32x32 pixels

private drawPlayerFromSheet(): void {
  const frameWidth = 32;
  const frameHeight = 32;

  // Calculate source rectangle based on animation state
  const frameX = this.player.currentFrame * frameWidth;
  const frameY = this.player.isWalking ? frameHeight : 0;

  const playerBrush = new ImageBrush(spriteSheetTexture, {
    sourceRect: {x: frameX, y: frameY, w: frameWidth, h: frameHeight}
  });

  this.builder.drawRect(
    playerBrush, null,
    this.player.x - 16, this.player.y - 16,  // Centered at player position
    32, 32                                    // Destination size
  );
}
```

### Animated Sprites

```typescript
private animateSprite(): void {
  const frameWidth = 32;
  const framesPerRow = 4;
  const animSpeed = 6;  // Ticks per frame

  // Calculate current frame
  const frameIndex = Math.floor(this.frameCount / animSpeed) % framesPerRow;
  const sourceX = frameIndex * frameWidth;

  const animBrush = new ImageBrush(this.walkAnimation, {
    sourceRect: {x: sourceX, y: 0, w: 32, h: 32}
  });

  this.builder.drawRect(
    animBrush, null,
    this.player.x, this.player.y,
    32, 32
  );
}
```

### Directional Character Animation

```typescript
enum Direction {
  Down = 0,
  Left = 1,
  Right = 2,
  Up = 3,
}

private drawDirectionalCharacter(): void {
  const frameWidth = 32;
  const frameHeight = 32;
  const framesPerDirection = 4;
  const animSpeed = 8;

  // Frame within direction
  const frameIndex = this.player.isMoving
    ? Math.floor(this.frameCount / animSpeed) % framesPerDirection
    : 0;  // Idle = first frame

  // Row = direction
  const row = this.player.direction;

  const charBrush = new ImageBrush(this.characterSheet, {
    sourceRect: {
      x: frameIndex * frameWidth,
      y: row * frameHeight,
      w: frameWidth,
      h: frameHeight
    }
  });

  this.builder.drawRect(
    charBrush, null,
    this.player.x - 16, this.player.y - 16,
    32, 32
  );
}
```

### Efficient Bullet Rendering with Sprites

For bullet-hell games, render many bullets efficiently:

```typescript
private drawBullets(): void {
  // All bullets using same texture = efficient batching
  const bulletSize = 16;

  for (const bullet of this.bullets) {
    // Different bullet types at different positions in sprite sheet
    const sourceX = bullet.type * bulletSize;

    const bulletBrush = new ImageBrush(this.bulletSheet, {
      sourceRect: {x: sourceX, y: 0, w: bulletSize, h: bulletSize}
    });

    this.builder.drawRect(
      bulletBrush, null,
      bullet.x - 8, bullet.y - 8,  // Centered
      bulletSize, bulletSize
    );
  }
}
```

### Rotated Sprites

Use transforms for rotation (pushRotate/pop):

```typescript
private drawRotatedSprite(): void {
  this.builder.pushTranslate(this.ship.x, this.ship.y);
  this.builder.pushRotate(this.ship.angle, 0, 0);

  // Draw centered at origin (transformed to ship position)
  const shipBrush = new ImageBrush(this.shipSprite);
  this.builder.drawRect(
    shipBrush, null,
    -16, -16,  // Offset to center
    32, 32
  );

  this.builder.pop();  // rotate
  this.builder.pop();  // translate
}
```

### Tiled Backgrounds

Use `tileMode` to create repeating patterns:

```typescript
private drawTiledBackground(): void {
  const tiledBrush = new ImageBrush(this.patternTexture, {
    stretch: Stretch.None,
    tileMode: TileMode.Tile
  });

  this.builder.drawRect(tiledBrush, null, 0, 0, 480, 800);
}
```

## Painter's Algorithm (Layer Order)

Draw elements back-to-front (background first, UI last):

```typescript
private render(): void {
  this.builder.clear();

  // Layer 1: Background
  this.drawBackground();
  this.drawStars();

  // Layer 2: Game world
  this.drawTileMap();
  this.drawPickups();

  // Layer 3: Entities
  this.drawEnemies();
  this.drawPlayer();
  this.drawProjectiles();

  // Layer 4: Effects
  this.drawParticles();
  this.drawExplosions();

  // Layer 5: UI/HUD (always on top)
  this.drawHUD();

  // Layer 6: Overlays (pause, game over)
  if (this.gameOver) {
    this.drawGameOverOverlay();
  }

  this.builder.applyTo(this.viewModel, 'drawCommands');
}
```

## Background Rendering

### Solid Background

```typescript
private drawBackground(): void {
  const bg = new SolidBrush(Color.fromHex('#0A0A1A'));
  this.builder.drawRect(bg, null, 0, 0, this.canvasWidth, this.canvasHeight);
}
```

### Starfield Background

```typescript
interface Star {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
}

private stars: Star[] = [];

private initStars(): void {
  this.stars = [];
  for (let i = 0; i < 50; i++) {
    this.stars.push({
      x: this.rng.nextRange(0, this.canvasWidth),
      y: this.rng.nextRange(0, this.canvasHeight),
      size: this.rng.nextRange(0.5, 1.5),
      twinkleOffset: this.rng.nextRange(0, Math.PI * 2),
    });
  }
}

private drawStars(): void {
  for (const star of this.stars) {
    // Twinkle effect using sine wave
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 *
      Math.sin(this.frameCount * 0.03 + star.twinkleOffset));
    const brush = new SolidBrush(new Color(1, 1, 1, twinkle));
    this.builder.drawEllipse(brush, null, star.x, star.y, star.size, star.size);
  }
}
```

## Grid-Based Rendering

### Tetris-Style Grid

```typescript
private readonly kCellSize = 24;
private readonly kBoardOffsetX = 20;
private readonly kBoardOffsetY = 40;

private drawBoard(): void {
  const boardW = kBoardCols * kCellSize;
  const boardH = kBoardRows * kCellSize;

  // Board background
  const boardBg = new SolidBrush(Color.fromHex('#16213E'));
  this.builder.drawRect(boardBg, null, kBoardOffsetX, kBoardOffsetY, boardW, boardH);

  // Grid lines
  const gridBrush = new SolidBrush(Color.fromHex('#1A1A3E'));
  const gridPen = new Pen(gridBrush, 1);

  for (let col = 1; col < kBoardCols; col++) {
    const x = kBoardOffsetX + col * kCellSize;
    this.builder.drawLine(gridPen, x, kBoardOffsetY, x, kBoardOffsetY + boardH);
  }
  for (let row = 1; row < kBoardRows; row++) {
    const y = kBoardOffsetY + row * kCellSize;
    this.builder.drawLine(gridPen, kBoardOffsetX, y, kBoardOffsetX + boardW, y);
  }

  // Filled cells
  for (let row = 0; row < kBoardRows; row++) {
    for (let col = 0; col < kBoardCols; col++) {
      const cell = this.getCell(row, col);
      if (cell !== 0) {
        this.drawCell(row, col, pieceColors[cell - 1]);
      }
    }
  }
}

private drawCell(row: number, col: number, color: Color): void {
  const x = kBoardOffsetX + col * kCellSize;
  const y = kBoardOffsetY + row * kCellSize;
  const inset = 1;

  const brush = new SolidBrush(color);
  this.builder.drawRect(brush, null,
    x + inset, y + inset,
    kCellSize - inset * 2, kCellSize - inset * 2);

  // 3D effect - highlight on top-left
  const highlightBrush = new SolidBrush(
    new Color(color.r, color.g, color.b, 0.4));
  this.builder.drawRect(highlightBrush, null,
    x + inset, y + inset, kCellSize - inset * 2, 2);
  this.builder.drawRect(highlightBrush, null,
    x + inset, y + inset, 2, kCellSize - inset * 2);
}
```

### Tile Map Rendering

```typescript
private readonly kTileSize = 32;

private drawTileMap(): void {
  for (let ty = 0; ty < this.mapHeight; ty++) {
    for (let tx = 0; tx < this.mapWidth; tx++) {
      const tile = this.tileMap[ty][tx];
      const x = tx * kTileSize;
      const y = ty * kTileSize;

      switch (tile) {
        case 0: // Empty/floor
          const floorBrush = new SolidBrush(Color.fromHex('#2A4A2A'));
          this.builder.drawRect(floorBrush, null, x, y, kTileSize, kTileSize);
          break;
        case 1: // Wall
          const wallBrush = new SolidBrush(Color.fromHex('#4A4A4A'));
          this.builder.drawRect(wallBrush, null, x, y, kTileSize, kTileSize);
          break;
        case 2: // Water
          const waterBrush = new SolidBrush(Color.fromHex('#3366AA'));
          this.builder.drawRect(waterBrush, null, x, y, kTileSize, kTileSize);
          break;
      }
    }
  }
}
```

## Sprite-Like Objects with Paths

### Rotatable Ship

```typescript
const SHIP_PATH = 'M 0 -12 L 8 10 L 0 6 L -8 10 Z';

private drawShip(): void {
  const fillBrush = new SolidBrush(new Color(0, 0.1, 0.05, 1));
  const outlineBrush = new SolidBrush(Color.fromHex('#00FFAA'));
  const outlinePen = new Pen(outlineBrush, 1.5);

  this.builder.pushTranslate(this.shipX, this.shipY);
  this.builder.pushRotate(this.shipAngle, 0, 0);
  this.builder.drawPath(fillBrush, outlinePen, SHIP_PATH);

  // Thrust flame when thrusting
  if (this.thrusting) {
    const flicker = 14 + Math.sin(this.frameCount * 0.5) * 4;
    const flamePath = `M -4 8 L 0 ${(8 + flicker).toFixed(1)} L 4 8 Z`;
    const flameBrush = new LinearGradientBrush(
      0, 8, 0, 8 + flicker,
      [
        { offset: 0, color: Color.fromHex('#FFD700') },
        { offset: 1, color: new Color(1, 0.3, 0, 0) }
      ]
    );
    this.builder.drawPath(flameBrush, null, flamePath);
  }

  this.builder.pop();  // rotate
  this.builder.pop();  // translate
}
```

### Scaled Asteroids

```typescript
// Asteroid shape (normalized, will be scaled)
const ASTEROID_SHAPES: string[] = [
  'M 1 0 L 0.75 0.59 L 0.85 -0.5 L 0.7 -0.71 L 1 -0.95 Z',
  // ... more shapes
];

private drawAsteroids(): void {
  const fillBrush = new SolidBrush(new Color(0.1, 0.1, 0.15, 1));
  const outlineBrush = new SolidBrush(new Color(0.7, 0.7, 0.7, 1));
  const outlinePen = new Pen(outlineBrush, 1.5);

  for (const a of this.asteroids) {
    this.builder.pushTranslate(a.x, a.y);
    this.builder.pushRotate(a.angle, 0, 0);
    this.builder.pushScale(a.radius, a.radius, 0, 0);
    this.builder.drawPath(fillBrush, outlinePen, ASTEROID_SHAPES[a.shape]);
    this.builder.pop();  // scale
    this.builder.pop();  // rotate
    this.builder.pop();  // translate
  }
}
```

### Directional Character

```typescript
enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

// Character path facing each direction
const CHARACTER_PATHS: Record<Direction, string> = {
  [Direction.Up]: 'M 0 -8 L 6 8 L -6 8 Z',
  [Direction.Right]: 'M 8 0 L -8 6 L -8 -6 Z',
  [Direction.Down]: 'M 0 8 L -6 -8 L 6 -8 Z',
  [Direction.Left]: 'M -8 0 L 8 -6 L 8 6 Z',
};

private drawPlayer(): void {
  const bodyBrush = new SolidBrush(Color.fromHex('#4CAF50'));
  const outlineBrush = new SolidBrush(Color.fromHex('#2E7D32'));
  const outlinePen = new Pen(outlineBrush, 2);

  this.builder.pushTranslate(this.playerX, this.playerY);
  this.builder.drawPath(bodyBrush, outlinePen, CHARACTER_PATHS[this.playerFacing]);
  this.builder.pop();
}
```

## Particle Effects

### Explosion Particles

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

private particles: Particle[] = [];

private spawnExplosion(x: number, y: number): void {
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = this.rng.nextFloat() * Math.PI * 2;
    const speed = this.rng.nextRange(0.5, 3.0);
    const life = Math.floor(this.rng.nextRange(15, 30));
    this.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
    });
  }
}

private updateParticles(): void {
  for (let i = this.particles.length - 1; i >= 0; i--) {
    const p = this.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;  // Drag
    p.vy *= 0.98;
    p.life--;
    if (p.life <= 0) {
      this.particles.splice(i, 1);
    }
  }
}

private drawParticles(): void {
  for (const p of this.particles) {
    const alpha = p.life / p.maxLife;
    const radius = 1 + (1 - alpha) * 2;
    const brush = new SolidBrush(
      new Color(1, 0.5 * alpha, 0, alpha));
    this.builder.drawEllipse(brush, null, p.x, p.y, radius, radius);
  }
}
```

## Animation Patterns

### Blinking (Invulnerability)

```typescript
private shipInvulnFrames: number = 0;

private drawShip(): void {
  // Blink every 6 frames when invulnerable
  if (this.shipInvulnFrames > 0 &&
      Math.floor(this.shipInvulnFrames / 6) % 2 !== 0) {
    return;  // Skip drawing this frame
  }

  // Normal drawing...
}
```

### Flash Effect (Line Clear)

```typescript
private drawClearAnimation(): void {
  const progress = this.clearAnimFrame / this.clearAnimDuration;
  const flash = Math.sin(progress * Math.PI * 3) > 0;
  const flashColor = flash
    ? new Color(1, 1, 1, 0.87)
    : new Color(1, 1, 1, 0.2);
  const flashBrush = new SolidBrush(flashColor);

  for (const row of this.clearingLines) {
    const x = kBoardOffsetX;
    const y = kBoardOffsetY + row * kCellSize;
    this.builder.drawRect(flashBrush, null, x, y, kBoardCols * kCellSize, kCellSize);
  }
}
```

### Sine Wave Animation

```typescript
// Oscillate between 0 and 1
const oscillate = 0.5 + 0.5 * Math.sin(this.frameCount * 0.05);

// Oscillate between min and max
const pulse = minVal + (maxVal - minVal) * (0.5 + 0.5 * Math.sin(this.frameCount * 0.1));
```

## UI/HUD Elements

> **Note:** For most games, HUD elements and overlays should use **standard XAML UI** layered on top of the DrawingSurface, not rendered via DrawingSurface. See the `standard_ui_vs_drawingsurface` skill for details.
>
> The DrawingSurface-rendered HUD examples below are for:
> - Simple debug displays
> - Games that need pixel-perfect HUD positioning within the game canvas
> - Performance-critical situations where minimizing XAML elements helps

### Text HUD

```typescript
private drawHUD(): void {
  const labelBrush = new SolidBrush(Color.fromHex('#E94560'));
  const valueBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
  const hudFont = new Font(FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);

  // Score - using drawText with width and height
  this.builder.drawText('SCORE', 10, 8, 70, 20, 14, labelBrush, hudFont);
  this.builder.drawText(String(this.score), 80, 8, 100, 24, 18, valueBrush, hudFont);

  // Level
  this.builder.drawText('LEVEL', 200, 8, 60, 20, 14, labelBrush, hudFont);
  this.builder.drawText(String(this.level), 260, 8, 50, 24, 18, valueBrush, hudFont);
}
```

### Health Bar

```typescript
private drawHealthBar(): void {
  const x = 10;
  const y = 30;
  const width = 100;
  const height = 12;
  const healthPercent = this.health / this.maxHealth;

  // Background
  const bgBrush = new SolidBrush(Color.fromHex('#333333'));
  this.builder.drawRect(bgBrush, null, x, y, width, height);

  // Health fill
  const healthColor = healthPercent > 0.3
    ? Color.fromHex('#44FF44')
    : Color.fromHex('#FF4444');
  const healthBrush = new SolidBrush(healthColor);
  this.builder.drawRect(healthBrush, null, x, y, width * healthPercent, height);

  // Border
  const borderBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
  const borderPen = new Pen(borderBrush, 1);
  this.builder.drawRect(null, borderPen, x, y, width, height);
}
```

### Lives Display (Icons)

```typescript
private drawLives(): void {
  const LIFE_ICON = 'M 0 -6 L 4 5 L -4 5 Z';  // Small triangle
  const lifeBrush = new SolidBrush(Color.fromHex('#00FFAA'));

  for (let i = 0; i < this.lives; i++) {
    this.builder.pushTranslate(420 + i * 20, 18);
    this.builder.pushScale(0.5, 0.5, 0, 0);
    this.builder.drawPath(lifeBrush, null, LIFE_ICON);
    this.builder.pop();
    this.builder.pop();
  }
}
```


## Ghost Piece (Preview)

```typescript
private drawGhostPiece(): void {
  const ghostRow = this.getGhostRow();
  if (ghostRow === this.pieceRow) return;

  const blocks = this.getPieceBlocks(this.pieceType, this.pieceRotation);
  const ghostBrush = new SolidBrush(new Color(1, 1, 1, 0.2));
  const pieceColor = this.pieceColors[this.pieceType];
  const outlineBrush = new SolidBrush(
    new Color(pieceColor.r, pieceColor.g, pieceColor.b, 0.5));
  const outlinePen = new Pen(outlineBrush, 1);

  for (const block of blocks) {
    const r = ghostRow + block[0];
    const c = this.pieceCol + block[1];
    if (r >= 0) {
      const x = kBoardOffsetX + c * kCellSize;
      const y = kBoardOffsetY + r * kCellSize;
      this.builder.drawRect(ghostBrush, outlinePen,
        x + 1, y + 1, kCellSize - 2, kCellSize - 2);
    }
  }
}
```
