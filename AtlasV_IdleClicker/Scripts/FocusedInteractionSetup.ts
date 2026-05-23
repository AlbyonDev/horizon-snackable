/**
 * FocusedInteractionSetup
 *
 * Enables FocusedInteractionService on entity start to hide all default
 * joystick/controls overlay and provide a clean UI-only experience.
 *
 * Component Attachment: Scene Entity (TapZoneUI)
 * Component Networking: Local (not networked)
 * Component Ownership: Not Networked — runs on client only
 */

import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
  EventService,
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  Color,
} from 'meta/worlds';
import { Events } from './Types';
import { CANVAS_W, CANVAS_H, SCREEN_ASPECT } from './Constants';

const GAME_ASPECT = CANVAS_W / CANVAS_H;   // ≈ 0.565 (portrait)

@component()
export class FocusedInteractionSetup extends Component {
  // Runs on OnEntityStartEvent (NOT OnEntityCreateEvent) so CustomUiComponent is ready
  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    // MUST only run on client — FocusedInteractionService is client-side only
    if (!NetworkingService.get().isPlayerContext()) return;

    const service = FocusedInteractionService.get();

    try {
      // Enable focused interaction with both buttons disabled for clean UI
      service.enableFocusedInteraction({
        disableFocusExitButton: true,
        disableEmotesButton: true,
        interactionStringId: 'idle_clicker',
      });

      // Disable tap visual feedback (transparent/zero values)
      service.setTapOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        duration: 0,
        startScale: 0,
        endScale: 0,
      });

      // Disable trail visual feedback (transparent/zero values)
      service.setTrailOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        startWidth: 0,
        endWidth: 0,
        length: 0,
      });
    } catch {
      // FocusedInteractionService may be unavailable in some contexts; ignore.
    }
  }

  // Convert focused-interaction touch events into the gameplay PlayerTap event.
  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(p: OnFocusedInteractionInputEventPayload): void {
    if (!NetworkingService.get().isPlayerContext()) return;
    const { x, y } = this._screenToCanvas(p.screenPosition.x, p.screenPosition.y);
    EventService.sendLocally(Events.PlayerTap, { isAuto: false, tapX: x, tapY: y });
  }

  private _screenToCanvas(sx: number, sy: number): { x: number; y: number } {
    if (SCREEN_ASPECT > GAME_ASPECT) {
      // Wider screen → vertical letterbox bars left/right
      const gameW  = GAME_ASPECT / SCREEN_ASPECT;
      const offset = (1 - gameW) / 2;
      return {
        x: ((sx - offset) / gameW) * CANVAS_W,
        y: sy * CANVAS_H,
      };
    } else {
      // Taller screen → horizontal letterbox bars top/bottom
      const gameH  = SCREEN_ASPECT / GAME_ASPECT;
      const offset = (1 - gameH) / 2;
      return {
        x: sx * CANVAS_W,
        y: ((sy - offset) / gameH) * CANVAS_H,
      };
    }
  }
}
