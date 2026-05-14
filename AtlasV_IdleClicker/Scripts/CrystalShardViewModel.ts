/**
 * CrystalShardViewModel
 *
 * Sub-ViewModel for a single crystal shard particle rendered via XAML ItemsControl.
 * Each shard has position, rotation, scale, opacity, and an icon texture.
 */
import { uiViewModel, UiViewModel, TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

@uiViewModel()
export class CrystalShardViewModel extends UiViewModel {
  public positionX: number = 0;
  public positionY: number = 0;
  public rotation: number = 0;
  public scale: number = 1;
  public opacity: number = 1;
  public icon: Maybe<TextureAsset> = null;
}
