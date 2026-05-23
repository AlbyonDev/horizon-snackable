/**
 * FishSpriteAssets — TextureAsset declarations for all 31 sprite-based fish species,
 * plus a defId→texture lookup map and per-species pixel size info.
 *
 * Used by FishSpriteRenderer to draw fish on a DrawingSurface overlay.
 */
import { TextureAsset } from 'meta/worlds';

// --- Texture assets (MUST use static string literals) ---
const ClownfishTex          = new TextureAsset("@Sprites/Fish/Clownfish_Sprite.png");
const KoiTex                = new TextureAsset("@Sprites/Fish/Koi_Sprite.png");
const BlueDiscusTex         = new TextureAsset("@Sprites/Fish/BlueDiscus_Sprite.png");
const ButterflyfishTex      = new TextureAsset("@Sprites/Fish/Butterflyfish_Sprite.png");
const AngelfishTex          = new TextureAsset("@Sprites/Fish/Angelfish_Sprite.png");
const RainbowFishTex        = new TextureAsset("@Sprites/Fish/RainbowFish_Sprite.png");
const SilverCarpTex         = new TextureAsset("@Sprites/Fish/SilverCarp_Sprite.png");
const GreenDiscusTex        = new TextureAsset("@Sprites/Fish/GreenDiscus_Sprite.png");
const DolphinTex            = new TextureAsset("@Sprites/Fish/Dolphin_Sprite.png");
const FlameAngelfishTex     = new TextureAsset("@Sprites/Fish/FlameAngelfish_Sprite.png");
const SandFlounderTex       = new TextureAsset("@Sprites/Fish/SandFlounder_Sprite.png");
const SeaTurtleTex          = new TextureAsset("@Sprites/Fish/SeaTurtle_Sprite.png");
const VioletBarracudaTex    = new TextureAsset("@Sprites/Fish/VioletBarracuda_Sprite.png");
const BlueFlounderTex       = new TextureAsset("@Sprites/Fish/BlueFlounder_Sprite.png");
const ReefSharkTex          = new TextureAsset("@Sprites/Fish/ReefShark_Sprite.png");
const PinkDolphinTex        = new TextureAsset("@Sprites/Fish/PinkDolphin_Sprite.png");
const BarracudaTex          = new TextureAsset("@Sprites/Fish/Barracuda_Sprite.png");
const PinkSharkTex          = new TextureAsset("@Sprites/Fish/PinkShark_Sprite.png");
const LanternfishTex        = new TextureAsset("@Sprites/Fish/Lanternfish_Sprite.png");
const AbyssalAnglerfishTex  = new TextureAsset("@Sprites/Fish/AbyssalAnglerfish_Sprite.png");
const MantaRayTex           = new TextureAsset("@Sprites/Fish/MantaRay_Sprite.png");
const EmperorSnapperTex     = new TextureAsset("@Sprites/Fish/EmperorSnapper_Sprite.png");
const NeonTetraTex          = new TextureAsset("@Sprites/Fish/NeonTetra_Sprite.png");
const HammerheadSharkTex    = new TextureAsset("@Sprites/Fish/HammerheadShark_Sprite.png");
const LionfishTex           = new TextureAsset("@Sprites/Fish/Lionfish_Sprite.png");
const ElectricEelTex        = new TextureAsset("@Sprites/Fish/ElectricEel_Sprite.png");
const GoblinSharkTex        = new TextureAsset("@Sprites/Fish/GoblinShark_Sprite.png");
const SunfishTex            = new TextureAsset("@Sprites/Fish/Sunfish_Sprite.png");
const JellyfishTex          = new TextureAsset("@Sprites/Fish/Jellyfish_Sprite.png");
const GoldenSeahorseTex     = new TextureAsset("@Sprites/Fish/GoldenSeahorse_Sprite.png");
const PhantomPufferfishTex  = new TextureAsset("@Sprites/Fish/PhantomPufferfish_Sprite.png");

// --- Per-species sprite info ---
export interface FishSpriteInfo {
  texture: TextureAsset;
  /** Base pixel width at size=1 (at 60px/world-unit scale) */
  basePixelW: number;
  /** Base pixel height at size=1 (at 60px/world-unit scale) */
  basePixelH: number;
}

/**
 * Map of defId → sprite info for all 31 sprite-based fish species.
 */
export const SPRITE_FISH_MAP: Map<number, FishSpriteInfo> = new Map([
  [1,  { texture: ClownfishTex,         basePixelW: 60,  basePixelH: 48 }],   // Clownfish
  [2,  { texture: KoiTex,               basePixelW: 72,  basePixelH: 48 }],   // Koi
  [3,  { texture: BlueDiscusTex,        basePixelW: 60,  basePixelH: 60 }],   // Blue Discus
  [4,  { texture: ButterflyfishTex,     basePixelW: 60,  basePixelH: 60 }],   // Butterflyfish
  [5,  { texture: AngelfishTex,         basePixelW: 60,  basePixelH: 72 }],   // Angelfish
  [6,  { texture: RainbowFishTex,       basePixelW: 54,  basePixelH: 42 }],   // Rainbow Fish
  [7,  { texture: SilverCarpTex,        basePixelW: 72,  basePixelH: 48 }],   // Silver Carp
  [8,  { texture: GreenDiscusTex,       basePixelW: 60,  basePixelH: 60 }],   // Green Discus
  [9,  { texture: DolphinTex,           basePixelW: 63,  basePixelH: 36 }],   // Dolphin
  [10, { texture: FlameAngelfishTex,    basePixelW: 60,  basePixelH: 60 }],   // Flame Angelfish
  [11, { texture: SandFlounderTex,      basePixelW: 72,  basePixelH: 48 }],   // Sand Flounder
  [12, { texture: SeaTurtleTex,         basePixelW: 63,  basePixelH: 54 }],   // Sea Turtle
  [13, { texture: VioletBarracudaTex,   basePixelW: 68,  basePixelH: 27 }],   // Violet Barracuda
  [14, { texture: BlueFlounderTex,      basePixelW: 72,  basePixelH: 54 }],   // Blue Flounder
  [15, { texture: ReefSharkTex,         basePixelW: 72,  basePixelH: 36 }],   // Reef Shark
  [16, { texture: PinkDolphinTex,       basePixelW: 63,  basePixelH: 36 }],   // Pink Dolphin
  [17, { texture: BarracudaTex,         basePixelW: 68,  basePixelH: 27 }],   // Barracuda
  [18, { texture: PinkSharkTex,         basePixelW: 72,  basePixelH: 40 }],   // Pink Shark
  [19, { texture: LanternfishTex,       basePixelW: 54,  basePixelH: 42 }],   // Lanternfish
  [20, { texture: AbyssalAnglerfishTex, basePixelW: 63,  basePixelH: 54 }],   // Abyssal Anglerfish
  [21, { texture: MantaRayTex,          basePixelW: 80,  basePixelH: 40 }],   // Manta Ray
  [22, { texture: EmperorSnapperTex,    basePixelW: 63,  basePixelH: 48 }],   // Emperor Snapper
  [23, { texture: NeonTetraTex,         basePixelW: 42,  basePixelH: 24 }],   // Neon Tetra
  [24, { texture: HammerheadSharkTex,   basePixelW: 80,  basePixelH: 40 }],   // Hammerhead Shark
  [25, { texture: LionfishTex,          basePixelW: 60,  basePixelH: 60 }],   // Lionfish
  [26, { texture: ElectricEelTex,       basePixelW: 84,  basePixelH: 24 }],   // Electric Eel
  [27, { texture: GoblinSharkTex,       basePixelW: 72,  basePixelH: 36 }],   // Goblin Shark
  [28, { texture: SunfishTex,           basePixelW: 60,  basePixelH: 60 }],   // Sunfish
  [29, { texture: JellyfishTex,         basePixelW: 48,  basePixelH: 63 }],   // Jellyfish
  [30, { texture: GoldenSeahorseTex,    basePixelW: 36,  basePixelH: 60 }],   // Golden Seahorse
  [31, { texture: PhantomPufferfishTex, basePixelW: 60,  basePixelH: 60 }],   // Phantom Pufferfish
]);

/** Quick check: is this defId a sprite-based fish? */
export function isSpriteFish(defId: number): boolean {
  return SPRITE_FISH_MAP.has(defId);
}
