---
name: coding-standards
summary: AtlasV_Fishing TypeScript conventions and patterns to follow strictly
include: always
---

# Coding Standards — AtlasV_Fishing

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `GameManager`, `HookController` |
| Interface | `I` prefix | `IFishDef` |
| Enum | PascalCase, explicit values | `GamePhase { Idle = 0 }` |
| Private field | `_` prefix | `_hookX`, `_phase` |
| `@property()` field | camelCase, no prefix | `camera`, `flashPlane` |
| Event string ID | `Ev` prefix | `'EvFishHooked'`, `'EvCastRequested'` |
| Module constant | `UPPER_SNAKE_CASE` | `DIVE_SPEED`, `WATER_SURFACE_Y` |
| Unused param | `_` prefix | `onReset(_p: Events.ResetPayload)` |

- `const` by default; `let` only when reassignment is necessary.
- Never use `any` — use `unknown` with narrowing, or a typed interface.
- Use `import type` for compile-time-only imports.

## File rules

- One class per file; file name matches the class name.
- `Types.ts` and `Constants.ts` must not import from any sibling source file.
- All `TemplateAsset` constructors live in `Scripts/Assets.ts`.
- All fish `TextureAsset` constructors live in `Scripts/FishSpriteAssets.ts`.
- Never declare an asset path inside a component or via `@property()`.

## Component skeleton

```typescript
@component()
export class MyComponent extends Component {
  @property() myValue: number = 1;

  private _transform: Maybe<TransformComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }
}
```

- Every component `onStart()` must early-return on `NetworkingService.get().isServerContext()` — gameplay is client-only.
- Prefer `OnEntityStartEvent` (scene-ready) over `OnEntityCreateEvent` (attach-time) for game logic.
- `@subscribe`-decorated handlers must NOT be `private` (TS6133).
- Long `@subscribe(OnWorldUpdateEvent)` handlers should check `VFXService.get().isFrozen` and skip the tick during a freeze. Only `GameCameraService` is exempt.

## Service skeleton

```typescript
@service()
export class MyService extends Service {
  private readonly _other = Service.inject(OtherService);
  private _state = new Map<number, string>();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    /* safe to call injected services and send events here */
  }
}
```

- Access via `MyService.get()` — do not override the inherited `get()`.
- Services never `dispose()`. To reset, subscribe to a reset event and reassign fields.

## Events

- All payload fields must have default values.
- `LocalEvent` for client-only; `NetworkEvent` + `@serializable()` for server↔client.
- No direct component references — communicate via events or entity refs.

## Spawning

```typescript
const entity = await WorldService.get().spawnTemplate({
  templateAsset: Assets.Bubble,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly,
}).catch(() => null);
```

- All spawns must use `NetworkMode.LocalOnly`.
- Wrap `spawnTemplate` calls in `.catch(() => null)` and check the result.

## Transform mutations

```typescript
// ✅ correct
t.localPosition = new Vec3(x, y, z);
t.worldPosition = new Vec3(x, y, z);

// ❌ wrong — SDK ignores in-place mutation
t.localPosition.x = 5;
```

## Per-frame update

```typescript
@subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
onUpdate(p: OnWorldUpdateEventPayload): void {
  const dt = p.deltaTime;
}
```

`ExecuteOn.Owner` skips the server context check automatically.

## Comments

- Comments only when the *why* is non-obvious — a hidden constraint, an invariant, a workaround.
- Do not narrate what the code does. Do not write history or "previously this was X" notes.
