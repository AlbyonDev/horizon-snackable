import {
  Component, component, subscribe,
  OnEntityStartEvent, OnWorldUpdateEvent,
  ExecuteOn, NetworkingService, TransformComponent,
  property, Vec3, Quaternion,
} from 'meta/worlds';
import type { Maybe, OnWorldUpdateEventPayload, Entity } from 'meta/worlds';
import { TruckService, TruckPhase } from '../Services/TruckService';
import type { ITruckData } from '../Services/TruckService';
import {
  TRUCK_LOADING_X, TRUCK_OFFSCREEN_RIGHT_X, TRUCK_OFFSCREEN_LEFT_X,
} from '../Constants';

@component({ description: 'Visual truck controller — position, lane, rotation, cargo' })
export class TruckController extends Component {
  @property() truckIndex: number = 0;
  @property() cargoEntity: Maybe<Entity> = null;

  // Set Y/Z to match your scene geometry; X is driven by TRUCK_LOADING_X constant.
  @property() loadingPosition: Vec3 = new Vec3(TRUCK_LOADING_X, 0, 0);

  @property() bottomLaneZ: number     = -3.2;
  @property() topLaneZ: number        = -3.7;
  @property() offScreenRightX: number = TRUCK_OFFSCREEN_RIGHT_X;
  @property() offScreenLeftX: number  = TRUCK_OFFSCREEN_LEFT_X;

  private _networkingService: NetworkingService = NetworkingService.get();
  private _truckService: TruckService = TruckService.get();
  private _transform: Maybe<TransformComponent> = null;
  private _cargoTransforms: TransformComponent[] = [];

  private static readonly CARGO_BOUNCE_DURATION = 0.4;
  private static readonly HIDDEN_SCALE = new Vec3(0.001, 0.001, 0.001);

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent);
    if (!this._transform) {
      console.error('[TruckController] TransformComponent missing');
      return;
    }

    // Collect cargo child transforms
    if (this.cargoEntity) {
      const children = this.cargoEntity.getChildren() as Entity[];
      for (const child of children) {
        const t = child.getComponent(TransformComponent);
        if (t) this._cargoTransforms.push(t);
      }
    }

    // Snap to correct initial position based on service phase
    const truck = this._truckService.getTrucks()[this.truckIndex];
    this._transform.worldPosition = truck
      ? this._computePosition(truck)
      : this._stagingPos();

    // Hide all cargo initially
    for (const ct of this._cargoTransforms) {
      ct.localScale = TruckController.HIDDEN_SCALE;
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._transform) return;

    const truck = this._truckService.getTrucks()[this.truckIndex];
    if (!truck) return;

    this._transform.worldPosition = this._computePosition(truck);
    this._setRotation(truck);
    this._updateCargo(truck);
  }

  // ---------------------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------------------

  private _computePosition(truck: ITruckData): Vec3 {
    const y     = this.loadingPosition.y;
    const dockZ = this.loadingPosition.z;

    switch (truck.phase) {

      case TruckPhase.Staged:
        return this._stagingPos();

      case TruckPhase.Approaching: {
        const t = truck.approachDuration > 0
          ? Math.min(truck.timer / truck.approachDuration, 1)
          : 1;
        return this._lerp(this._stagingPos(), this.loadingPosition, t);
      }

      case TruckPhase.AtDock:
      case TruckPhase.Loading:
        return new Vec3(this.loadingPosition.x, y, dockZ);

      case TruckPhase.Away: {
        const timer = truck.timer;
        if (timer < truck.travelOutEnd) {
          const t = truck.travelOutEnd > 0 ? timer / truck.travelOutEnd : 1;
          return this._lerp(
            this.loadingPosition,
            new Vec3(this.offScreenRightX, y, this.bottomLaneZ),
            t,
          );
        }
        // Crossing back to staging on upper lane
        const elapsed  = timer - truck.travelOutEnd;
        const duration = truck.awayDuration - truck.travelOutEnd;
        const t        = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
        return this._lerp(
          new Vec3(this.offScreenRightX, y, this.topLaneZ),
          new Vec3(this.offScreenLeftX,  y, this.topLaneZ),
          t,
        );
      }
    }
  }

  /** Off-screen staging position: same X as offScreenLeft, same Y/Z as dock approach lane. */
  private _stagingPos(): Vec3 {
    return new Vec3(this.offScreenLeftX, this.loadingPosition.y, this.bottomLaneZ);
  }

  // ---------------------------------------------------------------------------
  // Rotation
  // ---------------------------------------------------------------------------

  private _setRotation(truck: ITruckData): void {
    const facingLeft = truck.phase === TruckPhase.Away && truck.timer >= truck.travelOutEnd;
    this._transform!.localRotation = Quaternion.fromEuler(
      new Vec3(0, facingLeft ? -90 : 90, 0),
    );
  }

  // ---------------------------------------------------------------------------
  // Cargo visibility + spawn animation
  // ---------------------------------------------------------------------------

  private _updateCargo(truck: ITruckData): void {
    if (this._cargoTransforms.length === 0) return;

    if (truck.phase === TruckPhase.Loading) {
      for (let i = 0; i < this._cargoTransforms.length; i++) {
        if (i < truck.load - 1) {
          // Already loaded — full scale
          this._cargoTransforms[i].localScale = Vec3.one;
        } else if (i === truck.load - 1) {
          // Currently loading — bounce animation
          const t     = Math.min(truck.timer / TruckController.CARGO_BOUNCE_DURATION, 1);
          const scale = this._elasticOut(t);
          this._cargoTransforms[i].localScale = new Vec3(scale, scale, scale);
        } else {
          // Not yet loaded — hidden
          this._cargoTransforms[i].localScale = TruckController.HIDDEN_SCALE;
        }
      }
      return;
    }

    const visible = truck.phase === TruckPhase.Away && truck.timer < truck.travelOutEnd;
    for (let i = 0; i < this._cargoTransforms.length; i++) {
      this._cargoTransforms[i].localScale = (visible && i < truck.load)
        ? Vec3.one
        : TruckController.HIDDEN_SCALE;
    }
  }

  /** Elastic ease-out: 0 → overshoot ~1.25 → settles at 1. */
  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const period = 0.4;
    const shift  = period / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - shift) * (2 * Math.PI) / period) + 1;
  }

  // ---------------------------------------------------------------------------

  private _lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return new Vec3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
    );
  }
}
