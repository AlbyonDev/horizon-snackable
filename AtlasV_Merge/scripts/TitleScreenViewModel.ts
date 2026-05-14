import {UiViewModel, uiViewModel, UiEvent} from 'meta/custom_ui';
import {TextureAsset} from 'meta/worlds';
import {titleBgTexture} from './Assets';

export const onPlayClicked = new UiEvent('TitleScreen-onPlayClicked');

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  public titleVisible: boolean = true;
  public backgroundTexture: TextureAsset = titleBgTexture;

  // Fade overlay
  public fadeVisible: boolean = false;
  public fadeOpacity: number = 0;

  override readonly events = {
    onPlayClicked,
  };
}

export const titleScreenVM = new TitleScreenViewModel();
