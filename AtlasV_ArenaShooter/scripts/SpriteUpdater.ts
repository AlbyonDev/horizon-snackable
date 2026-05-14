// Arena Vermin — Sprite Updater (Refactored: ItemsControl collection-based)
// Computes screen-space transforms for hero and enemy XAML sprites
// using the pooled CharacterSpriteViewModel entries.

import { TextureAsset } from 'meta/worlds';
import type { ArenaVerminViewModel } from './ArenaVerminViewModel';
import { CharacterSpriteViewModel } from './CharacterSpriteViewModel';
import {
  heroBodyTexture, heroSwordTexture,
  gruntRatIdleTexture, gruntRatBonesTexture,
  gunnerMouseIdleTexture, gunnerMouseMinigunTexture, droneRatIdleTexture,
  sewerBruiserIdleTexture, gasRatIdleTexture,
  droneRatWeaponTexture, bruiserWeaponTexture, gasRatWeaponTexture,
  ratKingBossTexture,
} from './Assets';
import {
  CANVAS_W, CANVAS_H,
  HERO_BODY_W, HERO_BODY_H, HERO_SWORD_W, HERO_SWORD_H,
  HERO_HAND_OFFSET_X, HERO_HAND_OFFSET_Y,
  IDLE_BOB_PERIOD, IDLE_BOB_AMP_Y,
  WALK_BOB_PERIOD, WALK_BOB_AMP_Y, WALK_BOB_AMP_X,
  WEAPON_SWAY_PERIOD, WEAPON_SWAY_AMP_DEG,
  GRUNT_BODY_W, GRUNT_BODY_H,
  GUNNER_BODY_W, GUNNER_BODY_H,
  GUNNER_WEAPON_W, GUNNER_WEAPON_H, GUNNER_HAND_OFFSET_X, GUNNER_HAND_OFFSET_Y,
  DRONE_WEAPON_W, DRONE_WEAPON_H, DRONE_HAND_OFFSET_X, DRONE_HAND_OFFSET_Y,
  BRUISER_WEAPON_W, BRUISER_WEAPON_H, BRUISER_HAND_OFFSET_X, BRUISER_HAND_OFFSET_Y,
  GAS_RAT_WEAPON_W, GAS_RAT_WEAPON_H, GAS_RAT_HAND_OFFSET_X, GAS_RAT_HAND_OFFSET_Y,
  GAS_RAT_THROW_DUR, GAS_RAT_THROW_LIFT_PX, GAS_RAT_THROW_FORWARD_PX, GAS_RAT_THROW_SCALE_BOOST,
  DRONE_BODY_W, DRONE_BODY_H,
  BRUISER_BODY_W, BRUISER_BODY_H,
  GAS_RAT_BODY_W, GAS_RAT_BODY_H,
  BOSS_BODY_W, BOSS_BODY_H,
  DEATH_FALL_DUR, DEATH_BOUNCE_DUR, DEATH_FADE_START, DEATH_FADE_END, DEATH_WEAPON_FADE_DUR,
  WORLD_W, WORLD_H,
  ELITE_SCALE,
} from './Constants';
import { EnemyType } from './Types';
import type {
  HeroState, CameraState, EnemyState,
  AttackSwingState, CameraShakeState,
} from './Types';
import { worldToScreen, wrapRelative } from './IsoRenderer';
import { getSpawnTransform, getDeathTransform, getHurtTransform } from './AnimationSystem';

// Pool layout: index 0 is the hero, indices 1..n are enemies. The pool grows
// on demand to fit the live enemy count — no hard cap.
const HERO_SLOT = 0;
const INITIAL_POOL_SIZE = 32; // hero + 31 enemy slots; grown as needed

/** Create the initial sprite pool and assign it to the ViewModel. */
export function createSpritePool(vm: ArenaVerminViewModel): CharacterSpriteViewModel[] {
  const pool: CharacterSpriteViewModel[] = [];
  for (let i = 0; i < INITIAL_POOL_SIZE; i++) {
    pool.push(new CharacterSpriteViewModel());
  }
  vm.characterSprites = pool;
  return pool;
}

/** Grow the pool to at least `required` slots; rebinds the collection if it grew. */
function ensurePoolCapacity(
  pool: CharacterSpriteViewModel[],
  vm: ArenaVerminViewModel,
  required: number,
): void {
  if (pool.length >= required) return;
  while (pool.length < required) {
    pool.push(new CharacterSpriteViewModel());
  }
  vm.characterSprites = pool;
}

/** Get body dimensions for enemy type. */
export function getEnemyDims(type: EnemyType): { w: number; h: number } {
  switch (type) {
    case EnemyType.GunnerMouse: return { w: GUNNER_BODY_W, h: GUNNER_BODY_H };
    case EnemyType.DroneRat: return { w: DRONE_BODY_W, h: DRONE_BODY_H };
    case EnemyType.SewerBruiser: return { w: BRUISER_BODY_W, h: BRUISER_BODY_H };
    case EnemyType.GasRat: return { w: GAS_RAT_BODY_W, h: GAS_RAT_BODY_H };
    case EnemyType.Boss: return { w: BOSS_BODY_W, h: BOSS_BODY_H };
    default: return { w: GRUNT_BODY_W, h: GRUNT_BODY_H };
  }
}

/** Get idle texture for enemy type. */
function getEnemyTexture(type: EnemyType): TextureAsset {
  switch (type) {
    case EnemyType.GunnerMouse: return gunnerMouseIdleTexture;
    case EnemyType.DroneRat: return droneRatIdleTexture;
    case EnemyType.SewerBruiser: return sewerBruiserIdleTexture;
    case EnemyType.GasRat: return gasRatIdleTexture;
    case EnemyType.Boss: return ratKingBossTexture;
    default: return gruntRatIdleTexture;
  }
}

/** Update hero body, weapon, and flash sprite properties on the pool entry. */
export function updateHeroSprites(
  pool: CharacterSpriteViewModel[],
  hero: HeroState,
  camera: CameraState,
  attackSwing: AttackSwingState,
  heroHurtFlashTimer: number,
  cameraShake: CameraShakeState,
  heroDying: boolean = false,
  heroDeathTimer: number = 0,
): void {
  const entry = pool[HERO_SLOT];
  const { sx, sy } = worldToScreen(hero.x, hero.y);
  const screenX = sx - camera.offsetX + CANVAS_W / 2;
  const screenY = sy - camera.offsetY + CANVAS_H / 2;
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;

  const t = hero.animTime;
  let bobX = 0;
  let bobY = 0;

  if (hero.isMoving) {
    const walkPhase = t * (2 * Math.PI / WALK_BOB_PERIOD);
    bobY = -WALK_BOB_AMP_Y * Math.abs(Math.sin(walkPhase));
    bobX = WALK_BOB_AMP_X * Math.sin(walkPhase);
  } else {
    const idlePhase = t * (2 * Math.PI / IDLE_BOB_PERIOD);
    bobY = -IDLE_BOB_AMP_Y * Math.sin(idlePhase);
  }

  const swayPhase = t * (2 * Math.PI / WEAPON_SWAY_PERIOD) + Math.PI / 2;
  let weaponRotDeg = WEAPON_SWAY_AMP_DEG * Math.sin(swayPhase);
  let bodyScaleX = 1;
  let bodyScaleY = 1;

  if (attackSwing.active) {
    weaponRotDeg += attackSwing.weaponRotDeg;
    bodyScaleX = attackSwing.bodyScaleX;
    bodyScaleY = attackSwing.bodyScaleY;
  }

  let heroBodyRotation = 0;
  let heroBodyOpacity = 1;
  let heroWeaponOpacity = 1;

  if (heroDying) {
    const dt = heroDeathTimer;
    if (dt < DEATH_FALL_DUR) {
      const u = dt / DEATH_FALL_DUR;
      heroBodyRotation = 90 * u * u * u;
    } else if (dt < DEATH_FADE_START) {
      heroBodyRotation = 90;
      const u = (dt - DEATH_FALL_DUR) / DEATH_BOUNCE_DUR;
      bodyScaleY = 0.6 + 0.2 * Math.min(u, 1);
      bodyScaleX = 1.4 - 0.3 * Math.min(u, 1);
    } else {
      heroBodyRotation = 90;
      bodyScaleY = 0.8; bodyScaleX = 1.1;
      const fadeU = (dt - DEATH_FADE_START) / (DEATH_FADE_END - DEATH_FADE_START);
      heroBodyOpacity = Math.max(0, 1 - fadeU);
    }
    heroWeaponOpacity = Math.max(0, 1 - dt / DEATH_WEAPON_FADE_DUR);
    bobX = 0; bobY = 0;
  }

  const heroBodyLeft = screenX + bobX + shakeX - HERO_BODY_W / 2;
  const heroBodyTop = screenY + bobY + shakeY - HERO_BODY_H;

  // Set pool entry properties
  entry.visible = true;
  entry.posX = heroBodyLeft;
  entry.posY = heroBodyTop;
  entry.priority = 9999; // Hero always on top
  entry.bodyW = HERO_BODY_W;
  entry.bodyH = HERO_BODY_H;
  entry.bodyScaleX = hero.facing * bodyScaleX;
  entry.bodyScaleY = bodyScaleY;
  entry.bodyRotation = heroBodyRotation;
  entry.bodyOpacity = heroBodyOpacity;
  entry.bodyTexture = heroBodyTexture;

  // Weapon offset relative to body position
  const weaponAnchorX = screenX + bobX + HERO_HAND_OFFSET_X * hero.facing + shakeX;
  const weaponAnchorY = screenY + bobY + HERO_HAND_OFFSET_Y + shakeY;
  entry.weaponVisible = true;
  entry.weaponOffsetX = (weaponAnchorX - HERO_SWORD_W / 2) - heroBodyLeft;
  entry.weaponOffsetY = (weaponAnchorY - HERO_SWORD_H / 2) - heroBodyTop;
  entry.weaponW = HERO_SWORD_W;
  entry.weaponH = HERO_SWORD_H;
  entry.weaponScaleX = hero.facing;
  entry.weaponScaleY = 1;
  entry.weaponRotation = weaponRotDeg;
  entry.weaponOpacity = heroWeaponOpacity;
  entry.weaponTexture = heroSwordTexture;

  // Flash
  if (heroHurtFlashTimer > 0) {
    entry.flashVisible = true;
    entry.flashOpacity = 1;
    entry.flashColor = '#FF3319';
    entry.flashTexture = heroBodyTexture;
    entry.flashScaleX = hero.facing * bodyScaleX;
    entry.flashScaleY = bodyScaleY;
  } else {
    entry.flashVisible = false;
    entry.flashOpacity = 0;
  }
}

/** Update enemy pool slot properties on the CharacterSpriteViewModel entries. */
export function updateEnemySprites(
  pool: CharacterSpriteViewModel[],
  vm: ArenaVerminViewModel,
  enemies: EnemyState[],
  camera: CameraState,
  cameraShake: CameraShakeState,
  heroX: number,
  heroY: number,
): void {
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;
  const screenCenterX = CANVAS_W / 2;
  const screenCenterY = CANVAS_H / 2;

  // Ensure the pool has a slot for the hero (slot 0) plus every live enemy.
  ensurePoolCapacity(pool, vm, enemies.length + 1);

  // Sort by screen Y for depth ordering
  const sorted: { enemy: EnemyState; screenY: number }[] = [];
  for (const enemy of enemies) {
    const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
    const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
    const { sy } = worldToScreen(wrappedX, wrappedY);
    sorted.push({ enemy, screenY: sy - camera.offsetY + screenCenterY });
  }
  sorted.sort((a, b) => a.screenY - b.screenY);

  // Slot 0 is hero (filled by updateHeroSprites); enemies occupy slots 1..n.
  for (let i = 0; i < sorted.length; i++) {
    const { enemy, screenY } = sorted[i];
    setEnemyEntry(pool[i + 1], enemy, camera, shakeX, shakeY, screenCenterX, screenCenterY, heroX, heroY, screenY);
  }
  // Hide any extra slots left over from a previous larger frame.
  for (let i = sorted.length + 1; i < pool.length; i++) {
    hideEntry(pool[i]);
  }
}

function setEnemyEntry(
  entry: CharacterSpriteViewModel, enemy: EnemyState,
  camera: CameraState, shakeX: number, shakeY: number,
  screenCenterX: number, screenCenterY: number, heroX: number, heroY: number,
  sortY: number,
): void {
  const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
  const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
  const { sx, sy } = worldToScreen(wrappedX, wrappedY);
  const screenX = sx - camera.offsetX + screenCenterX;
  const screenY = sy - camera.offsetY + screenCenterY;

  // Determine texture based on type and state
  let texture: TextureAsset;
  if (enemy.isDead && enemy.deathTimer >= DEATH_FALL_DUR) {
    texture = gruntRatBonesTexture;
  } else {
    texture = getEnemyTexture(enemy.enemyType);
  }

  const dims = getEnemyDims(enemy.enemyType);
  const drawW = enemy.isElite ? dims.w * ELITE_SCALE : dims.w;
  const drawH = enemy.isElite ? dims.h * ELITE_SCALE : dims.h;
  let offsetY = 0; let opacity = 1; let scaleX = 1; let scaleY = 1;
  let rotation = 0; let hurtOffX = 0;

  if (enemy.isSpawning) {
    const spawnT = getSpawnTransform(enemy);
    offsetY = spawnT.offsetY; opacity = spawnT.opacity;
    scaleX = spawnT.scaleX; scaleY = spawnT.scaleY;
  }
  if (enemy.isDead) {
    const deathT = getDeathTransform(enemy);
    rotation = deathT.rotation; scaleX *= deathT.scaleX; scaleY *= deathT.scaleY;
    opacity = deathT.opacity;
    if (enemy.deathTimer >= DEATH_FALL_DUR) rotation = 0;
  }
  if (enemy.hurtTimer > 0 && !enemy.isDead) {
    const hurtT = getHurtTransform(enemy);
    hurtOffX = hurtT.offsetX; scaleX *= hurtT.scaleX; scaleY *= hurtT.scaleY;
  }

  if (opacity <= 0) { hideEntry(entry); return; }

  const finalScaleX = scaleX * enemy.facing;
  const drawX = screenX + hurtOffX + shakeX - drawW / 2;
  const drawY = screenY + offsetY + shakeY - drawH;

  // Body
  entry.visible = true;
  entry.posX = drawX;
  entry.posY = drawY;
  entry.priority = Math.round(sortY); // Y-sort depth
  entry.bodyW = drawW;
  entry.bodyH = drawH;
  entry.bodyScaleX = finalScaleX;
  entry.bodyScaleY = scaleY;
  entry.bodyRotation = rotation;
  entry.bodyOpacity = opacity;
  entry.bodyTexture = texture;

  // Weapon sprite for special enemy types
  if (!enemy.isDead) {
    let weaponTexture: TextureAsset | null = null;
    let wW = 24; let wH = 12; let handOffX = 0; let handOffY = 0;
    switch (enemy.enemyType) {
      case EnemyType.GunnerMouse:
        weaponTexture = gunnerMouseMinigunTexture;
        wW = GUNNER_WEAPON_W; wH = GUNNER_WEAPON_H;
        handOffX = GUNNER_HAND_OFFSET_X; handOffY = GUNNER_HAND_OFFSET_Y;
        break;
      case EnemyType.DroneRat:
        weaponTexture = droneRatWeaponTexture;
        wW = DRONE_WEAPON_W; wH = DRONE_WEAPON_H;
        handOffX = DRONE_HAND_OFFSET_X; handOffY = DRONE_HAND_OFFSET_Y;
        break;
      case EnemyType.SewerBruiser:
        weaponTexture = bruiserWeaponTexture;
        wW = BRUISER_WEAPON_W; wH = BRUISER_WEAPON_H;
        handOffX = BRUISER_HAND_OFFSET_X; handOffY = BRUISER_HAND_OFFSET_Y;
        break;
      case EnemyType.GasRat:
        weaponTexture = gasRatWeaponTexture;
        wW = GAS_RAT_WEAPON_W; wH = GAS_RAT_WEAPON_H;
        handOffX = GAS_RAT_HAND_OFFSET_X; handOffY = GAS_RAT_HAND_OFFSET_Y;
        break;
    }
    // Gas Rat throw wind-up — canister lifts up + drifts forward + scales up
    // along a parabolic apex curve (peak at u=0.5). No rotation per art rules.
    let throwExtraScale = 1;
    if (enemy.enemyType === EnemyType.GasRat && enemy.throwAnimTimer >= 0) {
      const u = Math.min(1, enemy.throwAnimTimer / GAS_RAT_THROW_DUR);
      const apex = 4 * u * (1 - u); // 0→1→0 parabola, peak at u=0.5
      handOffX += GAS_RAT_THROW_FORWARD_PX * apex;
      handOffY -= GAS_RAT_THROW_LIFT_PX * apex;
      throwExtraScale = 1 + GAS_RAT_THROW_SCALE_BOOST * apex;
    }
    if (weaponTexture) {
      const weaponX = screenX + hurtOffX + shakeX + handOffX * enemy.facing - wW / 2;
      const weaponY = screenY + offsetY + shakeY + handOffY - wH / 2;
      entry.weaponVisible = true;
      entry.weaponOffsetX = weaponX - drawX;
      entry.weaponOffsetY = weaponY - drawY;
      entry.weaponW = wW;
      entry.weaponH = wH;
      entry.weaponScaleX = finalScaleX * throwExtraScale;
      entry.weaponScaleY = scaleY * throwExtraScale;
      entry.weaponRotation = 0;
      entry.weaponOpacity = opacity;
      entry.weaponTexture = weaponTexture;
    } else {
      entry.weaponVisible = false;
    }
  } else {
    entry.weaponVisible = false;
  }

  // Flash overlay
  if (enemy.flashTimer > 0) {
    entry.flashVisible = true;
    entry.flashOpacity = 0.7;
    entry.flashColor = '#FFFFFF';
    entry.flashTexture = getEnemyTexture(enemy.enemyType);
    entry.flashScaleX = finalScaleX;
    entry.flashScaleY = scaleY;
  } else {
    entry.flashVisible = false;
    entry.flashOpacity = 0;
  }
}

function hideEntry(entry: CharacterSpriteViewModel): void {
  entry.visible = false;
  entry.weaponVisible = false;
  entry.flashVisible = false;
}
