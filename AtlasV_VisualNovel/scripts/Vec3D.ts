/**
 * Vec3D — Simple 3D vector class for cast physics simulation.
 * Used for 3D projectile physics that gets projected to 2D screen space.
 * NOT related to the engine's Vec3 type from meta/worlds.
 */

export class Vec3D {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  add(v: Vec3D): Vec3D {
    return new Vec3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vec3D): Vec3D {
    return new Vec3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3D {
    return new Vec3D(this.x * s, this.y * s, this.z * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vec3D {
    const len = this.length();
    return len > 0 ? this.scale(1 / len) : new Vec3D();
  }

  clone(): Vec3D {
    return new Vec3D(this.x, this.y, this.z);
  }
}
