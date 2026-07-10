/**
 * PreloadDestroyer — Disables the host entity after a player joins.
 *
 * Attached to scene-placed template instances that exist solely to force
 * the engine to cache their mesh/material/animation data during scene load.
 * Once a player has joined (ensuring the client has loaded/cached the assets),
 * these entities are disabled on the server. The disabled state replicates
 * to all clients automatically.
 *
 * NOTE: Scene-placed entities CANNOT be destroyed (only runtime-spawned
 * entities can). We use enabledSelf = false instead, which hides and
 * deactivates the entity on all clients.
 *
 * Component Attachment: Scene Entity (preload instances under PreloadCache)
 * Component Networking: Networked (server disables, replicates to clients)
 * Component Ownership: Server
 */
import {
  Component,
  component,
  subscribe,
  ExecuteOn,
  NetworkingService,
  OnPlayerCreateEvent,
} from 'meta/worlds';

const PRELOAD_DISABLE_DELAY_MS = 2000;

@component()
export class PreloadDestroyer extends Component {
  private hasDisabled: boolean = false;

  // Fires when a player joins — server disables after a short delay
  // to ensure client has time to cache the assets.
  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (this.hasDisabled) return;
    this.hasDisabled = true;

    console.log('[PreloadDestroyer] Player joined, scheduling preload entity disable');
    setTimeout(() => {
      this.entity.enabledSelf = false;
      console.log('[PreloadDestroyer] Disabled preload entity');
    }, PRELOAD_DISABLE_DELAY_MS);
  }
}
