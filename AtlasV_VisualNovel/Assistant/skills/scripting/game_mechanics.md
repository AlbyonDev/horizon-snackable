---
name: game_mechanics
summary: Common patterns for 2D game mechanics including scoring, levels, power-ups, state machines, spawning, and camera
include: always
agents: [global]
---

# Common Game Patterns

This document covers reusable patterns for common 2D game mechanics.

## Game State Machine

```typescript
enum GameState {
  MainMenu,
  Playing,
  Paused,
  LevelComplete,
  GameOver,
}

@component()
export class MyGameComponent extends Component {
  private gameState: GameState = GameState.MainMenu;

  private setState(newState: GameState): void {
    const oldState = this.gameState;
    this.gameState = newState;
    this.onStateChanged(oldState, newState);
  }

  private onStateChanged(oldState: GameState, newState: GameState): void {
    switch (newState) {
      case GameState.Playing:
        if (oldState === GameState.MainMenu) {
          this.startNewGame();
        }
        break;
      case GameState.GameOver:
        this.viewModel.isGameOver = true;
        break;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate() {
    switch (this.gameState) {
      case GameState.Playing:
        this.updateGame();
        break;
      case GameState.Paused:
        // Don't update game logic
        break;
    }
    this.render();  // Always render
  }
}
```

## Scoring System

```typescript
private score: number = 0;
private highScore: number = 0;

private addScore(points: number): void {
  this.score += points;
  if (this.score > this.highScore) {
    this.highScore = this.score;
  }
}

// Score multipliers
private combo: number = 0;
private readonly kComboTimeout = 120;  // Frames until combo resets
private comboTimer: number = 0;

private addScoreWithCombo(basePoints: number): void {
  this.combo++;
  this.comboTimer = this.kComboTimeout;
  const multiplier = Math.min(this.combo, 10);  // Cap at 10x
  this.addScore(basePoints * multiplier);
}

private updateCombo(): void {
  if (this.comboTimer > 0) {
    this.comboTimer--;
    if (this.comboTimer === 0) {
      this.combo = 0;
    }
  }
}
```

## Level Progression

### Linear Difficulty

```typescript
private level: number = 1;
private readonly kLinesPerLevel = 10;  // Tetris-style

private onLinesCleared(count: number): void {
  this.lines += count;
  const newLevel = Math.floor(this.lines / this.kLinesPerLevel) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    this.onLevelUp();
  }
}

private onLevelUp(): void {
  // Increase difficulty
  this.dropInterval = Math.max(
    this.kMinDropInterval,
    this.kInitialDropInterval - (this.level - 1) * 4
  );

  // Could also increase enemy count, speed, etc.
  this.enemySpawnRate *= 1.1;
}
```

### Wave-Based Levels

```typescript
private wave: number = 1;
private enemiesRemaining: number = 0;
private readonly kBaseEnemies = 4;
private readonly kEnemiesPerWave = 2;

private startWave(): void {
  this.wave++;
  const enemyCount = this.kBaseEnemies + (this.wave - 1) * this.kEnemiesPerWave;
  this.enemiesRemaining = enemyCount;

  for (let i = 0; i < enemyCount; i++) {
    this.spawnEnemy();
  }
}

private onEnemyKilled(): void {
  this.enemiesRemaining--;
  if (this.enemiesRemaining <= 0) {
    this.startWave();
  }
}
```

## Lives and Respawning

```typescript
private readonly kStartingLives = 3;
private lives: number = this.kStartingLives;
private readonly kRespawnInvuln = 144;  // ~2 seconds invulnerability
private invulnTimer: number = 0;

private onPlayerHit(): void {
  if (this.invulnTimer > 0) {
    return;  // Still invulnerable
  }

  this.lives--;
  if (this.lives <= 0) {
    this.gameOver = true;
  } else {
    this.respawnPlayer();
  }
}

private respawnPlayer(): void {
  this.playerX = this.kCanvasWidth / 2;
  this.playerY = this.kCanvasHeight / 2;
  this.playerVx = 0;
  this.playerVy = 0;
  this.invulnTimer = this.kRespawnInvuln;
}

private updateInvulnerability(): void {
  if (this.invulnTimer > 0) {
    this.invulnTimer--;
  }
}
```

## Cooldown System

```typescript
interface Cooldown {
  current: number;
  max: number;
}

private attackCooldown: Cooldown = { current: 0, max: 20 };
private dashCooldown: Cooldown = { current: 0, max: 60 };

private updateCooldowns(): void {
  if (this.attackCooldown.current > 0) this.attackCooldown.current--;
  if (this.dashCooldown.current > 0) this.dashCooldown.current--;
}

private tryAttack(): boolean {
  if (this.attackCooldown.current > 0) {
    return false;
  }
  this.attackCooldown.current = this.attackCooldown.max;
  this.performAttack();
  return true;
}

private isOnCooldown(cd: Cooldown): boolean {
  return cd.current > 0;
}

private getCooldownPercent(cd: Cooldown): number {
  return cd.current / cd.max;
}
```

## Power-Up System

```typescript
enum PowerUpType {
  SpeedBoost,
  Shield,
  DoubleScore,
  ExtraLife,
}

interface ActivePowerUp {
  type: PowerUpType;
  duration: number;  // Frames remaining
}

private activePowerUps: ActivePowerUp[] = [];

private collectPowerUp(type: PowerUpType): void {
  const durations: Record<PowerUpType, number> = {
    [PowerUpType.SpeedBoost]: 300,   // ~4 seconds
    [PowerUpType.Shield]: 450,        // ~6 seconds
    [PowerUpType.DoubleScore]: 600,   // ~8 seconds
    [PowerUpType.ExtraLife]: 0,       // Instant
  };

  if (type === PowerUpType.ExtraLife) {
    this.lives++;
    return;
  }

  // Check if already active - refresh duration
  const existing = this.activePowerUps.find(p => p.type === type);
  if (existing) {
    existing.duration = durations[type];
  } else {
    this.activePowerUps.push({
      type,
      duration: durations[type],
    });
  }
}

private updatePowerUps(): void {
  for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
    this.activePowerUps[i].duration--;
    if (this.activePowerUps[i].duration <= 0) {
      this.activePowerUps.splice(i, 1);
    }
  }
}

private hasPowerUp(type: PowerUpType): boolean {
  return this.activePowerUps.some(p => p.type === type);
}

// Usage in game logic
private getMoveSpeed(): number {
  let speed = this.kBaseMoveSpeed;
  if (this.hasPowerUp(PowerUpType.SpeedBoost)) {
    speed *= 1.5;
  }
  return speed;
}
```

## Spawning Patterns

### Random Edge Spawn

```typescript
private spawnOnEdge(): { x: number; y: number } {
  const edge = Math.floor(this.rng.nextFloat() * 4);
  let x: number, y: number;

  switch (edge) {
    case 0: // Top
      x = this.rng.nextRange(0, this.kCanvasWidth);
      y = 0;
      break;
    case 1: // Right
      x = this.kCanvasWidth;
      y = this.rng.nextRange(0, this.kCanvasHeight);
      break;
    case 2: // Bottom
      x = this.rng.nextRange(0, this.kCanvasWidth);
      y = this.kCanvasHeight;
      break;
    default: // Left
      x = 0;
      y = this.rng.nextRange(0, this.kCanvasHeight);
      break;
  }

  return { x, y };
}
```

### Safe Spawn (Away from Player)

```typescript
private spawnAwayFromPlayer(minDist: number): { x: number; y: number } {
  let x: number, y: number;
  let attempts = 0;
  const maxAttempts = 20;

  do {
    x = this.rng.nextRange(0, this.kCanvasWidth);
    y = this.rng.nextRange(0, this.kCanvasHeight);
    attempts++;
  } while (
    this.distanceToPlayer(x, y) < minDist &&
    attempts < maxAttempts
  );

  return { x, y };
}

private distanceToPlayer(x: number, y: number): number {
  const dx = x - this.playerX;
  const dy = y - this.playerY;
  return Math.sqrt(dx * dx + dy * dy);
}
```

## Screen Shake Effect

```typescript
private shakeIntensity: number = 0;
private shakeDecay: number = 0.9;

private triggerShake(intensity: number): void {
  this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
}

private updateShake(): void {
  this.shakeIntensity *= this.shakeDecay;
  if (this.shakeIntensity < 0.1) {
    this.shakeIntensity = 0;
  }
}

private getShakeOffset(): { x: number; y: number } {
  if (this.shakeIntensity === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (this.rng.nextFloat() - 0.5) * this.shakeIntensity * 2,
    y: (this.rng.nextFloat() - 0.5) * this.shakeIntensity * 2,
  };
}

// Usage in render
private render(): void {
  this.builder.clear();

  const shake = this.getShakeOffset();
  this.builder.pushTranslate(shake.x, shake.y);

  this.drawGame();

  this.builder.pop();

  // HUD should not shake
  this.drawHUD();

  this.builder.applyTo(this.viewModel, 'drawCommands');
}
```

## Camera/Viewport (Scrolling)

```typescript
private cameraX: number = 0;
private cameraY: number = 0;
private readonly kViewportWidth = 480;
private readonly kViewportHeight = 640;

private updateCamera(): void {
  // Center on player with smoothing
  const targetX = this.playerX - this.kViewportWidth / 2;
  const targetY = this.playerY - this.kViewportHeight / 2;

  const smoothing = 0.1;
  this.cameraX += (targetX - this.cameraX) * smoothing;
  this.cameraY += (targetY - this.cameraY) * smoothing;

  // Clamp to world bounds
  this.cameraX = Math.max(0, Math.min(this.worldWidth - this.kViewportWidth, this.cameraX));
  this.cameraY = Math.max(0, Math.min(this.worldHeight - this.kViewportHeight, this.cameraY));
}

private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  return {
    x: worldX - this.cameraX,
    y: worldY - this.cameraY,
  };
}

private isOnScreen(worldX: number, worldY: number, margin: number = 50): boolean {
  const screen = this.worldToScreen(worldX, worldY);
  return screen.x > -margin &&
         screen.x < this.kViewportWidth + margin &&
         screen.y > -margin &&
         screen.y < this.kViewportHeight + margin;
}
```

## Object Pooling

For games with many short-lived objects:

```typescript
interface PooledBullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

private bulletPool: PooledBullet[] = [];
private readonly kPoolSize = 50;

private initPool(): void {
  for (let i = 0; i < this.kPoolSize; i++) {
    this.bulletPool.push({
      active: false,
      x: 0, y: 0, vx: 0, vy: 0, life: 0,
    });
  }
}

private spawnBullet(x: number, y: number, vx: number, vy: number): PooledBullet | null {
  // Find inactive bullet
  for (const bullet of this.bulletPool) {
    if (!bullet.active) {
      bullet.active = true;
      bullet.x = x;
      bullet.y = y;
      bullet.vx = vx;
      bullet.vy = vy;
      bullet.life = 60;
      return bullet;
    }
  }
  return null;  // Pool exhausted
}

private updateBullets(): void {
  for (const b of this.bulletPool) {
    if (!b.active) continue;

    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (b.life <= 0 || this.isOffScreen(b.x, b.y)) {
      b.active = false;
    }
  }
}

private drawBullets(): void {
  const brush = new SolidBrush(Color.fromHex('#FFFFFF'));
  for (const b of this.bulletPool) {
    if (!b.active) continue;
    this.builder.drawEllipse(brush, null, b.x, b.y, 3, 3);
  }
}
```

## Restart/Reset Pattern

```typescript
@subscribe(onRestart)
onRestartPressed() {
  // Reset all game state
  this.score = 0;
  this.level = 1;
  this.lives = this.kStartingLives;
  this.gameOver = false;
  this.frameCount = 0;

  // Clear dynamic objects
  this.bullets = [];
  this.enemies = [];
  this.particles = [];
  this.activePowerUps = [];

  // Reset player
  this.playerX = this.kCanvasWidth / 2;
  this.playerY = this.kCanvasHeight / 2;
  this.playerVx = 0;
  this.playerVy = 0;
  this.invulnTimer = this.kRespawnInvuln;

  // Reset timers
  this.attackCooldown.current = 0;

  // New random seed for variety
  this.rng = new Rng(Date.now());

  // Update ViewModel
  this.viewModel.isGameOver = false;

  // Start game
  this.spawnInitialEnemies();
}
```
