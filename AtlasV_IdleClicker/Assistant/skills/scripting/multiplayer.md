---
name: multiplayer
summary: Information on how to do synchronous, networked multiplayer for 2d games in Horizon
include: on_context
agents: [global]
---

## Overview
This document captures key learnings from implementing multiplayer in 2D games using Meta Horizon Studio's networking system.

## Player Identification

### The Problem
In Meta Horizon Studio's networking model, the same logical player entity has **different internal IDs on different contexts** (server vs. client). Using `entity.toString()` is **NOT a stable cross-context identifier**.

Example:
- Client sees their player as `Id: 1190002`
- Server sees the same player as `Id: 2190029`

### Solution: Server-Assigned IDs
Use simple, server-assigned string IDs for game logic:

1. **Server assigns sequential IDs** when players join (e.g., `"player_0"`, `"player_1"`)
2. **Server broadcasts assigned ID** to clients via NetworkEvent
3. **All game communication** uses these server-assigned IDs

```typescript
// Server-side player tracking
private snakes: Map<string, SnakeState> = new Map(); // keyed by "player_0", "player_1", etc.
private playerCounter: number = 0;

onPlayerJoined(payload: OnPlayerCreateEventPayload) {
  const playerId = `player_${this.playerCounter++}`;
  // Store snake with this ID
  this.snakes.set(playerId, newSnakeState);
  // Notify the client of their assigned ID
}
```

## Sending Events to Specific Players

### What DOESN'T Work

1. **`entity.sendEventToOwner()`** - Only delivers to components on the SAME entity. If your game client script is on a scene entity (not the player entity), it won't receive the event.

2. **`EventService.sendToPlayer()`** - This method does NOT exist in Meta Horizon Studio.

3. **`entity.id`** - The `id` property does NOT exist on `IEntity`.

### What DOES Work: Broadcast and Filter Pattern

Meta Horizon Studio uses a "send to everyone and filter on receive" pattern:

1. **Server broadcasts globally** with a target identifier
2. **Client filters** incoming events to find ones meant for them

### Entity References in Payloads
Entity references CAN be serialized directly in NetworkEvent payloads - they are automatically serialized and deserialized across network boundaries.

```typescript
// In your event payload class
class SnakePlayerAssignedPayload {
  constructor(
    public playerId: string,
    public playerIndex: number,
    public targetEntity: Maybe<Entity>  // Entity reference works!
  ) {}
}

// Server sends
EventService.sendGlobally(SnakePlayerAssignedEvent,
  new SnakePlayerAssignedPayload(playerId, playerIndex, playerEntity)
);

// Client filters
onPlayerAssigned(payload: SnakePlayerAssignedPayload) {
  const localPlayer = PlayerService.get().getLocalPlayer();
  if (payload.targetEntity === localPlayer) {
    // This assignment is for us!
    this.localPlayerId = payload.playerId;
  }
}
```

### Using Maps with Entity Keys
The documentation recommends using `Map<Entity, T>` for tracking players:

```typescript
private entityToPlayerId: Map<Entity, string> = new Map();
```

## Event Sending Methods

### For NetworkEvents (cross-network communication):
```typescript
// Send to ALL clients and server
EventService.sendGlobally(MyNetworkEvent, payload);
```

### For LocalEvents (same-context only):
```typescript
// Send to components on same entity
this.sendEventToEveryone(MyLocalEvent, payload);
```

**CRITICAL:** Don't mix these up! Using `sendEventToEveryone()` with a NetworkEvent won't send it across the network.

## Client vs Server Context

Check which context you're running in:
```typescript
if (this.isServer()) {
  // Server-side logic
} else {
  // Client-side logic
}
```

Or for player context:
```typescript
if (this.isPlayerContext()) {
  // Running on a player's client
}
```

## Getting the Local Player

On the client side:
```typescript
const localPlayer = PlayerService.get().getLocalPlayer();
```

This returns the Entity for the local player, which can be used for comparison with Entity references received in events.

## Summary of Best Practices

1. **Use server-assigned string IDs** for all game logic (not entity.toString())
2. **Broadcast events globally** and filter on the client side
3. **Pass Entity references directly** in payloads when you need to identify a target
4. **Use `EventService.sendGlobally()`** for NetworkEvents
5. **Use `Map<Entity, T>`** for tracking player-related data on the server
6. **Always check context** (`isServer()`, `isPlayerContext()`) before running context-specific code
