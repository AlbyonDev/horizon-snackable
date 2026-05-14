/**
 * FloatingTextItemViewModel
 *
 * Sub-ViewModel for a single floating text particle rendered via XAML ItemsControl.
 * Each particle has position, opacity, scale, text, and color.
 */
import { uiViewModel, UiViewModel } from 'meta/worlds';

@uiViewModel()
export class FloatingTextItemViewModel extends UiViewModel {
  public text: string = '';
  public positionX: number = 0;
  public positionY: number = 0;
  public opacity: number = 1;
  public scale: number = 1;
  public color: string = '#FFFFD700';
}
