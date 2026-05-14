// Arena Vermin — Asset Declarations
import { TextureAsset } from 'meta/worlds';

// === Custom Art Assets (from assets/ folder) ===

// Hero sprites
export const heroBodyTexture: TextureAsset = new TextureAsset("@assets/CharacterMain.png");
export const heroSwordTexture: TextureAsset = new TextureAsset("@assets/sword.png");
export const heroWeapon02Texture: TextureAsset = new TextureAsset("@assets/Weapon02.png");
export const heroWeapon03Texture: TextureAsset = new TextureAsset("@assets/Weapon03.png");

// Enemy sprite (used for all enemy types)
export const vilainTexture: TextureAsset = new TextureAsset("@assets/Vilain.png");

// Enemy weapon sprites
export const droneRatWeaponTexture: TextureAsset = new TextureAsset("@assets/DroneRatWeapon.png");
export const bruiserWeaponTexture: TextureAsset = new TextureAsset("@assets/BruiserWeapon.png");
export const gasRatWeaponTexture: TextureAsset = new TextureAsset("@assets/GasRatWeapon.png");

// Pickup gems
export const gem01Texture: TextureAsset = new TextureAsset("@assets/gem01.png");
export const gem02Texture: TextureAsset = new TextureAsset("@assets/gem02.png");

// Health heart pickup
export const healthHeartTexture: TextureAsset = new TextureAsset("@assets/health_heart.png");

// Projectile
export const missileTexture: TextureAsset = new TextureAsset("@assets/missile.png");

// Impact / effect sprites
export const impactTexture: TextureAsset = new TextureAsset("@assets/Impact.png");
export const splashTexture: TextureAsset = new TextureAsset("@assets/Splash.png");
export const critiqueTexture: TextureAsset = new TextureAsset("@assets/Critique.png");

// HUD sprites
export const coinCountTexture: TextureAsset = new TextureAsset("@assets/CoinCount.png");
export const ennemiCountTexture: TextureAsset = new TextureAsset("@assets/EnnemiCount.png");
export const levelBarTexture: TextureAsset = new TextureAsset("@assets/LevelBar.png");
export const timerBoardTexture: TextureAsset = new TextureAsset("@assets/TimerBoard.png");
export const waveBarContourTexture: TextureAsset = new TextureAsset("@assets/WaveBarContour.png");
export const waveBarInTexture: TextureAsset = new TextureAsset("@assets/WaveBarIn.png");
export const pauseButtonTexture: TextureAsset = new TextureAsset("@assets/PauseButton.png");
export const cartoucheTexture: TextureAsset = new TextureAsset("@assets/cartouche.png");

// Arena map background
export const mapTexture: TextureAsset = new TextureAsset("@assets/map.png");

// Drone weapon sprite (orbiting drone) — uses Weapon01 sprite
export const droneWeaponTexture: TextureAsset = new TextureAsset("@assets/Weapon01.png");

// === Legacy generated sprites (kept for bones/death animation) ===
export const gruntRatBonesTexture: TextureAsset = new TextureAsset("@sprites/grunt_rat_bones.png");

// Boss sprite
export const ratKingBossTexture: TextureAsset = new TextureAsset("@assets/RatKingBoss.png");

// Legacy references (redirected to new assets)
export const gruntRatIdleTexture: TextureAsset = vilainTexture;
export const gunnerMouseIdleTexture: TextureAsset = vilainTexture;
export const gunnerMouseMinigunTexture: TextureAsset = heroWeapon02Texture;
export const droneRatIdleTexture: TextureAsset = vilainTexture;
export const sewerBruiserIdleTexture: TextureAsset = vilainTexture;
export const gasRatIdleTexture: TextureAsset = vilainTexture;
