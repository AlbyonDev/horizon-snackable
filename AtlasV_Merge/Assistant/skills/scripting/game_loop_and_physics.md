---
name: game_loop_and_physics
summary: Game loop patterns, physics simulation, collision detection, and timing for 2D games
include: always
agents: [global]
---

# Game Loop and Physics

This document covers common patterns for game logic, physics, and collision detection in 2D games using the DrawingSurface API.

## Basic Game Loop

```typescript
@component()
export class MyGameComponent extends Component {
  private gameOver: boolean = false;
  private frameCount: number = 0;

  @subscribe(OnWorldUpdateEvent)
  onUpdate() {
    this.frameCount++;

    if (!this.gameOver) {
      this.processInput();
      this.updateGameLogic();
      this.checkCollisions();
    }

    this.render();
  }
}
```

## Frame-Rate Independent Physics (REQUIRED)

**CRITICAL: All physics and game mechanics MUST be frame-rate independent.** Different devices run at different frame rates, and game behavior must be consistent regardless of device power. Always use delta time for movement, physics, and timers.

### Delta Time Pattern

```typescript
@component()
export class MyGameComponent extends Component {
  private lastTime: number = 0;

  @subscribe(OnWorldUpdateEvent)
  onUpdate() {
    const now = Date.now();
    const deltaTime = this.lastTime === 0 ? 1/72 : (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Cap delta time to prevent physics explosion after pauses
    const dt = Math.min(deltaTime, 1/30);

    this.updatePhysics(dt);
    this.updateTimers(dt);
    this.render();
  }
}
```

### Frame-Rate Independent Movement

```typescript
// WRONG - movement speed varies with frame rate
private updatePosition(obj: MovingObject): void {
  obj.x += obj.vx;  // Faster on high-FPS devices!
  obj.y += obj.vy;
}

// CORRECT - consistent speed regardless of frame rate
private updatePosition(obj: MovingObject, dt: number): void {
  obj.x += obj.vx * dt;  // vx is now in units per second
  obj.y += obj.vy * dt;
}
```

### Frame-Rate Independent Timers

```typescript
// WRONG - frame counting varies with FPS
private respawnTimer: number = 144;  // "2 seconds" only at 72 FPS
private updateTimers(): void {
  if (this.respawnTimer > 0) {
    this.respawnTimer--;  // Counts down faster on high-FPS devices!
  }
}

// CORRECT - time-based timers
private respawnTimer: number = 2.0;  // 2 seconds, device-independent
private updateTimers(dt: number): void {
  if (this.respawnTimer > 0) {
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnPlayer();
    }
  }
}
```

### Frame-Rate Independent Physics Constants

Define all physics values in real-world units (per second):

```typescript
// Velocities in pixels per second
const kPlayerSpeed = 300;        // 300 pixels/second
const kBulletSpeed = 600;        // 600 pixels/second
const kGravity = 980;            // 980 pixels/second² (like real gravity)

// Timers in seconds
const kRespawnDelay = 2.0;       // 2 seconds
const kInvulnerabilityTime = 1.5; // 1.5 seconds
const kDropInterval = 0.8;       // 0.8 seconds

// Decay rates as half-life or per-second factor
const kFrictionDecay = 0.1;      // Lose 90% velocity per second
```

### Frame-Rate Independent Friction/Damping

```typescript
// WRONG - friction effect varies with frame rate
private updateWithFriction(obj: MovingObject): void {
  obj.vx *= 0.98;  // Different behavior at different FPS!
  obj.vy *= 0.98;
}

// CORRECT - consistent damping using exponential decay
private readonly kDamping = 5.0;  // Damping factor per second

private updateWithFriction(obj: MovingObject, dt: number): void {
  const dampingFactor = Math.exp(-this.kDamping * dt);
  obj.vx *= dampingFactor;
  obj.vy *= dampingFactor;
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}
```

### Frame-Rate Independent Lerp

```typescript
// WRONG - lerp speed varies with frame rate
private updateVisualPosition(): void {
  this.visualX += (this.targetX - this.visualX) * 0.1;  // Faster at high FPS!
}

// CORRECT - consistent lerp using exponential smoothing
private readonly kLerpSpeed = 10.0;  // Smoothing factor per second

private updateVisualPosition(dt: number): void {
  const t = 1 - Math.exp(-this.kLerpSpeed * dt);
  this.visualX += (this.targetX - this.visualX) * t;
  this.visualY += (this.targetY - this.visualY) * t;
}
```

## Velocity-Based Movement

All velocities should be defined in **pixels per second** and multiplied by delta time:

```typescript
interface MovingObject {
  x: number;
  y: number;
  vx: number;  // pixels per second
  vy: number;  // pixels per second
}

private updatePosition(obj: MovingObject, dt: number): void {
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// With friction (frame-rate independent using exponential decay)
private readonly kDamping = 3.0;  // Damping factor per second

private updateWithFriction(obj: MovingObject, dt: number): void {
  const dampingFactor = Math.exp(-this.kDamping * dt);
  obj.vx *= dampingFactor;
  obj.vy *= dampingFactor;
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// With speed limit (pixels per second)
private readonly kMaxSpeed = 400.0;

private clampSpeed(obj: MovingObject): void {
  const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
  if (speed > this.kMaxSpeed) {
    const scale = this.kMaxSpeed / speed;
    obj.vx *= scale;
    obj.vy *= scale;
  }
}
```

## Screen Wrapping

For games like Asteroids where objects wrap around the screen:

```typescript
private readonly kCanvasWidth = 480;
private readonly kCanvasHeight = 640;
private readonly kWrapMargin = 45;  // Objects wrap when this far off-screen

private wrapX(x: number): number {
  if (x < -this.kWrapMargin) {
    return x + this.kCanvasWidth + 2 * this.kWrapMargin;
  }
  if (x > this.kCanvasWidth + this.kWrapMargin) {
    return x - this.kCanvasWidth - 2 * this.kWrapMargin;
  }
  return x;
}

private wrapY(y: number): number {
  if (y < -this.kWrapMargin) {
    return y + this.kCanvasHeight + 2 * this.kWrapMargin;
  }
  if (y > this.kCanvasHeight + this.kWrapMargin) {
    return y - this.kCanvasHeight - 2 * this.kWrapMargin;
  }
  return y;
}

// Usage
private updatePosition(): void {
  this.ship.x += this.ship.vx;
  this.ship.y += this.ship.vy;
  this.ship.x = this.wrapX(this.ship.x);
  this.ship.y = this.wrapY(this.ship.y);
}
```

## Boundary Clamping

For games where objects stay within bounds:

```typescript
private clampToBounds(obj: MovingObject, radius: number = 0): void {
  obj.x = Math.max(radius, Math.min(this.kCanvasWidth - radius, obj.x));
  obj.y = Math.max(radius, Math.min(this.kCanvasHeight - radius, obj.y));
}
```

## Collision Detection

### Circle-Circle Collision

Most efficient for fast-moving objects:

```typescript
private circleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distSq < radiusSum * radiusSum;
}

// Usage
for (const bullet of this.bullets) {
  for (const enemy of this.enemies) {
    if (this.circleCollision(
      bullet.x, bullet.y, bullet.radius,
      enemy.x, enemy.y, enemy.radius
    )) {
      this.onBulletHitEnemy(bullet, enemy);
    }
  }
}
```

### Rectangle-Rectangle Collision (AABB)

For grid-based or rectangular objects:

```typescript
private rectCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}
```

### Point-in-Rectangle

```typescript
private pointInRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}
```

## Grid-Based Logic (Tetris-style)

```typescript
private readonly kBoardCols = 10;
private readonly kBoardRows = 20;
private board: number[] = new Array(kBoardRows * kBoardCols).fill(0);

private getCell(row: number, col: number): number {
  if (row < 0 || row >= kBoardRows || col < 0 || col >= kBoardCols) {
    return -1;  // Out of bounds
  }
  return this.board[row * kBoardCols + col];
}

private setCell(row: number, col: number, value: number): void {
  if (row >= 0 && row < kBoardRows && col >= 0 && col < kBoardCols) {
    this.board[row * kBoardCols + col] = value;
  }
}

private isValidPosition(pieceBlocks: number[][], row: number, col: number): boolean {
  for (const block of pieceBlocks) {
    const r = row + block[0];
    const c = col + block[1];
    if (c < 0 || c >= kBoardCols || r >= kBoardRows) {
      return false;
    }
    if (r >= 0 && this.getCell(r, c) !== 0) {
      return false;
    }
  }
  return true;
}
```

## Tile Map Collision

```typescript
private readonly kTileSize = 32;
private tileMap: number[][] = [];  // 0 = empty, 1 = wall, 2 = water, etc.

private isTileSolid(tileX: number, tileY: number): boolean {
  if (tileY < 0 || tileY >= this.tileMap.length ||
      tileX < 0 || tileX >= this.tileMap[0].length) {
    return true;  // Out of bounds = solid
  }
  const tile = this.tileMap[tileY][tileX];
  return tile === 1;  // Wall is solid
}

private canMoveTo(worldX: number, worldY: number, width: number, height: number): boolean {
  // Check all four corners of the bounding box
  const left = Math.floor(worldX / this.kTileSize);
  const right = Math.floor((worldX + width - 1) / this.kTileSize);
  const top = Math.floor(worldY / this.kTileSize);
  const bottom = Math.floor((worldY + height - 1) / this.kTileSize);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (this.isTileSolid(tx, ty)) {
        return false;
      }
    }
  }
  return true;
}
```

## Object Lifecycle

### Managing Dynamic Objects

```typescript
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;  // Remaining lifetime in frames
}

private bullets: Bullet[] = [];
private readonly kMaxBullets = 20;

private spawnBullet(x: number, y: number, angle: number): void {
  if (this.bullets.length >= this.kMaxBullets) {
    return;  // Limit reached
  }

  const speed = 8;
  this.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 60,  // ~0.8 seconds
  });
}

private updateBullets(): void {
  // Update from end to start so splice doesn't affect iteration
  for (let i = this.bullets.length - 1; i >= 0; i--) {
    const b = this.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    // Remove expired or off-screen bullets
    if (b.life <= 0 || this.isOffScreen(b.x, b.y)) {
      this.bullets.splice(i, 1);
    }
  }
}
```

## Visual Interpolation (Smooth Movement)

For grid-based games with smooth piece movement:

```typescript
private pieceRow: number = 0;      // Logical position
private pieceCol: number = 0;
private visualRow: number = 0;     // Rendered position (interpolated)
private visualCol: number = 0;
private readonly kLerpSpeed = 0.35;

private updateVisualPosition(): void {
  // Lerp toward logical position
  this.visualRow += (this.pieceRow - this.visualRow) * this.kLerpSpeed;
  this.visualCol += (this.pieceCol - this.visualCol) * this.kLerpSpeed;

  // Snap when very close
  if (Math.abs(this.pieceRow - this.visualRow) < 0.01) {
    this.visualRow = this.pieceRow;
  }
  if (Math.abs(this.pieceCol - this.visualCol) < 0.01) {
    this.visualCol = this.pieceCol;
  }
}

// When piece locks or hard drops, snap immediately
private lockPiece(): void {
  this.visualRow = this.pieceRow;
  this.visualCol = this.pieceCol;
  // ... locking logic
}
```

## Random Number Generation

For deterministic randomness (useful for replays, networking):

```typescript
class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 1;  // Ensure non-zero
  }

  nextInt(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return x >>> 0;
  }

  nextFloat(): number {
    return (this.nextInt() % 10000) / 10000;
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  nextInt0To(n: number): number {
    return this.nextInt() % n;
  }
}

// Usage
private rng: Rng = new Rng(Date.now());

// Re-seed on restart for variety
private restart(): void {
  this.rng = new Rng(Date.now());
  // ...
}
```

## Common Pitfalls

### Frame-Rate Dependent Physics

**This is the most critical pitfall.** Physics that depends on frame rate causes games to play differently on different devices:

```typescript
// WRONG - all of these are frame-rate dependent
obj.x += obj.vx;           // Movement varies with FPS
obj.vx *= 0.98;            // Friction varies with FPS
this.timer--;              // Timer speed varies with FPS
this.visualX += (this.targetX - this.visualX) * 0.1;  // Lerp varies with FPS

// CORRECT - always use delta time
obj.x += obj.vx * dt;
obj.vx *= Math.exp(-damping * dt);
this.timer -= dt;
this.visualX += (this.targetX - this.visualX) * (1 - Math.exp(-lerpSpeed * dt));
```

### Not Handling Game Over State

Game logic continues running after game over if you don't check state.

```typescript
// WRONG
@subscribe(OnWorldUpdateEvent)
onUpdate() {
  this.updateGameLogic();  // Keeps running when game over
  this.render();
}

// CORRECT
@subscribe(OnWorldUpdateEvent)
onUpdate() {
  if (!this.gameOver) {
    this.updateGameLogic();
  }
  this.render();  // Always render (to show game over screen)
}
```

### Visual Lerp Without Snapping

Lerp values never settle exactly. Always snap when close enough:

```typescript
this.visualX += (this.targetX - this.visualX) * 0.1;
if (Math.abs(this.targetX - this.visualX) < 0.01) {
  this.visualX = this.targetX;
}
```

### Division by Zero

NaN values corrupt game state. Always guard:

```typescript
const percent = max > 0 ? current / max : 0;
```
