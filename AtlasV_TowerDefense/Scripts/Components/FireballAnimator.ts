/**
 * FireballAnimator — Pulsing scale + continuous Y-rotation for the Fireball enemy.
 *
 * Component Attachment: Spawned Enemy entity (the mesh child "Fireball" inside EnemyFireball template)
 * Component Networking: Local (purely visual, no networked state)
 * Component Ownership: Not Networked — visual effect only, runs wherever the entity exists
 *
 * Provides a pulsing scale (sin-wave oscillation) and continuous Y-axis rotation
 * to give the fireball a dynamic, alive feeling without skeletal animation.
 */
import { Component, TransformComponent, Vec3, Quaternion } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe } from 'meta/worlds';

// Pulse parameters
const PULSE_FREQUENCY = 3.0; // oscillations per second
const PULSE_AMPLITUDE = 0.1; // scale range: baseScale * (1 ± amplitude)
const ROTATION_SPEED = 180; // degrees per second around Y axis

@component()
export class FireballAnimator extends Component {
  private _transform: Maybe<TransformComponent> = null;
  private _baseScale: number = 1;
  private _elapsed: number = 0;
  private _rotationAngle: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._transform = this.entity.getComponent(TransformComponent);
    if (this._transform) {
      this._baseScale = this._transform.localScale.x;
    }
    // Randomize starting phase so multiple fireballs aren't synchronized
    this._elapsed = Math.random() * 6.28;
    this._rotationAngle = Math.random() * 360;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._transform) return;

    const dt = payload.deltaTime;
    this._elapsed += dt;
    this._rotationAngle += ROTATION_SPEED * dt;

    // Pulsing scale (sin wave between 0.9 and 1.1 of base scale)
    const scaleFactor = this._baseScale * (1 + PULSE_AMPLITUDE * Math.sin(this._elapsed * PULSE_FREQUENCY * 2 * Math.PI));
    this._transform.localScale = new Vec3(scaleFactor, scaleFactor, scaleFactor);

    // Continuous Y-axis rotation
    this._transform.localRotation = Quaternion.fromEuler(new Vec3(0, this._rotationAngle % 360, 0));
  }
}
