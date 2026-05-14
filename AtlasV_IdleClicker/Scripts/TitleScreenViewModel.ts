import { uiViewModel, UiViewModel, UiEvent, TextureAsset } from 'meta/worlds';

// UiEvent constants at module level for performance
export const onTitlePlayClicked = new UiEvent('TitleScreenViewModel-onPlayClicked');

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  // Background image bound to the XAML Image element
  public backgroundImage: TextureAsset = new TextureAsset("@sprites/title_background.png");

  // Title logo image
  public titleImage: TextureAsset = new TextureAsset("@sprites/title_logo.png");

  // Logo animation properties
  public logoTranslateY: number = 0;
  public logoScaleX: number = 1;
  public logoScaleY: number = 1;

  // Fade overlay controls
  public fadeVisible: boolean = false;
  public fadeOpacity: number = 0;

  override readonly events = {
    onPlayClicked: onTitlePlayClicked,
  };
}
