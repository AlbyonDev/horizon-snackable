---
name: sound-design
summary: Where and how to add audio triggers in AtlasV_Fishing
include: on-demand
---

# Sound Design — AtlasV_Fishing

## Approach

Game audio should be event-driven. Create a dedicated `AudioController` component (or `@service()` service) that subscribes to gameplay events — never add audio calls inside existing gameplay files. Adding a new sound should be a single-file change.

## Suggested hook points

All events live in `Scripts/Types.ts` under the `Events` namespace. Subscribe with `@subscribe(Events.X)` from your audio controller.

| Event | Suggested sound |
|-------|----------------|
| `Events.CastRequested` | UI tap / button confirm |
| `Events.PhaseChanged` → `Throwing` | Fishing line whip / swoosh |
| `Events.PhaseChanged` → `Diving` | Underwater splash on water entry |
| `Events.FishHooked` | Sharp "snag" SFX (matches the 60 ms freeze + shake) |
| `Events.RequestSurface` | Reel-up / pull SFX (matches the cyan flash + 180 ms freeze) |
| `Events.FishCollected` | Coin / sparkle, pitch-shifted by `def.gold` for the heat scale |
| `Events.AllFishCollected` | Run-end positive jingle |
| `Events.GoldChanged` | Coin pickup tick when gold delta > 0 |
| `Events.UpgradesChanged` | Upgrade confirm |
| `TitleScreenPlayRequested` | Game-start swell |

## Pattern

```typescript
@component()
export class AudioController extends Component {

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
  }

  @subscribe(Events.FishHooked)
  onHooked(_p: Events.FishHookedPayload): void {
    // AudioService.get().play(Assets.SfxHook, this.entity);
  }
}
```

Add audio asset refs in `Scripts/Assets.ts` alongside the template refs.

## Implementation tips

- Pool one-shot audio sources the same way `BubblePool` pools entities — the Launching phase can fire up to `hookMaxFishAtLevel(level)` `FishCollected` events within a few hundred ms.
- Match underwater ambience (bubbles, deep hum) to camera Y via `GameCameraService.get().getCameraCenterY()` so the soundscape darkens as the player dives deeper.
