// Arena Vermin — Character Sprite ViewModel (ItemsControl item)
// Each instance represents one character sprite (enemy or hero) in the XAML ItemsControl.
import { uiViewModel, UiViewModel } from 'meta/custom_ui';
import { TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

@uiViewModel()
export class CharacterSpriteViewModel extends UiViewModel {
  // === Positioning (set via ItemContainerStyle on ContentPresenter) ===
  posX: number = 0;
  posY: number = 0;
  priority: number = 0; // Panel.ZIndex for depth sorting

  // === Master visibility ===
  visible: boolean = false;

  // === Body sprite ===
  bodyW: number = 32;
  bodyH: number = 32;
  bodyScaleX: number = 1;
  bodyScaleY: number = 1;
  bodyRotation: number = 0;
  bodyOpacity: number = 1;
  bodyTexture: Maybe<TextureAsset> = null;

  // === Weapon sprite ===
  weaponVisible: boolean = false;
  weaponOffsetX: number = 0; // offset from posX
  weaponOffsetY: number = 0; // offset from posY
  weaponW: number = 24;
  weaponH: number = 12;
  weaponScaleX: number = 1;
  weaponScaleY: number = 1;
  weaponRotation: number = 0;
  weaponOpacity: number = 1;
  weaponTexture: Maybe<TextureAsset> = null;

  // === Flash overlay ===
  flashVisible: boolean = false;
  flashOpacity: number = 0;
  flashColor: string = '#FFFFFF'; // White for enemies, #FF3319 for hero
  flashTexture: Maybe<TextureAsset> = null;
  flashScaleX: number = 1;
  flashScaleY: number = 1;
}
