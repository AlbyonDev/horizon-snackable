/**
 * Assets.ts — Single source of truth for ALL TemplateAsset references.
 *
 * Workflow:
 *   1. Create the .hstf template in Horizon Studio.
 *   2. Add an entry here — this is the ONLY file to edit when a path changes.
 *   3. Reference the export from Defs files or services — never use new TemplateAsset() elsewhere.
 */
import { MaterialAsset, TemplateAsset, TextureAsset } from 'meta/worlds';

export namespace Assets {

  // ── Towers ────────────────────────────────────────────────────────────────
  export const Arrow  = new TemplateAsset('@Templates/Towers/ArrowTower.hstf');
  export const Cannon = new TemplateAsset('@Templates/Towers/CanonTower.hstf');
  export const Frost  = new TemplateAsset('@Templates/Towers/FrostTower.hstf');
  export const Laser  = new TemplateAsset('@Templates/Towers/LaserTower.hstf');
  export const FireCannon = new TemplateAsset('@Templates/Towers/FireCanonTower.hstf');
  export const Lightning = new TemplateAsset('@Templates/Towers/LightningTower.hstf');
  export const Poison = new TemplateAsset('@Templates/Towers/PoisonTower.hstf');
  export const Pillar = new TemplateAsset('@Templates/Towers/MenhirTower.hstf');

  // ── Enemies ───────────────────────────────────────────────────────────────
  export const EnemyBasic = new TemplateAsset('@Templates/Enemies/Enemy.hstf');
  export const EnemyFast  = new TemplateAsset('@Templates/Enemies/EnemyFast.hstf');
  export const EnemyTank  = new TemplateAsset('@Templates/Enemies/EnemyTank.hstf');
  export const EnemyCharger  = new TemplateAsset('@Templates/Enemies/EnemyCharger.hstf');
  export const EnemyShaman = new TemplateAsset('@Templates/Enemies/EnemyShaman.hstf');
  export const EnemyYetiBerserker = new TemplateAsset('@Templates/Enemies/EnemyYetiBerserker.hstf');
  export const EnemyFrostGoblin = new TemplateAsset('@Templates/Enemies/EnemyFrostGoblin.hstf');
  export const EnemyFireGoblin = new TemplateAsset('@Templates/Enemies/EnemyFireGoblin.hstf');
  export const EnemyFireGolem = new TemplateAsset('@Templates/Enemies/EnemyFireGolem.hstf');
  export const EnemyGiantGoblin = new TemplateAsset('@Templates/Enemies/EnemyGiantGoblin.hstf');
  export const EnemyFireball = new TemplateAsset('@Templates/Enemies/EnemyFireball.hstf');

  // ── Effects ──────────────────────────────────────────────────────────────
  export const ShieldSphere = new TemplateAsset('@Templates/ShieldSphere.hstf');

  // ── Shared ────────────────────────────────────────────────────────────────
  export const Particles       = new TemplateAsset('@Templates/Cube.hstf');
  export const Projectile      = new TemplateAsset('@Templates/Projectile.hstf');
  export const RangeIndicator  = new TemplateAsset('@Templates/RangeIndicator.hstf');
  export const HealthBar       = new TemplateAsset('@Templates/HealthBar.hstf');
  export const PathCell        = new TemplateAsset('@Templates/PathCell.hstf');
  export const PathTileCornerTL = new TemplateAsset('@Templates/GameplayObjects/PathTileCornerTL.hstf');
  export const PathTileCornerTR = new TemplateAsset('@Templates/GameplayObjects/PathTileCornerTR.hstf');
  export const PathTileCornerBR = new TemplateAsset('@Templates/GameplayObjects/PathTileCornerBR.hstf');
  export const PathTileCornerBL = new TemplateAsset('@Templates/GameplayObjects/PathTileCornerBL.hstf');
  export const PathTileStraight = new TemplateAsset('@Templates/GameplayObjects/PathTileStraightTop.hstf');
  export const MagmaTileStraight = new TemplateAsset('@Templates/GameplayObjects/MagmaTileStraight.hstf');
  export const FloatingText    = new TemplateAsset('@Templates/UI/FloatingText.hstf');
  export const Coin            = new TemplateAsset('@Templates/Coin.hstf');
  export const BiomeArrowBuff  = new TemplateAsset('@Templates/BiomeArrowBuff.hstf');
  export const BiomeArrowDebuff = new TemplateAsset('@Templates/BiomeArrowDebuff.hstf');
}

export namespace Materials {
  export const MagmaTile = new MaterialAsset('@Materials/MagmaTile.material');
  export const BossCaveEntrance = new MaterialAsset('@Models/Cave/BossCaveEntrance.material');
  export const CaveEntrance = new MaterialAsset('@Models/Cave/CaveEntrance (2).material');
}

export namespace TowerIcons {
  export const BallistaTower = new TextureAsset("@Textures/balista_tower.png");
  export const CanonTower = new TextureAsset("@Textures/canon_tower.png");
  export const FrostTower = new TextureAsset("@Textures/frost_tower.png");
  export const LaserTower = new TextureAsset("@Textures/laser_tower.png");
  export const FireCanonTower = new TextureAsset("@Textures/fire_tower.png");
  export const LightningTower = new TextureAsset("@Textures/lightning_tower.png");
  export const PoisonTower = new TextureAsset("@Textures/poison_tower.png");
  export const PillarTower = new TextureAsset("@Textures/pillar_tower.png");
}
