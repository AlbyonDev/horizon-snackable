/**
 * ClientSetup — Initializes camera and routes touch input to game events.
 *
 * Responsibilities:
 *   - Set camera to Fixed mode pointing at the play area (ExecuteOn.Owner)
 *   - Enable FocusedInteraction so the screen captures taps
 *
 * ── Does NOT own ─────────────────────────────────────────────────────────────
 *   - Game logic → GameManager
 *
 * ── Scene setup ───────────────────────────────────────────────────────────────
 *   Attach this component to an entity in the scene.
 *   Assign the `cameraAnchor` property to a scene entity whose transform defines
 *   the desired camera position and rotation.
 */
import {
  Component,
  NetworkingService,
  CameraService,
  FocusedInteractionService,
  type Maybe, type Entity,
  component, property, subscribe,
  CameraComponent,
  OnPlayerCreateEvent,
  OnEntityStartEvent,
} from 'meta/worlds';
import { CameraShakeService } from '../Services/CameraShakeService';

@component()
export class ClientSetup extends Component {

  /** Scene entity whose world transform is used as the camera pose. */
  @property() cameraAnchor: Maybe<Entity> = null;

  /** Camera field of view in degrees. */
  @property() cameraFov: number = 60;

  /** Camera field of view in degrees. */
  @property() initDelay: number = 0;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  // ── Camera setup ─────────────────────────────────────────────────────────────

  private _initCamera(): void {
    const setup = () => {
      FocusedInteractionService.get().enableFocusedInteraction({
        disableEmotesButton: true,
        disableFocusExitButton: true,
      });

      const cameraC = this.cameraAnchor?.getComponent(CameraComponent);
      if (cameraC)
        CameraService.get().setActiveCamera({ camera: cameraC });

      if (this.cameraAnchor)
        CameraShakeService.get().init(this.cameraAnchor);
    };

    if (this.initDelay > 0) {
      setTimeout(setup, this.initDelay * 1000);
    } else {
      setup();
    }
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isPlayerContext()) {
      this._initCamera();
    }
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(): void {
    if (NetworkingService.get().isPlayerContext()) {
      this._initCamera();
    }
  }

}
