/**
 * FloaterRenderer — All DrawingSurface draw functions.
 * Draws: background, fish portrait, float, fishing line, power gauge,
 * splash ripples, floating emotion icons.
 */

import {
  DrawingCommandsBuilder,
  DrawingCommandData,
  SolidBrush,
  LinearGradientBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  ImageBrush,
  DrawTextAlignment,
  Stretch,
} from 'meta/custom_ui';
import { Color } from 'meta/platform_api';
import { TextureAsset } from 'meta/worlds';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FLOAT_WIDTH, FLOAT_HEIGHT,
  LINE_START_X, LINE_START_Y,
  POV_LINE_START_X, POV_LINE_START_Y,
  TITLE_LINE_START_X, TITLE_LINE_START_Y,
  FISH_PORTRAIT_X, FISH_PORTRAIT_Y, FISH_PORTRAIT_SIZE,
  GAUGE_X, GAUGE_Y, GAUGE_WIDTH, GAUGE_HEIGHT,
  GAUGE_BORDER_RADIUS, GAUGE_INDICATOR_HEIGHT,
  COLOR_GAUGE_BG, COLOR_GAUGE_FILL, COLOR_GAUGE_INDICATOR, COLOR_GAUGE_BORDER,
  EMOTION_ICON_SIZE, EMOTION_ICON_BOUNCE_TIME, EMOTION_ICON_FADE_TIME,
  CHAR_RIPPLE_Y_SQUISH,
  CAST_TRAJ_START_X, CAST_TRAJ_START_Y,
  CAST_TRAJ_LANDING_NEAR_Y, CAST_TRAJ_LANDING_FAR_Y,
  CAST_TRAJ_CTRL_OFFSET_Y,
  CAST_TRAJ_LINE_WIDTH, CAST_TRAJ_LINE_COLOR_R, CAST_TRAJ_LINE_COLOR_G,
  CAST_TRAJ_LINE_COLOR_B, CAST_TRAJ_LINE_ALPHA,
  CAST_TRAJ_DOT_RADIUS, CAST_TRAJ_DOT_ALPHA,
  CAST_TRAJ_LANDING_MIN_X, CAST_TRAJ_LANDING_MAX_X,
  ZONE_NEAR_TOP_Y, ZONE_NEAR_BOTTOM_Y, ZONE_MID_BOTTOM_Y, ZONE_FAR_BOTTOM_Y,
} from './Constants';
import type { SplashRipple, FloatingEmotionIcon } from './Types';
import { EmotionIconType } from './Types';
import { Vec3D } from './Vec3D';
import {
  bgLilyShallowsTexture,
  bgLilyDayTexture,
  titleBackgroundTexture,
  emotionCuriosityTexture, emotionSurpriseTexture, emotionWarmthTexture,
  emotionShockTexture, emotionHesitationTexture, emotionContentmentTexture,
  emotionSadnessTexture, emotionBoredomTexture, emotionDelightTexture,
  fishingFloatTexture,
} from './Assets';

// Expression textures kept in project but no longer used for rendering.
// Portrait always shows neutral; mood is conveyed via emotion icons + animations.

function getEmotionIconTexture(type: EmotionIconType): TextureAsset | null {
  switch (type) {
    case EmotionIconType.Curiosity: return emotionCuriosityTexture;
    case EmotionIconType.Surprise: return emotionSurpriseTexture;
    case EmotionIconType.Warmth: return emotionWarmthTexture;
    case EmotionIconType.Shock: return emotionShockTexture;
    case EmotionIconType.Hesitation: return emotionHesitationTexture;
    case EmotionIconType.Contentment: return emotionContentmentTexture;
    case EmotionIconType.Sadness: return emotionSadnessTexture;
    case EmotionIconType.Boredom: return emotionBoredomTexture;
    case EmotionIconType.Delight: return emotionDelightTexture;
    default: return null;
  }
}

export class FloaterRenderer {
  private builder: DrawingCommandsBuilder;

  private bgBrush: ImageBrush;
  private dayBgBrush: ImageBrush;
  private titleBgBrush: ImageBrush;
  private floatBrush: ImageBrush;
  private lineBrush: SolidBrush;
  private linePen: Pen;

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
    this.bgBrush = new ImageBrush(bgLilyShallowsTexture, { stretch: Stretch.UniformToFill });
    this.dayBgBrush = new ImageBrush(bgLilyDayTexture, { stretch: Stretch.UniformToFill });
    this.titleBgBrush = new ImageBrush(titleBackgroundTexture, { stretch: Stretch.UniformToFill });
    this.floatBrush = new ImageBrush(fishingFloatTexture);
    this.lineBrush = new SolidBrush(new Color(0.78, 0.85, 0.91, 0.5));
    this.linePen = new Pen(this.lineBrush, 1.5);
  }

  clear(): void { this.builder.clear(); }
  build(): DrawingCommandData { return this.builder.build(); }

  drawBackground(isDayMode: boolean = false): void {
    const brush = isDayMode ? this.dayBgBrush : this.bgBrush;
    this.builder.drawRect(brush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  }

  drawTitleBackground(): void {
    this.builder.drawRect(this.titleBgBrush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  }

  drawFishPortrait(alpha: number, offsetX: number, offsetY: number, portraitTexture: TextureAsset): void {
    if (alpha <= 0) return;
    const size = FISH_PORTRAIT_SIZE;
    const x = FISH_PORTRAIT_X + offsetX;
    const y = FISH_PORTRAIT_Y + offsetY;

    // Scale-in animation: portrait grows from center as alpha increases
    const scale = alpha; // 0→1 maps directly to scale for smooth grow-in
    // Apply ease-out for snappy feel: quick start, gentle settle
    const easedScale = 1 - Math.pow(1 - scale, 3);

    const scaledSize = size * easedScale;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const drawX = centerX - scaledSize / 2;
    const drawY = centerY - scaledSize / 2;

    // Render the provided portrait texture (character-specific)
    const fishBrush = new ImageBrush(portraitTexture);
    this.builder.drawRect(fishBrush, null,
      { x: drawX, y: drawY, width: scaledSize, height: scaledSize });
  }

  /** Draw a large semi-transparent portrait centered on canvas during ending phase. */
  drawEndingPortrait(alpha: number, portraitTexture: TextureAsset): void {
    if (alpha <= 0) return;
    // Layer order: dark filter BELOW, portrait ABOVE (no frame on top)
    // 1. Draw semi-transparent dark overlay on full canvas to darken background
    const darkenBrush = new SolidBrush(new Color(0.03, 0.05, 0.08, 1 - alpha));
    this.builder.drawRect(darkenBrush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    // 2. Draw portrait centered on top of the darkened background
    const size = CANVAS_WIDTH * 0.65;
    const x = (CANVAS_WIDTH - size) / 2;
    const y = (CANVAS_HEIGHT - size) / 2 - 40; // Slightly above center
    const portraitBrush = new ImageBrush(portraitTexture);
    this.builder.drawRect(portraitBrush, null, { x, y, width: size, height: size });
  }

  /** Draw expanding + fading character ripples (same technique as splash ripples).
   *  Positioned at the middle of the portrait (water line). */
  drawCharacterRipples(ripples: SplashRipple[], portraitAlpha: number): void {
    if (portraitAlpha <= 0) return;
    for (const ripple of ripples) {
      if (ripple.alpha <= 0 || ripple.radius <= 0) continue;
      const effectiveAlpha = ripple.alpha * portraitAlpha * 0.6;
      const rippleBrush = new SolidBrush(new Color(0.78, 0.88, 1.0, effectiveAlpha));
      const ripplePen = new Pen(rippleBrush, 1.5);
      this.builder.drawEllipse(null, ripplePen,
        { x: ripple.x, y: ripple.y },
        { x: ripple.radius, y: ripple.radius * CHAR_RIPPLE_Y_SQUISH });
    }
  }


  drawCastFishingLine(floaterX: number, floaterY: number, flightProgress: number, usePOV: boolean = false, overrideStartX?: number, overrideStartY?: number, time: number = 0): void {
    // Choose line origin based on animation style (or use override for title screen)
    const startX = overrideStartX ?? (usePOV ? POV_LINE_START_X : LINE_START_X);
    const startY = overrideStartY ?? (usePOV ? POV_LINE_START_Y : LINE_START_Y);

    // Calculate midpoint
    const midX = (startX + floaterX) / 2;
    const midY = (startY + floaterY) / 2;

    // Horizontal distance determines sag amount
    const dx = floaterX - startX;
    const dy = floaterY - startY;

    // Control point: sag proportional to distance, adjusted by flight progress
    // During flight (flightProgress < 1.0): "rope lag" model — large sag early (slack line),
    // gradually becoming taut as the float reaches its landing spot.
    // Sag direction is DOWNWARD (positive Y in canvas coords) to simulate gravity on slack line.
    let sagFactor: number;
    let sagDown: boolean; // true = sag downward (flight), false = sag upward (resting)
    if (flightProgress < 0.3) {
      // Early flight: heavy slack — line hangs loose behind the float
      sagFactor = 0.4 + (1 - flightProgress * 3.33) * 0.3;
      sagDown = true;
    } else if (flightProgress < 0.7) {
      // Mid flight: reducing sag as line catches up
      sagFactor = 0.4 * (1 - (flightProgress - 0.3) * 2.5);
      sagDown = true;
    } else if (flightProgress < 1.0) {
      // Late flight: nearly taut, minimal sag
      sagFactor = 0.1 * (1 - (flightProgress - 0.7) * 3.33);
      sagDown = true;
    } else {
      // Resting state (flightProgress >= 1.0): gentle upward sag (original behavior)
      sagFactor = 0.15;
      sagDown = false;
    }

    const controlX = midX + Math.abs(dy) * 0.05;
    // Flip sag direction: downward during flight (+ in canvas), upward at rest (-)
    const controlY = sagDown
      ? midY + Math.abs(dx) * sagFactor
      : midY - Math.abs(dx) * sagFactor;

    // Connect line to top center of float (where the brass ring is) instead of center
    const lineEndY = floaterY - FLOAT_HEIGHT / 2 + 5;

    // --- Wind effect: sample points along the base Bézier, apply sinusoidal displacement ---
    const NUM_WIND_POINTS = 8;
    // Wind amplitude depends on flight phase: strong early (loose rope), minimal when taut
    const baseWindAmplitude = flightProgress < 1.0
      ? 3.0 * (1 - flightProgress) * (1 - flightProgress) + 1.0
      : 3.0;
    const WIND_SPEED = 1.8;      // Oscillation speed
    const WIND_WAVE_LENGTH = 2.5; // Spatial frequency along the line

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= NUM_WIND_POINTS; i++) {
      const t = i / NUM_WIND_POINTS;
      // Quadratic Bézier: B(t) = (1-t)²·P0 + 2·(1-t)·t·P1 + t²·P2
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * floaterX;
      const by = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * lineEndY;

      // Wind displacement: strongest in the middle, zero at endpoints
      const windEnvelope = Math.sin(t * Math.PI); // 0 at ends, 1 at middle
      // Primary wave + second harmonic for more organic movement
      const primaryWave = Math.sin(time * WIND_SPEED + t * WIND_WAVE_LENGTH * Math.PI);
      const secondHarmonic = Math.sin(time * WIND_SPEED * 1.7 + t * WIND_WAVE_LENGTH * Math.PI * 2) * 0.3;
      const windOffset = (primaryWave + secondHarmonic) * baseWindAmplitude * windEnvelope;

      points.push({ x: bx + windOffset, y: by + windOffset * 0.3 });
    }

    // Draw as Catmull-Rom spline for smooth curve through wind-displaced points
    const tension = 0.5;
    let pathData = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      pathData += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    this.builder.drawPath(null, this.linePen, pathData);
  }

  drawFloatAt(x: number, y: number, inWater: boolean = false): void {
    const halfW = FLOAT_WIDTH / 2;
    const halfH = FLOAT_HEIGHT / 2;
    this.builder.drawRect(this.floatBrush, null,
      { x: x - halfW, y: y - halfH, width: FLOAT_WIDTH, height: FLOAT_HEIGHT });

    // Overlay a water submersion gradient when the float is resting in water
    if (inWater) {
      this.drawWaterGradientOverlay(x - halfW, y - halfH, FLOAT_WIDTH, FLOAT_HEIGHT);
    }
  }

  /** Draw float at position with scale (for POV depth effect) and optional rotation */
  drawFloatAtScaled(x: number, y: number, scale: number, inWater: boolean = false, rotation: number = 0): void {
    if (scale <= 0.01) return;
    const scaledW = FLOAT_WIDTH * scale;
    const scaledH = FLOAT_HEIGHT * scale;

    if (rotation !== 0) {
      // Use transform stack for rotation: translate to center, rotate, draw offset
      this.builder.pushTranslate({ x, y });
      this.builder.pushRotate(rotation, { x: 0, y: 0 });
      this.builder.drawRect(this.floatBrush, null,
        { x: -scaledW / 2, y: -scaledH / 2, width: scaledW, height: scaledH });
      if (inWater) {
        this.drawWaterGradientOverlay(-scaledW / 2, -scaledH / 2, scaledW, scaledH);
      }
      this.builder.pop(); // rotate
      this.builder.pop(); // translate
    } else {
      this.builder.drawRect(this.floatBrush, null,
        { x: x - scaledW / 2, y: y - scaledH / 2, width: scaledW, height: scaledH });
      if (inWater) {
        this.drawWaterGradientOverlay(x - scaledW / 2, y - scaledH / 2, scaledW, scaledH);
      }
    }
  }

  /** Draw a vertical gradient overlay to simulate the lower portion of the float being submerged.
   *  Top is fully transparent, bottom fades to a semi-transparent blue-white. */
  private drawWaterGradientOverlay(rectX: number, rectY: number, width: number, height: number): void {
    // was ugly
  }

  drawSplashRipples(ripples: SplashRipple[]): void {
    for (const ripple of ripples) {
      if (ripple.alpha <= 0 || ripple.radius <= 0) continue;
      const rippleBrush = new SolidBrush(new Color(1, 1, 1, ripple.alpha * 0.5));
      const ripplePen = new Pen(rippleBrush, 2);
      this.builder.drawEllipse(null, ripplePen,
        { x: ripple.x, y: ripple.y }, { x: ripple.radius, y: ripple.radius * 0.4 });
    }
  }

  drawPowerGauge(power: number): void {
    const bgBrush = new SolidBrush(Color.fromHex(COLOR_GAUGE_BG));
    this.builder.drawRoundRect(bgBrush, null,
      { x: GAUGE_X, y: GAUGE_Y, width: GAUGE_WIDTH, height: GAUGE_HEIGHT },
      { x: GAUGE_BORDER_RADIUS, y: GAUGE_BORDER_RADIUS });

    const borderBrush = new SolidBrush(Color.fromHex(COLOR_GAUGE_BORDER));
    const borderPen = new Pen(borderBrush, 1.5);
    this.builder.drawRoundRect(null, borderPen,
      { x: GAUGE_X, y: GAUGE_Y, width: GAUGE_WIDTH, height: GAUGE_HEIGHT },
      { x: GAUGE_BORDER_RADIUS, y: GAUGE_BORDER_RADIUS });

    const fillHeight = (power / 100) * (GAUGE_HEIGHT - 8);
    if (fillHeight > 0) {
      const fillBrush = new SolidBrush(Color.fromHex(COLOR_GAUGE_FILL));
      const fillY = GAUGE_Y + GAUGE_HEIGHT - 4 - fillHeight;
      this.builder.drawRect(fillBrush, null,
        { x: GAUGE_X + 4, y: fillY, width: GAUGE_WIDTH - 8, height: fillHeight });
    }

    const indicatorY = GAUGE_Y + GAUGE_HEIGHT - 4 - (power / 100) * (GAUGE_HEIGHT - 8) - GAUGE_INDICATOR_HEIGHT / 2;
    const indicatorBrush = new SolidBrush(Color.fromHex(COLOR_GAUGE_INDICATOR));
    this.builder.drawRoundRect(indicatorBrush, null,
      { x: GAUGE_X - 4, y: indicatorY, width: GAUGE_WIDTH + 8, height: GAUGE_INDICATOR_HEIGHT },
      { x: 3, y: 3 });

    const labelBrush = new SolidBrush(new Color(1, 1, 1, 0.7));
    const labelFont = new Font(FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);
    this.builder.drawText('POWER',
      { x: GAUGE_X - 10, y: GAUGE_Y - 22, width: GAUGE_WIDTH + 20, height: 18 },
      11, labelBrush, labelFont, { textAlignment: DrawTextAlignment.Center });
  }



  /** Draw 3D segmented fishing line projected to 2D screen space.
   *  Uses Catmull-Rom spline interpolation for a smooth, natural curve.
   *  The first few points are always clamped/interpolated off-screen
   *  to ensure the line origin never appears on-screen during the rod animation. */
  drawSegmentedLine3D(segments3D: Vec3D[], project: (v: Vec3D) => { x: number; y: number; scale: number }): void {
    if (segments3D.length < 2) return;

    // Project all segment points to 2D
    const projected: { x: number; y: number; scale: number }[] = [];
    for (let i = 0; i < segments3D.length; i++) {
      projected.push(project(segments3D[i]));
    }

    // FIX Issue 1: Force first point to off-screen anchor AND smoothly
    // interpolate early points to prevent visible "cluster" near rod tip.
    // This ensures the line appears to enter the canvas smoothly from off-screen.
    const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
    projected[0] = { x: anchor.x, y: anchor.y, scale: projected[0].scale };

    // Lerp points 1 and 2 toward the anchor to create a smooth entry direction
    // (prevents the line from kinking back toward the rod tip's on-screen projection)
    const fadeCount = Math.min(3, projected.length - 1); // How many points to blend
    for (let i = 1; i < fadeCount; i++) {
      const t = 1 - (i / fadeCount); // 1 at index 1, decreasing toward 0
      const blendFactor = t * 0.6; // Blend 60% at index 1, 30% at index 2
      projected[i] = {
        x: projected[i].x + (anchor.x - projected[i].x) * blendFactor,
        y: projected[i].y + (anchor.y - projected[i].y) * blendFactor,
        scale: projected[i].scale,
      };
    }

    // Build a smooth SVG path using Catmull-Rom to cubic Bézier conversion
    // Average scale for line appearance
    let totalScale = 0;
    for (let i = 0; i < projected.length; i++) {
      totalScale += projected[i].scale;
    }
    const avgScale = totalScale / projected.length;
    const thickness = Math.max(0.8, 1.8 * avgScale);
    const alpha = Math.min(0.75, 0.35 + avgScale * 0.3);

    if (projected.length === 2) {
      // Only 2 points: draw a simple line
      const segBrush = new SolidBrush(new Color(0.78, 0.85, 0.91, alpha));
      const segPen = new Pen(segBrush, thickness);
      this.builder.drawLine(segPen, { x: projected[0].x, y: projected[0].y }, { x: projected[1].x, y: projected[1].y });
      return;
    }

    // Build smooth path using Catmull-Rom spline converted to cubic Bézier curves
    const tension = 0.5; // Controls curve tightness (0 = sharp, 1 = very smooth)
    let pathData = `M ${projected[0].x.toFixed(1)} ${projected[0].y.toFixed(1)}`;

    for (let i = 0; i < projected.length - 1; i++) {
      // Get 4 control points for Catmull-Rom (clamping at boundaries)
      const p0 = projected[Math.max(0, i - 1)];
      const p1 = projected[i];
      const p2 = projected[i + 1];
      const p3 = projected[Math.min(projected.length - 1, i + 2)];

      // Convert Catmull-Rom segment to cubic Bézier control points
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      pathData += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const segBrush = new SolidBrush(new Color(0.78, 0.85, 0.91, alpha));
    const segPen = new Pen(segBrush, thickness);
    this.builder.drawPath(null, segPen, pathData);
  }

  /** Draw a transitioning fishing line that lerps from a snapshot of 2D points
   *  toward the resting Bézier curve shape. Used during FloatLanded phase to smoothly
   *  bridge the 3D physics line into the static resting line.
   *  @param snapshot Array of {x, y} points captured at the moment of landing
   *  @param targetX Final float X position
   *  @param targetY Final float Y position
   *  @param progress 0..1 lerp progress (0 = snapshot, 1 = resting curve)
   *  @param usePOV Whether to use POV line origin
   */
  drawTransitionLine(snapshot: { x: number; y: number }[], targetX: number, targetY: number, progress: number, usePOV: boolean): void {
    if (snapshot.length < 2) {
      // Fallback: just draw the resting line
      this.drawCastFishingLine(targetX, targetY, 1.0, usePOV);
      return;
    }

    // Ease-out progress for more natural settling
    const easedT = 1 - Math.pow(1 - progress, 2);

    // Sample N evenly-spaced points along the resting Bézier curve
    const startX = usePOV ? POV_LINE_START_X : LINE_START_X;
    const startY = usePOV ? POV_LINE_START_Y : LINE_START_Y;

    // Connect line to top center of float (brass ring) instead of center
    const lineEndY = targetY - FLOAT_HEIGHT / 2 + 5;

    // Resting Bézier control point (same math as drawCastFishingLine with flightProgress=1.0)
    const midX = (startX + targetX) / 2;
    const midY = (startY + lineEndY) / 2;
    const dx = targetX - startX;
    const dy = lineEndY - startY;
    const sagFactor = 0.15;
    const controlX = midX + Math.abs(dy) * 0.05;
    const controlY = midY - Math.abs(dx) * sagFactor;

    // Generate resting curve points matching snapshot count
    const numPoints = snapshot.length;
    const restingPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      // Quadratic Bézier: B(t) = (1-t)²·P0 + 2·(1-t)·t·P1 + t²·P2
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * targetX;
      const by = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * lineEndY;
      restingPoints.push({ x: bx, y: by });
    }

    // Lerp each snapshot point toward the corresponding resting point
    const lerpedPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const sx = snapshot[i].x;
      const sy = snapshot[i].y;
      const rx = restingPoints[i].x;
      const ry = restingPoints[i].y;
      lerpedPoints.push({
        x: sx + (rx - sx) * easedT,
        y: sy + (ry - sy) * easedT,
      });
    }

    // Draw the lerped points as a Catmull-Rom spline (same as drawSegmentedLine3D)
    if (lerpedPoints.length === 2) {
      this.builder.drawLine(this.linePen,
        { x: lerpedPoints[0].x, y: lerpedPoints[0].y },
        { x: lerpedPoints[1].x, y: lerpedPoints[1].y });
      return;
    }

    const tension = 0.5;
    let pathData = `M ${lerpedPoints[0].x.toFixed(1)} ${lerpedPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < lerpedPoints.length - 1; i++) {
      const p0 = lerpedPoints[Math.max(0, i - 1)];
      const p1 = lerpedPoints[i];
      const p2 = lerpedPoints[i + 1];
      const p3 = lerpedPoints[Math.min(lerpedPoints.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      pathData += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    this.builder.drawPath(null, this.linePen, pathData);
  }



  /**
   * Draw floating emotion icons with dynamic bounce-in and fade-out animation.
   * Position: centered above the fish portrait area.
   * Fade-out uses scale-down + float-up instead of dark overlay to avoid black background.
   */
  drawFloatingEmotionIcons(icons: FloatingEmotionIcon[]): void {
    if (icons.length === 0) return;

    for (const icon of icons) {
      const texture = getEmotionIconTexture(icon.type);
      if (!texture) continue;
      if (icon.alpha <= 0 || icon.scale <= 0.01) continue;

      const sizeMultiplier = icon.anchor === 'float' ? 0.5 : 1.0;
      const finalSize = EMOTION_ICON_SIZE * icon.scale * sizeMultiplier;
      const finalHalf = finalSize / 2;

      // Calculate rotation wobble during bounce-in
      const elapsed = icon.maxDuration - icon.timer;
      let rotation = 0;
      if (elapsed < EMOTION_ICON_BOUNCE_TIME) {
        const t = elapsed / EMOTION_ICON_BOUNCE_TIME;
        // Wobble: 0° → 8° → -5° → 2° → 0°
        if (t < 0.25) {
          rotation = (t / 0.25) * 8;
        } else if (t < 0.5) {
          rotation = 8 - ((t - 0.25) / 0.25) * 13; // 8 → -5
        } else if (t < 0.75) {
          rotation = -5 + ((t - 0.5) / 0.25) * 7; // -5 → 2
        } else {
          rotation = 2 - ((t - 0.75) / 0.25) * 2; // 2 → 0
        }
      }

      // Draw icon with transform stack (translate + rotate + scale centered)
      const brush = new ImageBrush(texture);
      this.builder.pushTranslate({ x: icon.x, y: icon.y });
      if (rotation !== 0) {
        this.builder.pushRotate(rotation, { x: 0, y: 0 });
      }
      this.builder.drawRect(brush, null, { x: -finalHalf, y: -finalHalf, width: finalSize, height: finalSize });
      if (rotation !== 0) {
        this.builder.pop(); // rotate
      }
      this.builder.pop(); // translate
    }
  }

  /**
   * Draw a bezier curve trajectory preview during cast aiming.
   * Shows where the cast will land based on distance (0..1) and xOffset (-1..1).
   * Curve goes from rod tip (bottom) to the landing point (upper pond area).
   * If landingX/landingY are provided, they override the geometric endpoint with
   * the physics-simulated landing position for accurate preview.
   */
  drawCastTrajectoryBezier(distance: number, xOffset: number, landingX?: number, landingY?: number): void {
    if (distance < 0) return;

    // Start point: rod tip at bottom center
    const startX = CAST_TRAJ_START_X;
    const startY = CAST_TRAJ_START_Y;

    // End point: use physics landing if provided, otherwise geometric fallback
    let endX: number;
    let endY: number;
    if (landingX !== undefined && landingY !== undefined) {
      endX = landingX;
      endY = landingY;
    } else {
      const centerX = CANVAS_WIDTH / 2;
      const xRange = (CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X) / 2;
      const rawEndX = centerX + xOffset * xRange;
      endX = Math.max(CAST_TRAJ_LANDING_MIN_X, Math.min(CAST_TRAJ_LANDING_MAX_X, rawEndX));
      endY = CAST_TRAJ_LANDING_NEAR_Y + distance * (CAST_TRAJ_LANDING_FAR_Y - CAST_TRAJ_LANDING_NEAR_Y);
    }

    // Control point: midpoint X shifted proportionally with endX, elevated above midpoint Y for arc
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const ctrlX = midX;
    const ctrlY = midY + CAST_TRAJ_CTRL_OFFSET_Y * (0.5 + distance * 0.5);

    // Draw the quadratic bezier curve as SVG path
    const pathData = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;

    const trajBrush = new LinearGradientBrush(
      { x: startX, y: startY },
      { x: endX, y: endY },
      [
        { offset: 0, color: new Color(CAST_TRAJ_LINE_COLOR_R, CAST_TRAJ_LINE_COLOR_G, CAST_TRAJ_LINE_COLOR_B, CAST_TRAJ_LINE_ALPHA) },
        { offset: 1, color: new Color(CAST_TRAJ_LINE_COLOR_R, CAST_TRAJ_LINE_COLOR_G, CAST_TRAJ_LINE_COLOR_B, CAST_TRAJ_LINE_ALPHA) },
      ]
    );
    const trajPen = new Pen(trajBrush, CAST_TRAJ_LINE_WIDTH);
    this.builder.drawPath(null, trajPen, pathData);

    // Draw landing target dot
    const dotBrush = new SolidBrush(new Color(
      CAST_TRAJ_LINE_COLOR_R, CAST_TRAJ_LINE_COLOR_G,
      CAST_TRAJ_LINE_COLOR_B, CAST_TRAJ_DOT_ALPHA
    ));
    this.builder.drawEllipse(dotBrush, null,
      { x: endX, y: endY },
      { x: CAST_TRAJ_DOT_RADIUS, y: CAST_TRAJ_DOT_RADIUS * 0.5 });
  }

  /** Draw semi-transparent colored rectangles showing NEAR/MID/FAR cast zones */
  public drawDebugZoneOverlay(): void {
    const x = CAST_TRAJ_LANDING_MIN_X;
    const width = CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X;

    // NEAR zone (green) — bottom of range (high Y = near shore)
    const nearBrush = new SolidBrush(new Color(0, 1, 0, 0.2));
    const nearY = ZONE_NEAR_BOTTOM_Y;
    const nearH = ZONE_NEAR_TOP_Y - ZONE_NEAR_BOTTOM_Y;
    this.builder.drawRect(nearBrush, null, { x, y: nearY, width, height: nearH });

    // MID zone (yellow)
    const midBrush = new SolidBrush(new Color(1, 1, 0, 0.2));
    const midY = ZONE_MID_BOTTOM_Y;
    const midH = ZONE_NEAR_BOTTOM_Y - ZONE_MID_BOTTOM_Y;
    this.builder.drawRect(midBrush, null, { x, y: midY, width, height: midH });

    // FAR zone (red) — top of range (low Y = far from shore)
    const farBrush = new SolidBrush(new Color(1, 0, 0, 0.2));
    const farY = ZONE_FAR_BOTTOM_Y;
    const farH = ZONE_MID_BOTTOM_Y - ZONE_FAR_BOTTOM_Y;
    this.builder.drawRect(farBrush, null, { x, y: farY, width, height: farH });

    // Labels
    const labelBrush = new SolidBrush(new Color(1, 1, 1, 0.8));
    const labelFont = new Font(FontFamily.Roboto, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);
    const labelW = width;
    const labelH = 20;

    this.builder.drawText('NEAR', { x, y: nearY + nearH / 2 - labelH / 2, width: labelW, height: labelH },
      14, labelBrush, labelFont, { textAlignment: DrawTextAlignment.Center });

    this.builder.drawText('MID', { x, y: midY + midH / 2 - labelH / 2, width: labelW, height: labelH },
      14, labelBrush, labelFont, { textAlignment: DrawTextAlignment.Center });

    this.builder.drawText('FAR', { x, y: farY + farH / 2 - labelH / 2, width: labelW, height: labelH },
      14, labelBrush, labelFont, { textAlignment: DrawTextAlignment.Center });
  }
}
