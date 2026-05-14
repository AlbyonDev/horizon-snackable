// Arena Vermin — Gas Cloud System (Milestone 4)
// Handles Gas Rat clouds: spawning, aging, hero damage ticks, and rendering.
// Bounded arena: uses direct distance (no wrapping).

import type { GasCloudState } from './Types';
import type { CameraState } from './Types';
import type { DrawingCommandsBuilder } from 'meta/worlds';
import { SolidBrush, Color } from 'meta/worlds';
import {
  GAS_CLOUD_COLOR, GAS_CLOUD_OPACITY, GAS_CLOUD_TICK_INTERVAL,
  CANVAS_W, CANVAS_H, PIXELS_PER_UNIT,
} from './Constants';
import { worldToScreen } from './IsoRenderer';

export interface GasCloudDamageEvent {
  damage: number;
}

/** Spawn a gas cloud at the given world position. */
export function spawnGasCloud(
  clouds: GasCloudState[],
  x: number,
  y: number,
  radius: number,
  damage: number,
  duration: number
): void {
  clouds.push({
    x, y,
    age: 0,
    maxAge: duration,
    radius,
    damage,
    lastTickTime: -10,
  });
}

/** Update gas clouds: age them, check hero collision, return damage events. */
export function updateGasClouds(
  clouds: GasCloudState[],
  dt: number,
  heroX: number,
  heroY: number,
  currentTime: number
): GasCloudDamageEvent[] {
  const events: GasCloudDamageEvent[] = [];

  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.age += dt;

    // Remove expired
    if (c.age >= c.maxAge) {
      clouds.splice(i, 1);
      continue;
    }

    // Check if hero is inside cloud radius (direct distance, no wrapping)
    const dx = c.x - heroX;
    const dy = c.y - heroY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < c.radius) {
      // Tick-based damage (same interval as contact damage)
      if (currentTime - c.lastTickTime >= GAS_CLOUD_TICK_INTERVAL) {
        c.lastTickTime = currentTime;
        events.push({ damage: c.damage });
      }
    }
  }

  return events;
}

// Gas cloud sub-circle color tones (module-level for reuse)
const GAS_TONES = ['#60FF40', '#40C030', '#80FF60', '#50E030', '#70FF50'];

/** Draw gas clouds on DrawingSurface with layered atmospheric effect. */
export function drawGasClouds(
  builder: DrawingCommandsBuilder,
  clouds: GasCloudState[],
  camera: CameraState,
  heroX: number,
  heroY: number
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const SUB_CIRCLES = 5;

  for (const c of clouds) {
    // Direct world-to-screen (no wrapping)
    const { sx, sy } = worldToScreen(c.x, c.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -150 || screenX > CANVAS_W + 150 || screenY < -150 || screenY > CANVAS_H + 150) continue;

    // Compute base opacity (fade out in last 1 second)
    let baseOpacity = GAS_CLOUD_OPACITY;
    const remaining = c.maxAge - c.age;
    if (remaining < 1.0) {
      baseOpacity *= remaining;
    }

    // Pulse the overall radius slightly
    const radiusPx = c.radius * PIXELS_PER_UNIT * (1.0 + 0.08 * Math.sin(c.age * 2.5));

    // Draw multiple overlapping sub-circles with animated wobble
    for (let i = 0; i < SUB_CIRCLES; i++) {
      // Deterministic offset based on index and age (no Math.random)
      const angleOffset = (i / SUB_CIRCLES) * Math.PI * 2;
      const wobbleX = Math.sin(c.age * 1.8 + angleOffset) * radiusPx * 0.25;
      const wobbleY = Math.cos(c.age * 1.4 + angleOffset * 1.3) * radiusPx * 0.2;

      // Inner circles are more opaque, outer are more transparent
      const distFactor = 0.6 + 0.4 * (i / (SUB_CIRCLES - 1));
      const subOpacity = baseOpacity * (1.3 - distFactor * 0.6);
      const subRadius = radiusPx * (0.5 + distFactor * 0.4);

      const tone = Color.fromHex(GAS_TONES[i % GAS_TONES.length]);
      const brush = new SolidBrush(new Color(tone.r, tone.g, tone.b, subOpacity));
      builder.drawEllipse(brush, null,
        {x: screenX + wobbleX, y: screenY + wobbleY},
        {x: subRadius, y: subRadius * 0.85});
    }

    // Central bright core
    const coreOpacity = baseOpacity * 0.6;
    const coreBrush = new SolidBrush(new Color(0.5, 1.0, 0.3, coreOpacity));
    builder.drawEllipse(coreBrush, null,
      {x: screenX, y: screenY},
      {x: radiusPx * 0.3, y: radiusPx * 0.25});
  }
}
