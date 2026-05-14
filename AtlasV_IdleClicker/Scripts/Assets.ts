import { TextureAsset } from 'meta/worlds';

// Title screen sprites
export const titleBackgroundTexture: TextureAsset = new TextureAsset("@sprites/title_background.png");
export const titleLogoTexture: TextureAsset = new TextureAsset("@sprites/title_logo.png");

// Currency / world
export const currencyIcon: TextureAsset = new TextureAsset('@sprites/icon_gem_resource.png');
export const cursorIcon: TextureAsset = new TextureAsset('@sprites/pickaxe_cursor.png');

// Shop / Upgrade icons (one shared TextureAsset per literal — the SDK requires
// string-literal constructor args, and reusing instances avoids re-allocation
// on every shop rebuild)
export const iconTabMining: TextureAsset = new TextureAsset('@sprites/icon_tab_mining.png');
export const iconTabUpgrade: TextureAsset = new TextureAsset('@sprites/icon_tab_upgrade.png');
export const iconTabCoins: TextureAsset = new TextureAsset('@sprites/icon_tab_coins.png');
export const iconCritical: TextureAsset = new TextureAsset('@sprites/icon_critical.png');
export const iconFrenzy: TextureAsset = new TextureAsset('@sprites/icon_frenzy.png');
export const iconVault: TextureAsset = new TextureAsset('@sprites/icon_vault.png');
export const iconIncome: TextureAsset = new TextureAsset('@sprites/icon_income.png');

// Specific generator / item icons
export const iconShrine: TextureAsset = new TextureAsset('@sprites/icon_shrine.png');
export const iconMine: TextureAsset = new TextureAsset('@sprites/icon_mine.png');
