import { CameraService, Vec3 } from 'meta/worlds';

/**
 * Returns the screen aspect ratio (width / height) using CameraService.screenToWorldPoint.
 * Durable API — no provisional dependency.
 *
 * @param depth - Distance from camera for the projection plane. Default 10.
 */
export function getScreenAspectRatio(depth: number = 10): number {
  const camera = CameraService.get();
  const origin = camera.screenToWorldPoint(new Vec3(0, 0, depth));
  const right  = camera.screenToWorldPoint(new Vec3(1, 0, depth));
  const up     = camera.screenToWorldPoint(new Vec3(0, 1, depth));
  return origin.distance(right) / origin.distance(up);
}
