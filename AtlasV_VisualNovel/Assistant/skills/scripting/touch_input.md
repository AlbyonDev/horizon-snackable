---
name: touch_input
summary: Complete guide to touch input using FocusedInteractionService including coordinate mapping, input patterns, and calibration
include: always
agents: [global]
---

# Touch Input with FocusedInteractionService

This document covers everything you need to implement intuitive touch-based controls for 2D games using `FocusedInteractionService`.

---

## ⚠️ CRITICAL: Touch Coordinate Mapping Required

**NEVER use fixed scale factors (1.0, 1.0) for touch coordinate mapping.** This is the #1 cause of broken touch input in 2D games.

When the window aspect ratio differs from your game canvas (which is almost always the case), touches will register in completely wrong positions unless you implement **aspect ratio correction**.

**Symptom:** User has to click far to the side of the window to register touches on the edge of the playable area.

**Solution:** Use `CameraModeProvisionalService.aspectRatio` from `meta/worlds_provisional` to get the actual viewport aspect ratio at runtime, then compute the letterbox offset mathematically. See the [Coordinate Mapping](#coordinate-mapping) section below.

**This is NOT optional.** Every 2D game using FocusedInteractionService MUST implement coordinate mapping with aspect ratio correction.

---

## Overview

**All game input should use FocusedInteractionService** for a consistent, intuitive touch experience. This provides:

- Precise touch coordinates (normalized 0-1 screen space)
- Touch start, move, and end events
- Multi-touch support via `interactionIndex`
- Control over visual feedback

## Required Imports

```typescript
import {
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputEventPayload,
  Vec2,
  NetworkingService,
} from 'meta/worlds';
import {
  CameraModeProvisionalService,
} from 'meta/worlds_provisional';
import {
  OnEntityCreateEvent,
  OnEntityStartEvent,
  Color,
} from 'meta/platform_api';
```

> **⚠️ Dependency Required:** To use `CameraModeProvisionalService`, you must add `meta/worlds_provisional` to your project's package dependencies. In Meta Horizon Studio, add the `worlds_sdk_provisional` package to your project's `package.json`. The tsconfig.json will be automatically updated with the path mapping.

## Setup

### ⚠️ CRITICAL: Client-Side Only & Initialization Timing

**FocusedInteractionService MUST be used on the CLIENT only, not the server.** Touch input is a client-side concern. Wrap all FocusedInteractionService code in a client check.

**FocusedInteractionService MUST be initialized in `OnEntityStartEvent`, NOT `OnEntityCreateEvent`.** The CustomUiComponent is not fully ready during the Create event, causing `enableFocusedInteraction()` to fail silently. The Start event fires after all components are initialized.

### Enable Focused Interaction Mode

```typescript
import { NetworkingService } from 'meta/worlds';

private enableTouchInput(): void {
  // CRITICAL: Only run on client - touch input is client-side only
  if (!NetworkingService.get().isPlayerContext()) return;

  const service = FocusedInteractionService.get();

  try {
    service.enableFocusedInteraction({
      disableFocusExitButton: false,
      disableEmotesButton: true,
      interactionStringId: 'game_touch',
    });

    // Disable default visual feedback (you'll render your own)
    service.setTapOptions(false, {
      startColor: new Color(0, 0, 0, 0),
      endColor: new Color(0, 0, 0, 0),
      duration: 0,
      startScale: 0,
      endScale: 0,
    });

    service.setTrailOptions(false, {
      startColor: new Color(0, 0, 0, 0),
      endColor: new Color(0, 0, 0, 0),
      startWidth: 0,
      endWidth: 0,
      length: 0,
    });

    console.log('Touch input enabled successfully');
  } catch (e) {
    console.error('Failed to enable touch input:', e);
  }
}

@subscribe(OnEntityCreateEvent)
onCreate() {
  // Setup ViewModel and initial render here
  const customUiComponent = this.entity.getComponent(CustomUiComponent);
  if (customUiComponent != null) {
    customUiComponent.dataContext = this.viewModel;
  }
  this.render(); // Initial render
}

// CRITICAL: Enable touch input in Start event, NOT Create event!
// The CustomUiComponent is not fully ready during Create.
@subscribe(OnEntityStartEvent)
onStart() {
  this.enableTouchInput();
}
```

### Subscribe to Touch Events

```typescript
@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
  if (payload.interactionIndex !== 0) return;  // First finger only

  const pos = this.screenToCanvas(payload.screenPosition);
  this.handleTouchStart(pos.x, pos.y);
}

@subscribe(OnFocusedInteractionInputMovedEvent)
onTouchMove(payload: OnFocusedInteractionInputEventPayload) {
  if (payload.interactionIndex !== 0) return;

  const pos = this.screenToCanvas(payload.screenPosition);
  this.handleTouchMove(pos.x, pos.y);
}

@subscribe(OnFocusedInteractionInputEndedEvent)
onTouchEnd(payload: OnFocusedInteractionInputEventPayload) {
  if (payload.interactionIndex !== 0) return;

  const pos = this.screenToCanvas(payload.screenPosition);
  this.handleTouchEnd(pos.x, pos.y);
}
```

## Coordinate Mapping

### The Problem

**FocusedInteractionService coordinates are normalized to the ENTIRE screen (0-1 range)**, not your UI content area.

When using a `Viewbox` with `Stretch="Uniform"` (required for fullscreen 2D games), the content maintains its aspect ratio and may have letterboxing (black bars). This means:

1. Screen coordinates don't map 1:1 to canvas coordinates
2. The mapping may differ per axis depending on aspect ratios
3. Without correction, touches appear offset from where the user actually touched

### The Solution: CameraModeProvisionalService.aspectRatio (Recommended)

**Use `CameraModeProvisionalService` from `meta/worlds_provisional` to get the actual viewport aspect ratio at runtime.** This eliminates the need for hardcoded aspect ratios, manual calibration, or guessing device dimensions.

`CameraModeProvisionalService.aspectRatio` returns the camera viewport's width/height ratio. Combined with your known game canvas aspect ratio, you can compute the exact letterbox offset and correctly map normalized screen coordinates to canvas coordinates.

```typescript
import { CameraModeProvisionalService } from 'meta/worlds_provisional';

private readonly kCanvasWidth = 480;
private readonly kCanvasHeight = 800;
private readonly kGameAspectRatio = this.kCanvasWidth / this.kCanvasHeight; // 0.6 for 480x800

private screenToCanvas(screenPos: Vec2): { x: number; y: number } {
  const screenAspect = CameraModeProvisionalService.get().aspectRatio; // actual width/height
  let canvasX: number;
  let canvasY: number;

  if (screenAspect > this.kGameAspectRatio) {
    // Screen is wider than game → vertical bars on left/right
    // The game occupies only a portion of the horizontal screen space
    const gameWidthInScreenSpace = this.kGameAspectRatio / screenAspect;
    const offsetX = (1.0 - gameWidthInScreenSpace) / 2.0;
    canvasX = ((screenPos.x - offsetX) / gameWidthInScreenSpace) * this.kCanvasWidth;
    canvasY = screenPos.y * this.kCanvasHeight;
  } else {
    // Screen is taller than game → bars on top/bottom
    // The game occupies only a portion of the vertical screen space
    const gameHeightInScreenSpace = screenAspect / this.kGameAspectRatio;
    const offsetY = (1.0 - gameHeightInScreenSpace) / 2.0;
    canvasX = screenPos.x * this.kCanvasWidth;
    canvasY = ((screenPos.y - offsetY) / gameHeightInScreenSpace) * this.kCanvasHeight;
  }

  return { x: canvasX, y: canvasY };
}
```

### Why This Works

1. **The Viewbox scales content uniformly from the center.** When there's an aspect ratio mismatch, letterboxing is symmetric around the center.

2. **Touch coordinates span the full window (0-1)**, but the game canvas only occupies a portion of that space when letterboxed.

3. **`CameraModeProvisionalService.aspectRatio`** gives us the actual screen aspect ratio at runtime, so we can compute exactly how much of the normalized 0–1 range is occupied by the game vs. the letterbox bars.

4. **Subtracting the offset and dividing by the game's fraction of screen space** maps the touch coordinate back into the game's 0–1 range, which we then scale to canvas pixel coordinates.

### Example

On a 16:9 screen (aspectRatio ≈ 1.78) with a 480×800 game (gameAspect = 0.6):

- `gameWidthInScreenSpace = 0.6 / 1.78 ≈ 0.337` (game occupies ~34% of screen width)
- `offsetX = (1.0 - 0.337) / 2 ≈ 0.331` (left letterbox bar is ~33% of screen)
- A touch at `screenPos.x = 0.5` (screen center) maps to canvas center: `(0.5 - 0.331) / 0.337 * 480 ≈ 240`
- A touch at `screenPos.x = 0.331` (left edge of game) maps to canvas x ≈ 0
- A touch at `screenPos.x = 0.669` (right edge of game) maps to canvas x ≈ 480

### Fallback: Estimated Aspect Ratio

If `meta/worlds_provisional` is unavailable in your project, you can hardcode an estimated aspect ratio as a fallback. This is less accurate but works as a reasonable approximation:

```typescript
// Fallback: hardcoded estimate (16:9 is common for most devices)
private readonly kEstimatedScreenAspect = 16 / 9; // 1.78

private screenToCanvas(screenPos: Vec2): { x: number; y: number } {
  const screenAspect = this.kEstimatedScreenAspect;
  // ... same math as above ...
}
```

**If using the fallback and touches are offset:**
- **Touches offset toward center:** The estimated aspect ratio is too wide — decrease it
- **Touches offset away from center:** The estimated aspect ratio is too narrow — increase it

## Touch Input Patterns

### Pattern 1: Tap Detection

Detect simple taps and take action based on location:

```typescript
private handleTouchStart(x: number, y: number): void {
  // Check UI buttons first (rendered on canvas)
  if (this.isInRestartButton(x, y)) {
    this.restartGame();
    return;
  }

  if (this.gameOver) return;

  // Handle game input based on tap location
  if (x < this.kCanvasWidth / 2) {
    this.onTapLeft();
  } else {
    this.onTapRight();
  }
}
```

### Pattern 2: Touch and Hold (Continuous)

Track touch state and use in update loop:

```typescript
private isTouching: boolean = false;
private touchX: number = 0;
private touchY: number = 0;

private handleTouchStart(x: number, y: number): void {
  this.isTouching = true;
  this.touchX = x;
  this.touchY = y;
}

private handleTouchMove(x: number, y: number): void {
  this.touchX = x;
  this.touchY = y;
}

private handleTouchEnd(x: number, y: number): void {
  this.isTouching = false;
}

@subscribe(OnWorldUpdateEvent)
onUpdate() {
  if (this.isTouching) {
    // Move player toward touch position
    const dx = this.touchX - this.playerX;
    const dy = this.touchY - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {  // Dead zone
      this.playerX += (dx / dist) * this.moveSpeed;
      this.playerY += (dy / dist) * this.moveSpeed;
    }
  }

  this.render();
}
```

### Pattern 3: Swipe Detection

Track start and end positions to detect swipes:

```typescript
private touchStartX: number = 0;
private touchStartY: number = 0;
private touchStartTime: number = 0;
private readonly kSwipeThreshold = 50;      // Minimum pixels
private readonly kSwipeMaxTime = 500;       // Maximum milliseconds

private handleTouchStart(x: number, y: number): void {
  this.touchStartX = x;
  this.touchStartY = y;
  this.touchStartTime = Date.now();
}

private handleTouchEnd(x: number, y: number): void {
  const dx = x - this.touchStartX;
  const dy = y - this.touchStartY;
  const elapsed = Date.now() - this.touchStartTime;

  // Check if it's a swipe (fast enough and far enough)
  if (elapsed < this.kSwipeMaxTime &&
      (Math.abs(dx) > this.kSwipeThreshold || Math.abs(dy) > this.kSwipeThreshold)) {

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0) this.onSwipeRight();
      else this.onSwipeLeft();
    } else {
      // Vertical swipe
      if (dy > 0) this.onSwipeDown();
      else this.onSwipeUp();
    }
  } else {
    // It's a tap
    this.onTap(x, y);
  }
}
```

### Pattern 4: Drag and Drop

Track dragging state and object being dragged:

```typescript
private dragging: boolean = false;
private draggedObject: GameObject | null = null;
private dragOffsetX: number = 0;
private dragOffsetY: number = 0;

private handleTouchStart(x: number, y: number): void {
  // Check if touching a draggable object
  const obj = this.findObjectAt(x, y);
  if (obj && obj.draggable) {
    this.dragging = true;
    this.draggedObject = obj;
    this.dragOffsetX = x - obj.x;
    this.dragOffsetY = y - obj.y;
  }
}

private handleTouchMove(x: number, y: number): void {
  if (this.dragging && this.draggedObject) {
    this.draggedObject.x = x - this.dragOffsetX;
    this.draggedObject.y = y - this.dragOffsetY;
  }
}

private handleTouchEnd(x: number, y: number): void {
  if (this.dragging && this.draggedObject) {
    this.onObjectDropped(this.draggedObject, x, y);
  }
  this.dragging = false;
  this.draggedObject = null;
}
```

### Pattern 5: Drawing/Trail

Collect points as the user drags:

```typescript
interface Point {
  x: number;
  y: number;
}

private drawingPoints: Point[] = [];
private isDrawing: boolean = false;

private handleTouchStart(x: number, y: number): void {
  this.isDrawing = true;
  this.drawingPoints = [{ x, y }];
}

private handleTouchMove(x: number, y: number): void {
  if (this.isDrawing) {
    // Only add point if moved enough (reduces point count)
    const last = this.drawingPoints[this.drawingPoints.length - 1];
    const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
    if (dist > 5) {
      this.drawingPoints.push({ x, y });
    }
  }
}

private handleTouchEnd(x: number, y: number): void {
  if (this.isDrawing) {
    this.drawingPoints.push({ x, y });
    this.processDrawing(this.drawingPoints);
  }
  this.isDrawing = false;
}

private renderDrawing(): void {
  if (this.drawingPoints.length < 2) return;

  const brush = new SolidBrush(Color.fromHex('#FFFFFF'));
  const pen = new Pen(brush, 3);

  for (let i = 1; i < this.drawingPoints.length; i++) {
    const p0 = this.drawingPoints[i - 1];
    const p1 = this.drawingPoints[i];
    this.builder.drawLine(pen, p0.x, p0.y, p1.x, p1.y);
  }
}
```

### Pattern 6: Virtual Joystick

Create an on-screen joystick that appears where the user touches:

```typescript
private joystickActive: boolean = false;
private joystickCenterX: number = 0;
private joystickCenterY: number = 0;
private joystickX: number = 0;  // -1 to 1
private joystickY: number = 0;  // -1 to 1
private readonly kJoystickRadius = 60;

private handleTouchStart(x: number, y: number): void {
  // Create joystick at touch position
  this.joystickActive = true;
  this.joystickCenterX = x;
  this.joystickCenterY = y;
  this.joystickX = 0;
  this.joystickY = 0;
}

private handleTouchMove(x: number, y: number): void {
  if (!this.joystickActive) return;

  const dx = x - this.joystickCenterX;
  const dy = y - this.joystickCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > this.kJoystickRadius) {
    // Clamp to radius
    this.joystickX = (dx / dist);
    this.joystickY = (dy / dist);
  } else {
    // Normalize within radius
    this.joystickX = dx / this.kJoystickRadius;
    this.joystickY = dy / this.kJoystickRadius;
  }
}

private handleTouchEnd(x: number, y: number): void {
  this.joystickActive = false;
  this.joystickX = 0;
  this.joystickY = 0;
}

private renderJoystick(): void {
  if (!this.joystickActive) return;

  // Outer ring
  const ringBrush = new SolidBrush(new Color(1, 1, 1, 0.2));
  this.builder.drawEllipse(ringBrush, null,
    this.joystickCenterX, this.joystickCenterY,
    this.kJoystickRadius, this.kJoystickRadius);

  // Inner knob
  const knobX = this.joystickCenterX + this.joystickX * this.kJoystickRadius;
  const knobY = this.joystickCenterY + this.joystickY * this.kJoystickRadius;
  const knobBrush = new SolidBrush(new Color(1, 1, 1, 0.5));
  this.builder.drawEllipse(knobBrush, null, knobX, knobY, 25, 25);
}

// Use in update loop
private processInput(): void {
  if (this.joystickActive) {
    this.playerVx = this.joystickX * this.maxSpeed;
    this.playerVy = this.joystickY * this.maxSpeed;
  }
}
```

## Rendering Touch UI Elements

Render interactive elements directly on the DrawingSurface and handle hit testing:

```typescript
interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  action: () => void;
}

private buttons: Button[] = [];

private initButtons(): void {
  this.buttons = [
    {
      x: this.kCanvasWidth / 2 - 60,
      y: this.kCanvasHeight - 70,
      width: 120,
      height: 44,
      label: 'RESTART',
      color: '#E94560',
      action: () => this.restartGame(),
    },
    // Add more buttons as needed
  ];
}

private renderButtons(): void {
  for (const btn of this.buttons) {
    const bgBrush = new SolidBrush(Color.fromHex(btn.color));
    this.builder.drawRoundRect(bgBrush, null, btn.x, btn.y, btn.width, btn.height, 8, 8);

    const textX = btn.x + (btn.width - btn.label.length * 9) / 2;
    const textY = btn.y + (btn.height - 18) / 2;
    const textBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
    const btnFont = new Font(FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);
    this.builder.drawText(btn.label, textX, textY, btn.width, 20, 18, textBrush, btnFont);
  }
}

private handleTouchStart(x: number, y: number): void {
  // Check all buttons
  for (const btn of this.buttons) {
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      btn.action();
      return;
    }
  }

  // Handle other touches...
}
```

## Multi-Touch (Advanced)

For games that need multi-touch (e.g., dual joysticks):

```typescript
private touches: Map<number, { x: number; y: number }> = new Map();

@subscribe(OnFocusedInteractionInputStartedEvent)
onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
  const pos = this.screenToCanvas(payload.screenPosition);
  this.touches.set(payload.interactionIndex, { x: pos.x, y: pos.y });

  // Handle based on which finger and where
  if (payload.interactionIndex === 0) {
    // First finger - movement
    this.startMovementTouch(pos.x, pos.y);
  } else if (payload.interactionIndex === 1) {
    // Second finger - action
    this.startActionTouch(pos.x, pos.y);
  }
}

@subscribe(OnFocusedInteractionInputMovedEvent)
onTouchMove(payload: OnFocusedInteractionInputEventPayload) {
  const pos = this.screenToCanvas(payload.screenPosition);
  this.touches.set(payload.interactionIndex, { x: pos.x, y: pos.y });

  if (payload.interactionIndex === 0) {
    this.updateMovementTouch(pos.x, pos.y);
  }
}

@subscribe(OnFocusedInteractionInputEndedEvent)
onTouchEnd(payload: OnFocusedInteractionInputEventPayload) {
  this.touches.delete(payload.interactionIndex);

  if (payload.interactionIndex === 0) {
    this.endMovementTouch();
  } else if (payload.interactionIndex === 1) {
    this.endActionTouch();
  }
}
```

## Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No touch events firing | FocusedInteraction not enabled | Call `enableFocusedInteraction()` in onStart (NOT onCreate) |
| No touch events firing | Initialized too early | Move from `OnEntityCreateEvent` to `OnEntityStartEvent` |
| No touch events firing | Running on server | Add `if (!NetworkingService.get().isPlayerContext()) return;` check |
| Touches offset toward center | Aspect ratio correction missing or wrong | Use `CameraModeProvisionalService.aspectRatio` in `screenToCanvas()` |
| Touches offset away from center | Aspect ratio correction over-compensating | Verify `screenToCanvas()` math against the recommended implementation |
| X offset but Y correct | Only horizontal letterboxing needs correction | Check that the wider-than-game branch handles X correctly |
| Y offset but X correct | Only vertical letterboxing needs correction | Check that the taller-than-game branch handles Y correctly |
| Touches work in center, offset at edges | Not accounting for letterbox offset | Subtract the offset before dividing by game fraction |
| Multiple events per touch | Not filtering by interactionIndex | Check `payload.interactionIndex === 0` |
| Buttons don't respond | Missing hit testing | Implement point-in-rect check in touch handler |

## Complete Example

See the **Complete Example** skill for a full working template that demonstrates:
- FocusedInteractionService setup
- Coordinate mapping
- Touch-to-move controls
- Rendered button with hit testing
- Touch indicator visualization


## Common Pitfalls

### Not Enabling FocusedInteractionService

Touch events never fire if you never call `enableFocusedInteraction()`. You must call it during initialization.

### Initialization Timing (Start, NOT Create)

`enableFocusedInteraction()` called in `OnEntityCreateEvent` fails silently because `CustomUiComponent` is not fully ready. Always use `OnEntityStartEvent`.

```typescript
// WRONG - Too early!
@subscribe(OnEntityCreateEvent)
onCreate() {
  service.enableFocusedInteraction({...}); // Fails silently!
}

// CORRECT
@subscribe(OnEntityStartEvent)
onStart() {
  this.enableTouchInput();
}
```

### FocusedInteractionService is Client-Side Only

Always wrap in `if (!NetworkingService.get().isPlayerContext()) return;` to prevent running on the server.

### Touch Coordinates Are Offset

The #1 most common bug. FocusedInteractionService provides normalized screen coordinates (0-1) for the ENTIRE window, but your canvas has a different aspect ratio. You MUST use `CameraModeProvisionalService.aspectRatio` (from `meta/worlds_provisional`) to get the actual viewport aspect ratio and compute the letterbox offset in `screenToCanvas()`. See the Coordinate Mapping section above.

### Not Filtering by interactionIndex

Multi-touch causes unexpected behavior if you handle all fingers. Filter with `if (payload.interactionIndex !== 0) return;`

### Touch Target Too Small

Use minimum 44x44 logical pixels for touch targets.

### Rendered Buttons Not Responding

If you render a button on the canvas via DrawingSurface, you must manually implement hit testing in your touch handler. Store button bounds and check against them.
