import {
  Component,
  component,
  subscribe,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
} from 'meta/worlds';
import type {Maybe} from 'meta/worlds';
import {
  CustomUiComponent,
} from 'meta/custom_ui';
import {
  OnEntityStartEvent,
} from 'meta/platform_api';
import {titleScreenVM, onPlayClicked} from './TitleScreenViewModel';
import { ShowDungeonSelectionEvent } from './ScreenEvents';

// Animation constants
const FADE_DURATION = 0.7; // seconds

/**
 * TitleScreenComponent
 * - Attachment: Scene entity with CustomUiPlatformComponent (title_screen.xaml)
 * - Networking: Local (UI is client-side only)
 * - Ownership: Not Networked
 *
 * Displays the title screen overlay. On Play click, fades to black then hides.
 * Button press feedback is handled purely in XAML via IsPressed trigger.
 */
@component()
export class TitleScreenComponent extends Component {
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  // Fade animation state
  private fading: boolean = false;
  private fadeElapsed: number = 0;
  private lastTime: number = 0;
  private playTriggered: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (this.customUi) {
      this.customUi.dataContext = titleScreenVM;
    }
  }

  @subscribe(onPlayClicked)
  onPlayClick() {
    if (this.playTriggered) return; // Prevent double-click
    this.playTriggered = true;

    // Start fade immediately
    this.fading = true;
    this.fadeElapsed = 0;
    titleScreenVM.fadeVisible = true;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload) {
    if (!this.fading) return;

    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const clampedDt = Math.min(dt, 1 / 30);

    this.fadeElapsed += clampedDt;
    // Ease-in curve: t^2 for smooth acceleration
    const progress = Math.min(this.fadeElapsed / FADE_DURATION, 1.0);
    const eased = progress * progress;
    titleScreenVM.fadeOpacity = eased;

    if (progress >= 1.0) {
      // Fade complete - hide title screen
      if (this.customUi) {
        this.customUi.isVisible = false;
      }
      this.fading = false;
      // Signal the dungeon selection screen to show
      this.sendLocalEvent(ShowDungeonSelectionEvent, {});
    }
  }

  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    // Re-bind ViewModel after hot reload
    if (this.customUi) {
      this.customUi.dataContext = titleScreenVM;
    }
  }
}
