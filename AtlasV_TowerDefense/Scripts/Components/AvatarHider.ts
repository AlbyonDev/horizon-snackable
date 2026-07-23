/**
 * AvatarHider — Hides all player avatars and name tags on every client,
 * and teleports the owning player underground so the avatar is never visible
 * even for a single frame.
 *
 * Component Attachment: Player Template (player.hstf) AND Scene Entity (space.hstf)
 * Component Networking: Local (not networked — runs on every client independently)
 * Component Ownership: Not Networked
 *
 * When attached to the PLAYER template, OnEntityStartEvent fires on the player's
 * own entity at the earliest possible moment — before any scene entity receives
 * OnPlayerCreateEvent. This eliminates the 1-frame flash where the avatar is visible.
 *
 * The teleport to y=-100 is a belt-and-suspenders approach: even if setAvatarVisibility
 * has a frame delay, the player is far below the camera (at y=15.5) and invisible.
 *
 * When attached to a SCENE entity, it acts as a fallback for late-joining players
 * via OnPlayerCreateEvent.
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
  TransformComponent,
  Vec3,
  Quaternion,
} from 'meta/worlds';
import type { Entity } from 'meta/worlds';

@component()
export class AvatarHider extends Component {

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isPlayerContext()) {
      // If this component is on the player entity itself, hide + teleport immediately
      const selfPlayer = this.entity.getComponent(BasePlayerComponent);
      if (selfPlayer) {
        console.log('[AvatarHider] On player entity — hiding self and teleporting underground');
        this.hidePlayer(this.entity);
        this.teleportUnderground(this.entity);
      } else {
        // On a scene entity — hide any already-existing players
        this.hideAllExistingPlayers();
      }
    }
  }

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(payload: OnPlayerCreateEventPayload): void {
    // Hide avatar for any newly joining player on this client (scene-entity fallback)
    if (NetworkingService.get().isPlayerContext() && payload.entity) {
      console.log('[AvatarHider] Hiding avatar for new player (scene fallback)');
      this.hidePlayer(payload.entity);
      this.teleportUnderground(payload.entity);
    }
  }

  private hideAllExistingPlayers(): void {
    const players = EntityService.findEntitiesWithComponent(BasePlayerComponent);
    for (const player of players) {
      console.log('[AvatarHider] Hiding avatar for existing player');
      this.hidePlayer(player);
      this.teleportUnderground(player);
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

  private teleportUnderground(player: Entity): void {
    // Only teleport if we own the player (client-owned entity)
    if (player.isOwned()) {
      const transform = player.getComponent(TransformComponent);
      if (transform) {
        console.log('[AvatarHider] Teleporting player to y=-100');
        transform.teleportTo(new Vec3(0, -100, 0), Quaternion.identity);
      }
    }
  }
}
