/**
 * FishSpriteRenderer — Draws the 10 sprite-based fish onto a fullscreen
 * DrawingSurface overlay each frame, converting world positions to canvas pixels.
 *
 * Component Attachment: Scene entity with CustomUiComponent (UI/FishSprites.xaml)
 * Component Networking: Local (client-side rendering only)
 * Component Ownership: Not Networked
 *
 * Canvas: 540×960 px. Orthographic projection — camera orthographicSize=9.5
 * means the visible half-height is 9.5 world units (VISIBLE_HEIGHT=19), so
 * VISIBLE_WIDTH = 19 * (540/960) ≈ 10.6875. PX_PER_UNIT = 960 / 19 ≈ 50.526.
 * Because the projection is orthographic, world→canvas mapping is depth-
 * independent: a 3D entity at world (x, y, anyZ) lands at the same canvas
 * pixel as a UI fish at world (x, y), so the hooked fish sprite anchors
 * exactly to the 3D hook position.
 * Coordinate mapping:
 *   canvasX = (worldX + HALF_VISIBLE_W) * PX_PER_UNIT
 *   canvasY = (cameraCenterY + HALF_VISIBLE_H - worldY) * PX_PER_UNIT
 */
import {
  CameraService,
  Component,
  CustomUiComponent,
  DrawingCommandData,
  DrawingCommandsBuilder,
  ImageBrush,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  Stretch,
  UiViewModel,
  WorldService,
  component,
  subscribe,
  uiViewModel,
} from 'meta/worlds';
import { getScreenAspectRatio } from '../../CameraUtils';
import type { Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';

import { FishDataService } from '../../Services/FishDataService';
import { GameCameraService } from '../../Services/GameCameraService';
import { HookedFishAnimator } from '../../Services/HookedFishAnimator';
import { SPRITE_FISH_MAP } from '../../FishSpriteAssets';
import { HOOK_IDLE_X, HOOK_IDLE_Y } from '../../Constants';

// --- Constants ---
// Canvas height is the reference axis — it maps 1:1 to the camera orthographic
// height. Canvas width is computed at runtime from the actual screen aspect
// ratio (set in onStart) so the UI never drifts from the 3D scene regardless
// of device aspect. The XAML Viewbox uses Stretch="Fill"; since canvas aspect
// now matches screen aspect, no distortion occurs.
const CANVAS_H = 960;

// Camera orthographic parameters (must match 3D camera setup in space.hstf).
// orthographicSize is the visible half-height in world units.
const CAMERA_ORTHO_SIZE = 9.5;

// Visible world extents in Y — depth-independent under orthographic projection.
const VISIBLE_HEIGHT = 2 * CAMERA_ORTHO_SIZE;          // 19
const HALF_VISIBLE_H = VISIBLE_HEIGHT / 2;

// Pixels per world unit (vertical reference, screen-aspect-independent).
const PX_PER_UNIT = CANVAS_H / VISIBLE_HEIGHT;         // ~50.526

// Margin outside canvas beyond which fish are skipped (pixels)
const CULL_MARGIN = 120;

// Hooked-fish pivot offset: where on the sprite the "fishing line attaches",
// expressed as a fraction of sprite height from the top edge.
// Sprites are drawn with their right edge at origin (mouth-side); this constant
// controls the vertical position of the attachment along that edge.
// 0.5 = vertical middle of the right edge — matches sprite art where the mouth
//       sits at the middle-right. The hook anchors directly into the mouth.
// 0   = top-right corner.  1 = bottom-right corner.
const HOOK_PIVOT_Y_FRACTION = 0.5;

// --- ViewModel ---
@uiViewModel()
class FishSpriteRendererViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
  canvasW: number = 540;
  canvasH: number = 960;
}

// --- Component ---
@component()
export class FishSpriteRenderer extends Component {

  private _vm = new FishSpriteRendererViewModel();
  private _builder = new DrawingCommandsBuilder();
  private _ready = false;

  // Screen-aspect-driven width values. Recomputed in onStart; canvas height
  // remains 960 and maps 1:1 to camera ortho height.
  private _canvasW = 540;
  private _halfVisibleW = (CANVAS_H * (540 / 960) * VISIBLE_HEIGHT / CANVAS_H) / 2;
  private _visibleWidth = this._halfVisibleW * 2;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[FishSpriteRenderer] onStart — binding DrawingSurface');
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._vm;
      this._ready = true;
    }
    // Sync canvas width to actual screen aspect so UI projection matches the
    // orthographic 3D view exactly. With Viewbox Stretch="Fill" and matching
    // aspect, sprites are neither stretched nor offset.
    const screenAspect = getScreenAspectRatio(); // width/height
    this._canvasW = CANVAS_H * screenAspect;
    this._visibleWidth = VISIBLE_HEIGHT * screenAspect;
    this._halfVisibleW = this._visibleWidth / 2;
    this._vm.canvasW = this._canvasW;
    this._vm.canvasH = CANVAS_H;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._ready) return;

    const builder = this._builder;
    builder.clear();

    // Read the camera's actual transform Y (not the lerp target) so the UI
    // projection matches the rendered 3D frame even when update order varies.
    const cameraCenterY = GameCameraService.get().getCameraWorldY();
    const fishDataService = FishDataService.get();

    for (const fish of fishDataService.allActive()) {
      // Only draw sprite fish
      const spriteInfo = SPRITE_FISH_MAP.get(fish.defId);
      if (!spriteInfo) continue;

      // Convert world → canvas (orthographic, aspect-matched)
      const canvasX = (fish.worldX + this._halfVisibleW) * PX_PER_UNIT;
      const canvasY = (cameraCenterY + HALF_VISIBLE_H - fish.worldY) * PX_PER_UNIT;

      // Cull fish outside canvas bounds
      if (canvasX < -CULL_MARGIN || canvasX > this._canvasW + CULL_MARGIN) continue;
      if (canvasY < -CULL_MARGIN || canvasY > CANVAS_H + CULL_MARGIN) continue;

      // Compute pixel dimensions based on fish size (0.5 scale to match world proportions)
      const w = spriteInfo.basePixelW * fish.size * 0.5;
      const h = spriteInfo.basePixelH * fish.size * 0.5;
      const halfW = w * 0.5;
      const halfH = h * 0.5;

      // Create brush for this fish sprite
      const brush = new ImageBrush(spriteInfo.texture, { stretch: Stretch.Uniform });

      // Check if fish is hooked and get animation state
      const animator = HookedFishAnimator.get();
      const isHooked = fish.isHooked;
      const animState = (isHooked && animator) ? animator.getAnimState(fish.fishId) : null;

      if (animState && (animState.rotation !== 0 || animState.scaleX !== 1 || animState.scaleY !== 1)) {
        // Hooked fish with "crane hook" rotation:
        // Fish hangs from its mouth (top-right corner area for right-facing fish, top-left for left-facing).
        // We translate to the hook attachment point, rotate around it (pendulum), then draw
        // the sprite offset so the attachment point sits at origin.
        const facingSign = fish.facingLeft ? -1 : 1;
        // Vertical anchor offset: sprite Y goes from -pivotY (above origin) to (h - pivotY) (below).
        // Smaller HOOK_PIVOT_Y_FRACTION → more sprite hangs *below* the pivot → bigger tail arc.
        const pivotY = h * HOOK_PIVOT_Y_FRACTION;

        builder.pushTranslate({ x: canvasX, y: canvasY });
        builder.pushRotate(animState.rotation, { x: 0, y: 0 });
        builder.pushScale({ x: animState.scaleX * facingSign, y: animState.scaleY }, { x: 0, y: 0 });
        // Draw with mouth-edge (top of right side) at origin
        builder.drawRect(brush, null, { x: -w, y: -pivotY, width: w, height: h });
        builder.pop(); // scale
        builder.pop(); // rotate
        builder.pop(); // translate
      } else {
        // Non-hooked fish: procedural swim animation using per-fish phase offset
        const t = WorldService.get().getWorldTime();
        const phase = fish.fishId * 2.3; // golden-ratio-ish desync

        // Squash/stretch: subtle volume-preserving oscillation
        const swimScaleX = 1 + 0.04 * Math.sin(t * 4.5 + phase);
        const swimScaleY = 1 - 0.03 * Math.sin(t * 4.5 + phase);

        // Gentle nose tilt (different frequency for organic feel)
        const swimRotation = 3 * Math.sin(t * 3.2 + phase * 1.7);

        // Facing direction folded into scaleX
        const facingSign = fish.facingLeft ? -1 : 1;

        builder.pushTranslate({ x: canvasX, y: canvasY });
        builder.pushRotate(swimRotation, { x: 0, y: 0 });
        builder.pushScale({ x: swimScaleX * facingSign, y: swimScaleY }, { x: 0, y: 0 });
        builder.drawRect(brush, null, { x: -halfW, y: -halfH, width: w, height: h });
        builder.pop(); // scale
        builder.pop(); // rotate
        builder.pop(); // translate
      }
    }

    // Send draw commands to ViewModel
    this._vm.drawCommands = builder.build();
  }
}
