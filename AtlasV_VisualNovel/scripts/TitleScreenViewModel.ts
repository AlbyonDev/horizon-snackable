import { uiViewModel, UiViewModel } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
  taglineText: string = 'Prompt to build your 2D game.';
}
