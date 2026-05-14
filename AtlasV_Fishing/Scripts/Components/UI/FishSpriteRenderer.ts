/**
 * FishSpriteRenderer — Draws the 10 sprite-based fish onto a fullscreen
 * DrawingSurface overlay each frame, converting world positions to canvas pixels.
 *
 * Component Attachment: Scene entity with CustomUiComponent (UI/FishSprites.xaml)
 * Component Networking: Local (client-side rendering only)
 * Component Ownership: Not Networked
 *
 * Canvas: 540×960 px. Perspective projection from camera at Z=25, FOV=45°
 * yields ~20.71 world units visible height, ~11.65 visible width at Z=0.
 * PX_PER_UNIT ≈ 46.35 (= 960 / 20.71).
 * Coordinate mapping:
 *   canvasX = (worldX + HALF_VISIBLE_W) * PX_PER_UNIT
 *   canvasY = (cameraCenterY + HALF_VISIBLE_H - worldY) * PX_PER_UNIT
 */
import {
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
import type { Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';

import { FishDataService } from '../../Services/FishDataService';
import { GameCameraService } from '../../Services/GameCameraService';
import { HookedFishAnimator } from '../../Services/HookedFishAnimator';
import { SPRITE_FISH_MAP } from '../../FishSpriteAssets';

// --- Constants ---
const CANVAS_W = 540;
const CANVAS_H = 960;

// Camera perspective parameters (must match 3D camera setup)
const CAMERA_DISTANCE = 25; // camera Z position (looking at Z=0)
const CAMERA_FOV_DEG = 45;  // vertical FOV in degrees
const CAMERA_FOV_RAD = CAMERA_FOV_DEG * Math.PI / 180;

// Visible world extents at Z=0 via perspective projection
const VISIBLE_HEIGHT = 2 * CAMERA_DISTANCE * Math.tan(CAMERA_FOV_RAD / 2); // ~20.71
const VISIBLE_WIDTH = VISIBLE_HEIGHT * (CANVAS_W / CANVAS_H);              // ~11.65

// Pixels per world unit (perspective-correct)
const PX_PER_UNIT = CANVAS_H / VISIBLE_HEIGHT; // ~46.35

// Half-extents for coordinate conversion
const HALF_VISIBLE_W = VISIBLE_WIDTH / 2;
const HALF_VISIBLE_H = VISIBLE_HEIGHT / 2;

// Margin outside canvas beyond which fish are skipped (pixels)
const CULL_MARGIN = 120;

// Hooked-fish pivot offset: where on the sprite the "fishing line attaches".
// 0.5  = vertical middle of the sprite's mouth-side edge (old behavior).
// 0.15 = near the top edge of the sprite (mouth/nose area) → bigger tail-arc on swing.
// Lower values give a more dramatic "hanging by the mouth" look.
const HOOK_PIVOT_Y_FRACTION = 0.18;

// --- ViewModel ---
@uiViewModel()
class FishSpriteRendererViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
}

// --- Component ---
@component()
export class FishSpriteRenderer extends Component {

  private _vm = new FishSpriteRendererViewModel();
  private _builder = new DrawingCommandsBuilder();
  private _ready = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[FishSpriteRenderer] onStart — binding DrawingSurface');
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this._vm;
      this._ready = true;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._ready) return;

    const builder = this._builder;
    builder.clear();

    const cameraCenterY = GameCameraService.get().getCameraCenterY();
    const fishDataService = FishDataService.get();

    for (const fish of fishDataService.allActive()) {
      // Only draw sprite fish
      const spriteInfo = SPRITE_FISH_MAP.get(fish.defId);
      if (!spriteInfo) continue;

      // Convert world → canvas (perspective-correct)
      const canvasX = (fish.worldX + HALF_VISIBLE_W) * PX_PER_UNIT;
      const canvasY = (cameraCenterY + HALF_VISIBLE_H - fish.worldY) * PX_PER_UNIT;

      // Cull fish outside canvas bounds
      if (canvasX < -CULL_MARGIN || canvasX > CANVAS_W + CULL_MARGIN) continue;
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
