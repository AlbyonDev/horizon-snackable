/**
 * AvatarHider — Hides all player avatars and name tags on every client.
 *
 * Component Attachment: Scene Entity (e.g. ServerSystems in space.hstf)
 * Component Networking: Local (not networked — runs on every client independently)
 * Component Ownership: Not Networked
 *
 * AvatarService.setAvatarVisibility is client-only and NOT networked.
 * We subscribe to OnPlayerCreateEvent which fires on every client for every player,
 * ensuring all avatars are hidden for all clients including late joiners.
 */
import {
  Component,
  component,
  subscribe,
  ExecuteOn,
  NetworkingService,
  AvatarService,
  AvatarVisibilityState,
  NameTagVisibilityState,
  OnPlayerCreateEvent,
  OnPlayerCreateEventPayload,
  OnEntityStartEvent,
  BasePlayerComponent,
  EntityService,
} from 'meta/worlds';
import type { Entity } from 'meta/worlds';

@component()
export class AvatarHider extends Component {

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    // Hide avatars for any players that already exist when this entity starts
    if (NetworkingService.get().isPlayerContext()) {
      this.hideAllExistingPlayers();
    }
  }

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(payload: OnPlayerCreateEventPayload): void {
    // Hide avatar for any newly joining player on this client
    if (NetworkingService.get().isPlayerContext() && payload.entity) {
      console.log('[AvatarHider] Hiding avatar for new player');
      this.hidePlayer(payload.entity);
    }
  }

  private hideAllExistingPlayers(): void {
    const players = EntityService.findEntitiesWithComponent(BasePlayerComponent);
    for (const player of players) {
      console.log('[AvatarHider] Hiding avatar for existing player');
      this.hidePlayer(player);
    }
  }

  private hidePlayer(player: Entity): void {
    AvatarService.get().setAvatarVisibility(
      this,
      player,
      AvatarVisibilityState.Hidden,
      true
    );
    AvatarService.get().setNameTagVisibility(
      this,
      player,
      NameTagVisibilityState.Hidden,
      true
    );
  }
}
