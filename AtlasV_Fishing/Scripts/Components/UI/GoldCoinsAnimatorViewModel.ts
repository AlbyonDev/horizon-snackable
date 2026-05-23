import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

// --- Per-coin ViewModel ---
@uiViewModel()
export class GoldCoinItemUiData extends UiViewModel {
  x: number = 0;
  y: number = 0;
  scaleX: number = 1;
  scaleY: number = 1;
  rotation: number = 0;
  opacity: number = 1;
}

// --- Per-text ViewModel ---
@uiViewModel()
export class TextItemUiData extends UiViewModel {
  text: string = '';
  x: number = 0;
  y: number = 0;
  scaleX: number = 1;
  scaleY: number = 1;
  opacity: number = 1;
  color: string = '#FFFFFF';
}

// --- Parent ViewModel ---
@uiViewModel()
export class GoldCoinsAnimatorUiData extends UiViewModel {
  coins: readonly GoldCoinItemUiData[] = [];
  texts: readonly TextItemUiData[] = [];
}

// --- Component ---
/**
 * GoldCoinsAnimatorViewModel - binds the GoldCoinsAnimator XAML to a reactive
 * ViewModel containing a dynamic list of gold coin sprites and text items,
 * each individually controllable via code.
 *
 * Component Attachment: Scene/spawned entity with CustomUiComponent (GoldCoinsAnimator template)
 * Component Networking: Local (client-side visual effect only)
 * Component Ownership: Not Networked
 */
@component()
export class GoldCoinsAnimatorViewModel extends Component {
  private _vm = new GoldCoinsAnimatorUiData();
  private _ui: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._vm;
    }
  }

  // ── Coins ──────────────────────────────────────────────────────────

  /** Resize the coins array to `count`. Adds new default coins or trims extras. */
  public setCoinCount(count: number): void {
    const current = this._vm.coins;
    if (count === current.length) return;

    if (count > current.length) {
      const additions: GoldCoinItemUiData[] = [];
      for (let i = current.length; i < count; i++) {
        additions.push(new GoldCoinItemUiData());
      }
      this._vm.coins = [...current, ...additions];
    } else {
      this._vm.coins = current.slice(0, count);
    }
  }

  /** Directly set all properties on a coin at `index`. */
  public setCoin(
    index: number,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    rotation: number,
    opacity: number,
  ): void {
    const coin = this._vm.coins[index];
    if (!coin) return;
    coin.x = x;
    coin.y = y;
    coin.scaleX = scaleX;
    coin.scaleY = scaleY;
    coin.rotation = rotation;
    coin.opacity = opacity;
  }

  // ── Texts ──────────────────────────────────────────────────────────

  /** Resize the texts array to `count`. Adds new default texts or trims extras. */
  public setTextCount(count: number): void {
    const current = this._vm.texts;
    if (count === current.length) return;

    if (count > current.length) {
      const additions: TextItemUiData[] = [];
      for (let i = current.length; i < count; i++) {
        additions.push(new TextItemUiData());
      }
      this._vm.texts = [...current, ...additions];
    } else {
      this._vm.texts = current.slice(0, count);
    }
  }

  /** Directly set all properties on a text item at `index`. */
  public setText(
    index: number,
    text: string,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    opacity: number,
    color: string,
  ): void {
    const item = this._vm.texts[index];
    if (!item) return;
    item.text = text;
    item.x = x;
    item.y = y;
    item.scaleX = scaleX;
    item.scaleY = scaleY;
    item.opacity = opacity;
    item.color = color;
  }

}
