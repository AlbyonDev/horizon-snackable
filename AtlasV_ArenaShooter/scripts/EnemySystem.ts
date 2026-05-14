// Arena Vermin — Enemy System (Milestones 2 & 4)
import type { EnemyState, HeroState } from './Types';
import { EnemyAI, BodyVariant, EnemyType } from './Types';
import {
  GRUNT_HP, GRUNT_SPEED, GRUNT_CONTACT_DMG, GRUNT_CONTACT_TICK, GRUNT_AGGRO,
  GUNNER_HP, GUNNER_SPEED, GUNNER_CONTACT_DMG, GUNNER_CONTACT_TICK, GUNNER_AGGRO,
  GUNNER_PREFERRED_DIST_MIN, GUNNER_PREFERRED_DIST_MAX, GUNNER_FIRE_INTERVAL, GUNNER_BURST_COUNT,
  DRONE_HP, DRONE_SPEED, DRONE_CONTACT_DMG, DRONE_CONTACT_TICK, DRONE_AGGRO,
  DRONE_SINE_AMP, DRONE_SINE_FREQ,
  BRUISER_HP, BRUISER_SPEED, BRUISER_CONTACT_DMG, BRUISER_CONTACT_TICK, BRUISER_AGGRO,
  GAS_RAT_HP, GAS_RAT_SPEED, GAS_RAT_CONTACT_DMG, GAS_RAT_CONTACT_TICK, GAS_RAT_AGGRO,
  GAS_RAT_CLOUD_INTERVAL_MIN, GAS_RAT_CLOUD_INTERVAL_MAX,
  GAS_RAT_THROW_DUR,
  BOSS_SPEED, BOSS_CONTACT_DMG, BOSS_CONTACT_TICK, BOSS_AGGRO,
  BOSS_PHASE_INTERVAL, BOSS_CHARGE_SPEED, BOSS_CHARGE_DURATION, BOSS_SUMMON_COUNT,
  WORLD_W, WORLD_H,
  SPAWN_TOTAL_DUR, DEATH_FADE_END,
  INITIAL_WAVE_COUNT_MIN, INITIAL_WAVE_COUNT_MAX,
  MIN_SPAWN_DIST,
  ELITE_SPEED_MULT, ELITE_DAMAGE_MULT,
} from './Constants';
import { clampCoord } from './IsoRenderer';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

/** Get direct distance between two world positions (no wrapping). */
export function wrappedDist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Get direct direction from a to b (no wrapping). */
export function wrappedDir(ax: number, ay: number, bx: number, by: number): { dx: number; dy: number } {
  const dx = bx - ax;
  const dy = by - ay;
  return { dx, dy };
}

/** Create default enemy state fields shared by all types. */
function makeBaseEnemy(x: number, y: number, hp: number, speed: number, contactDmg: number, contactTick: number, type: EnemyType): EnemyState {
  return {
    x, y,
    vx: 0, vy: 0,
    facing: Math.random() > 0.5 ? 1 : -1,
    hp, maxHp: hp,
    aiState: EnemyAI.IDLE,
    speed,
    contactDmg,
    contactTickInterval: contactTick,
    lastContactTime: -10,
    animTime: 0,
    bodyVariant: BodyVariant.IDLE,
    spawnTimer: 0,
    isSpawning: true,
    hurtTimer: 0,
    hurtOffsetX: 0,
    hurtSquashTimer: 0,
    flashTimer: 0,
    deathTimer: 0,
    isDead: false,
    deathOpacity: 1,
    // M4 fields
    enemyType: type,
    preferredDist: 0,
    fireTimer: 0,
    fireBurstCount: 0,
    burstShotDelay: 0,
    sinePhase: Math.random() * Math.PI * 2,
    gasTimer: 0,
    gasSpawnFlag: false,
    throwAnimTimer: -1,
    splashImmune: false,
    isElite: false,
    // Boss fields
    bossPhase: 0,
    bossPhaseTimer: 0,
    bossSummonCount: 0,
  };
}

/** Spawn an enemy of specific type with scaled HP. */
export function spawnEnemyOfType(
  enemies: EnemyState[],
  heroX: number,
  heroY: number,
  scaledHp: number,
  type: EnemyType,
  isElite: boolean = false
): void {
  let x: number;
  let y: number;
  let attempts = 0;
  do {
    x = Math.random() * WORLD_W;
    y = Math.random() * WORLD_H;
    attempts++;
  } while (wrappedDist(x, y, heroX, heroY) < MIN_SPAWN_DIST && attempts < 20);

  let enemy: EnemyState;
  switch (type) {
    case EnemyType.GunnerMouse: {
      enemy = makeBaseEnemy(x, y, scaledHp, GUNNER_SPEED, GUNNER_CONTACT_DMG, GUNNER_CONTACT_TICK, type);
      enemy.preferredDist = (GUNNER_PREFERRED_DIST_MIN + GUNNER_PREFERRED_DIST_MAX) / 2;
      enemy.fireTimer = GUNNER_FIRE_INTERVAL * (0.5 + Math.random() * 0.5);
      break;
    }
    case EnemyType.DroneRat: {
      enemy = makeBaseEnemy(x, y, scaledHp, DRONE_SPEED, DRONE_CONTACT_DMG, DRONE_CONTACT_TICK, type);
      enemy.splashImmune = true;
      break;
    }
    case EnemyType.SewerBruiser: {
      enemy = makeBaseEnemy(x, y, scaledHp, BRUISER_SPEED, BRUISER_CONTACT_DMG, BRUISER_CONTACT_TICK, type);
      break;
    }
    case EnemyType.GasRat: {
      enemy = makeBaseEnemy(x, y, scaledHp, GAS_RAT_SPEED, GAS_RAT_CONTACT_DMG, GAS_RAT_CONTACT_TICK, type);
      enemy.gasTimer = randRange(GAS_RAT_CLOUD_INTERVAL_MIN, GAS_RAT_CLOUD_INTERVAL_MAX) * 0.5;
      break;
    }
    case EnemyType.Boss: {
      enemy = makeBaseEnemy(x, y, scaledHp, BOSS_SPEED, BOSS_CONTACT_DMG, BOSS_CONTACT_TICK, type);
      enemy.bossPhase = 0;
      enemy.bossPhaseTimer = BOSS_PHASE_INTERVAL;
      enemy.bossSummonCount = 0;
      break;
    }
    default: { // GruntRat
      enemy = makeBaseEnemy(x, y, scaledHp, GRUNT_SPEED, GRUNT_CONTACT_DMG, GRUNT_CONTACT_TICK, EnemyType.GruntRat);
      break;
    }
  }

  // Apply elite stat boosts (speed and damage; HP already scaled in SpawnRequest)
  if (isElite) {
    enemy.isElite = true;
    enemy.speed *= ELITE_SPEED_MULT;
    enemy.contactDmg = Math.floor(enemy.contactDmg * ELITE_DAMAGE_MULT);
    console.log(`[EnemySystem] ELITE ${EnemyType[type]} spawned at (${x.toFixed(1)}, ${y.toFixed(1)}) with ${scaledHp} HP`);
  }

  enemies.push(enemy);
}

/** Legacy: Spawn grunt rat with HP (backward compat for M3 code). */
export function spawnEnemyWithHp(
  enemies: EnemyState[],
  heroX: number,
  heroY: number,
  scaledHp: number
): void {
  spawnEnemyOfType(enemies, heroX, heroY, scaledHp, EnemyType.GruntRat);
}

/** Mark remaining alive enemies for despawn. */
export function despawnRemainingEnemies(enemies: EnemyState[]): number {
  let count = 0;
  for (const enemy of enemies) {
    if (!enemy.isDead && !enemy.isSpawning) {
      enemy.isDead = true;
      enemy.deathTimer = 0;
      enemy.deathOpacity = 1;
      enemy.bodyVariant = BodyVariant.DEAD;
      count++;
    }
  }
  return count;
}

/** Spawn initial wave of grunt rats. */
export function spawnInitialWave(enemies: EnemyState[], heroX: number, heroY: number): void {
  const count = randInt(INITIAL_WAVE_COUNT_MIN, INITIAL_WAVE_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    spawnEnemyOfType(enemies, heroX, heroY, GRUNT_HP, EnemyType.GruntRat);
  }
}

/** Update enemy AI state machines with type-specific behavior. */
export function updateEnemyAI(enemies: EnemyState[], hero: HeroState, dt: number): void {
  for (const enemy of enemies) {
    if (enemy.isDead || enemy.isSpawning) continue;

    const dist = wrappedDist(enemy.x, enemy.y, hero.x, hero.y);
    const { dx, dy } = wrappedDir(enemy.x, enemy.y, hero.x, hero.y);
    const aggro = getAggroRange(enemy.enemyType);

    switch (enemy.enemyType) {
      case EnemyType.GunnerMouse:
        updateGunnerAI(enemy, hero, dist, dx, dy, dt, aggro);
        break;
      case EnemyType.DroneRat:
        updateDroneAI(enemy, hero, dist, dx, dy, dt, aggro);
        break;
      case EnemyType.GasRat:
        updateGasRatAI(enemy, hero, dist, dx, dy, dt, aggro);
        break;
      case EnemyType.Boss:
        updateBossAI(enemy, hero, dist, dx, dy, dt);
        break;
      default: // GruntRat, SewerBruiser use standard chase
        updateStandardAI(enemy, hero, dist, dx, dy, dt, aggro);
        break;
    }

    // Apply velocity
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.x = clampCoord(enemy.x, WORLD_W);
    enemy.y = clampCoord(enemy.y, WORLD_H);
  }
}

function getAggroRange(type: EnemyType): number {
  switch (type) {
    case EnemyType.GunnerMouse: return GUNNER_AGGRO;
    case EnemyType.DroneRat: return DRONE_AGGRO;
    case EnemyType.SewerBruiser: return BRUISER_AGGRO;
    case EnemyType.GasRat: return GAS_RAT_AGGRO;
    case EnemyType.Boss: return BOSS_AGGRO;
    default: return GRUNT_AGGRO;
  }
}

/** Standard chase AI (Grunt Rat, Sewer Bruiser). */
function updateStandardAI(enemy: EnemyState, hero: HeroState, dist: number, dx: number, dy: number, dt: number, aggro: number): void {
  switch (enemy.aiState) {
    case EnemyAI.IDLE: {
      enemy.animTime += dt;
      if (dist < aggro) { enemy.aiState = EnemyAI.CHASE; break; }
      if (enemy.animTime > 1.5) {
        enemy.animTime = 0;
        const a = Math.random() * Math.PI * 2;
        enemy.vx = Math.cos(a) * enemy.speed * 0.3;
        enemy.vy = Math.sin(a) * enemy.speed * 0.3;
      }
      break;
    }
    case EnemyAI.CHASE: {
      if (dist > 0.1) {
        enemy.vx = (dx / dist) * enemy.speed;
        enemy.vy = (dy / dist) * enemy.speed;
        enemy.facing = dx > 0 ? 1 : -1;
      }
      if (dist < 1.0) enemy.aiState = EnemyAI.ATTACK;
      if (dist > aggro * 1.5) { enemy.aiState = EnemyAI.IDLE; enemy.vx *= 0.3; enemy.vy *= 0.3; }
      break;
    }
    case EnemyAI.ATTACK: {
      if (dist > 1.5) { enemy.aiState = EnemyAI.CHASE; }
      else if (dist > 0.5) {
        enemy.vx = (dx / dist) * enemy.speed * 0.5;
        enemy.vy = (dy / dist) * enemy.speed * 0.5;
      } else {
        const df = Math.exp(-16 * dt);
        enemy.vx *= df;
        enemy.vy *= df;
      }
      enemy.facing = dx > 0 ? 1 : -1;
      break;
    }
  }
}

/** Gunner Mouse AI: maintain distance, fire bursts. */
function updateGunnerAI(enemy: EnemyState, hero: HeroState, dist: number, dx: number, dy: number, dt: number, aggro: number): void {
  enemy.facing = dx > 0 ? 1 : -1;

  if (enemy.aiState === EnemyAI.IDLE) {
    if (dist < aggro) enemy.aiState = EnemyAI.CHASE;
    else {
      enemy.animTime += dt;
      if (enemy.animTime > 1.5) { enemy.animTime = 0; const a = Math.random() * Math.PI * 2; enemy.vx = Math.cos(a) * enemy.speed * 0.3; enemy.vy = Math.sin(a) * enemy.speed * 0.3; }
    }
  } else {
    // Maintain preferred distance
    if (dist < GUNNER_PREFERRED_DIST_MIN && dist > 0.1) {
      // Back away
      enemy.vx = -(dx / dist) * enemy.speed;
      enemy.vy = -(dy / dist) * enemy.speed;
    } else if (dist > GUNNER_PREFERRED_DIST_MAX) {
      // Approach
      enemy.vx = (dx / dist) * enemy.speed;
      enemy.vy = (dy / dist) * enemy.speed;
    } else {
      // In sweet spot — slow orbit
      const df = Math.exp(-8 * dt);
      enemy.vx *= df;
      enemy.vy *= df;
    }

    // Fire timer
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && enemy.fireBurstCount <= 0) {
      enemy.fireBurstCount = GUNNER_BURST_COUNT;
      enemy.burstShotDelay = 0; // First shot fires immediately
      enemy.fireTimer = GUNNER_FIRE_INTERVAL;
    }

    if (dist > aggro * 1.5) { enemy.aiState = EnemyAI.IDLE; enemy.vx *= 0.3; enemy.vy *= 0.3; }
  }
}

/** Drone Rat AI: sinusoidal lateral chase. */
function updateDroneAI(enemy: EnemyState, hero: HeroState, dist: number, dx: number, dy: number, dt: number, aggro: number): void {
  if (enemy.aiState === EnemyAI.IDLE) {
    if (dist < aggro) enemy.aiState = EnemyAI.CHASE;
    else {
      enemy.animTime += dt;
      if (enemy.animTime > 1.5) { enemy.animTime = 0; const a = Math.random() * Math.PI * 2; enemy.vx = Math.cos(a) * enemy.speed * 0.3; enemy.vy = Math.sin(a) * enemy.speed * 0.3; }
    }
    return;
  }

  enemy.sinePhase += dt * DRONE_SINE_FREQ * Math.PI * 2;
  const lateralOffset = Math.sin(enemy.sinePhase) * DRONE_SINE_AMP;

  if (dist > 0.1) {
    const ndx = dx / dist;
    const ndy = dy / dist;
    // Perpendicular direction
    const perpX = -ndy;
    const perpY = ndx;
    // Chase + lateral
    enemy.vx = ndx * enemy.speed + perpX * lateralOffset * 2;
    enemy.vy = ndy * enemy.speed + perpY * lateralOffset * 2;
    enemy.facing = dx > 0 ? 1 : -1;
  }

  if (dist > aggro * 1.5) { enemy.aiState = EnemyAI.IDLE; enemy.vx *= 0.3; enemy.vy *= 0.3; }
}

/** Gas Rat AI: standard chase + cloud timer. */
function updateGasRatAI(enemy: EnemyState, hero: HeroState, dist: number, dx: number, dy: number, dt: number, aggro: number): void {
  // Standard chase behavior
  updateStandardAI(enemy, hero, dist, dx, dy, dt, aggro);

  // Gas cloud timer — when it hits 0, kick off the throw wind-up. Cloud
  // is actually spawned by the main loop when throwAnimTimer completes.
  if (enemy.throwAnimTimer < 0) {
    enemy.gasTimer -= dt;
    if (enemy.gasTimer <= 0) {
      enemy.throwAnimTimer = 0;
      enemy.gasTimer = randRange(GAS_RAT_CLOUD_INTERVAL_MIN, GAS_RAT_CLOUD_INTERVAL_MAX);
    }
  }
}

/** Boss (Rat King) AI: 3-phase cycle - CHASE -> CHARGE -> SUMMON -> repeat. */
function updateBossAI(enemy: EnemyState, hero: HeroState, dist: number, dx: number, dy: number, dt: number): void {
  enemy.facing = dx > 0 ? 1 : -1;
  enemy.aiState = EnemyAI.CHASE; // always aggressive

  switch (enemy.bossPhase) {
    case 0: { // CHASE: move toward hero at normal speed
      if (dist > 0.1) {
        enemy.vx = (dx / dist) * BOSS_SPEED;
        enemy.vy = (dy / dist) * BOSS_SPEED;
      }
      enemy.bossPhaseTimer -= dt;
      if (enemy.bossPhaseTimer <= 0) {
        enemy.bossPhase = 1;
        enemy.bossPhaseTimer = BOSS_CHARGE_DURATION;
      }
      break;
    }
    case 1: { // CHARGE: rush toward hero at high speed
      if (dist > 0.1) {
        enemy.vx = (dx / dist) * BOSS_CHARGE_SPEED;
        enemy.vy = (dy / dist) * BOSS_CHARGE_SPEED;
      }
      enemy.bossPhaseTimer -= dt;
      if (enemy.bossPhaseTimer <= 0) {
        enemy.bossPhase = 2;
        enemy.bossPhaseTimer = 0.5; // brief pause for summon
      }
      break;
    }
    case 2: { // SUMMON: stop, spawn minions
      const df = Math.exp(-12 * dt);
      enemy.vx *= df;
      enemy.vy *= df;
      enemy.bossPhaseTimer -= dt;
      if (enemy.bossPhaseTimer <= 0) {
        enemy.bossSummonCount = BOSS_SUMMON_COUNT;
        enemy.bossPhase = 0;
        enemy.bossPhaseTimer = BOSS_PHASE_INTERVAL;
      }
      break;
    }
  }
}

/** Update enemy timers (spawn, hurt, death). */
export function updateEnemyTimers(enemies: EnemyState[], dt: number): void {
  for (const enemy of enemies) {
    if (enemy.isSpawning) {
      enemy.spawnTimer += dt;
      if (enemy.spawnTimer >= SPAWN_TOTAL_DUR) enemy.isSpawning = false;
    }
    if (enemy.hurtTimer > 0) {
      enemy.hurtTimer -= dt;
      if (enemy.hurtTimer <= 0) { enemy.hurtTimer = 0; enemy.hurtOffsetX = 0; if (!enemy.isDead) enemy.bodyVariant = BodyVariant.IDLE; }
    }
    if (enemy.hurtSquashTimer > 0) { enemy.hurtSquashTimer -= dt; if (enemy.hurtSquashTimer < 0) enemy.hurtSquashTimer = 0; }
    if (enemy.flashTimer > 0) { enemy.flashTimer -= dt; if (enemy.flashTimer < 0) enemy.flashTimer = 0; }
    // Gas Rat throw wind-up: when timer reaches GAS_RAT_THROW_DUR the canister
    // releases the cloud (gasSpawnFlag) and the timer resets to inactive (-1).
    if (enemy.throwAnimTimer >= 0 && !enemy.isDead) {
      enemy.throwAnimTimer += dt;
      if (enemy.throwAnimTimer >= GAS_RAT_THROW_DUR) {
        enemy.gasSpawnFlag = true;
        enemy.throwAnimTimer = -1;
      }
    }
    if (enemy.isDead) {
      enemy.deathTimer += dt;
      if (enemy.deathTimer >= DEATH_FADE_END) { enemy.deathOpacity = 0; }
      else if (enemy.deathTimer > DEATH_FADE_END * 0.48) {
        const fadeStart = DEATH_FADE_END * 0.48;
        enemy.deathOpacity = 1 - (enemy.deathTimer - fadeStart) / (DEATH_FADE_END - fadeStart);
      }
    }
  }
}

/** Remove enemies that finished death animation. */
export function removeFinishedEnemies(enemies: EnemyState[]): void {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].isDead && enemies[i].deathTimer >= DEATH_FADE_END) {
      enemies.splice(i, 1);
    }
  }
}
