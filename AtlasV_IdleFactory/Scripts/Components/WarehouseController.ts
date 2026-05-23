import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
  NetworkingService,
  TransformComponent,
  EventService,
  property,
  MeshComponent,
} from 'meta/worlds';
import type { Maybe, Entity, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Vec3 } from 'meta/worlds';
import { WarehouseService } from '../Services/WarehouseService';
import { ProductPoolService } from '../Services/ProductPoolService';
import { Events } from '../Types';

const LOG_TAG = '[WarehouseController]';
const PLATFORM_COUNT = 8;
const MAX_PRODUCTS_PER_PLATFORM = 3;
const SPAWN_BOUNCE_DURATION = 0.4;

interface ProductData {
  transform: TransformComponent;
  timer: number;
}

interface PlatformData {
  entity: Entity;
  products: ProductData[];
}

@component({ description: 'Visual controller for warehouse platforms and product stacking' })
export class WarehouseController extends Component {
  @property() platformsParent: Maybe<Entity> = null;

  private _networkingService = NetworkingService.get();
  private _warehouseService: WarehouseService = WarehouseService.get();
  private _poolService:      ProductPoolService = ProductPoolService.get();

  private _platforms: PlatformData[] = [];
  private _activePlatforms: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;

    if (!this.platformsParent) {
      console.error(`${LOG_TAG} platformsParent property not set!`);
      return;
    }

    // Collect all 8 platforms
    const children = this.platformsParent.getChildren() as Entity[];
    if (children.length !== PLATFORM_COUNT) {
      console.warn(`${LOG_TAG} Expected ${PLATFORM_COUNT} platforms, got ${children.length}`);
    }

    this._platforms = children.map((entity: Entity) => ({
      entity,
      products: [],
    }));

    this._updateActivePlatforms();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    this._updateProductAnimations(payload.deltaTime);
  }

  private _updateProductAnimations(dt: number): void {
    for (const platform of this._platforms) {
      for (const product of platform.products) {
        product.timer += dt;
        if (product.timer >= SPAWN_BOUNCE_DURATION) {
          // Animation complete
          product.transform.localScale = Vec3.one;
        } else {
          // Apply bounce animation
          const t = product.timer / SPAWN_BOUNCE_DURATION;
          const scale = this._elasticOut(t);
          product.transform.localScale = new Vec3(scale, scale, scale);
        }
      }
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

  private _updateActivePlatforms(): void {
    const capacity = this._warehouseService.capacity;
    // Each platform holds MAX_PRODUCTS_PER_PLATFORM items, round up to cover full capacity
    this._activePlatforms = Math.min(PLATFORM_COUNT, Math.ceil(capacity / MAX_PRODUCTS_PER_PLATFORM));

    for (let i = 0; i < this._platforms.length; i++) {
      const platform = this._platforms[i];
      const isActive = i < this._activePlatforms;
      const tc = platform.entity.getComponent(TransformComponent);
      if (tc)
      {
        tc.localPosition = new Vec3(tc.localPosition.x, isActive ? 0 : -10, tc.localPosition.z);
      }
      if (!isActive) {
        // Release products from inactive platforms
        for (const product of platform.products) {
          this._poolService.release(product.transform);
        }
        platform.products = [];
      }
    }

    // Redistribute existing products to active platforms
    this._redistributeProducts();
  }

  private _redistributeProducts(): void {
    const totalStock = this._warehouseService.stock;
    if (totalStock === 0 || this._activePlatforms === 0) return;

    // Clear all current visuals
    for (const platform of this._platforms) {
      for (const product of platform.products) {
        this._poolService.release(product.transform);
      }
      platform.products = [];
    }

    // Re-add products evenly across active platforms
    for (let i = 0; i < totalStock; i++) {
      const platformIndex = i % this._activePlatforms;
      this._addProductToPlatform(platformIndex);
    }
  }

  @subscribe(Events.WarehouseProductAdded)
  onProductAdded(_p: Events.WarehouseProductAddedPayload): void {
    if (this._activePlatforms === 0) return;

    // Add to the first platform with space (in order of children)
    for (let i = 0; i < this._activePlatforms; i++) {
      if (this._platforms[i].products.length < MAX_PRODUCTS_PER_PLATFORM) {
        this._addProductToPlatform(i);
        return;
      }
    }
  }

  @subscribe(Events.WarehouseProductRemoved)
  onProductRemoved(p: Events.WarehouseProductRemovedPayload): void {
    // Remove from platforms with the most products first
    for (let i = 0; i < p.count; i++) {
      let maxIndex = -1;
      let maxCount = -1;
      for (let j = 0; j < this._activePlatforms; j++) {
        if (this._platforms[j].products.length > maxCount) {
          maxCount = this._platforms[j].products.length;
          maxIndex = j;
        }
      }
      if (maxIndex >= 0) {
        this._removeProductFromPlatform(maxIndex);
      }
    }
  }

  private _addProductToPlatform(platformIndex: number): void {
    const platform = this._platforms[platformIndex];
    const product = this._poolService.claim();
    if (!product) return;

    const stackHeight = platform.products.length;
    const platformTransform = platform.entity.getComponent(TransformComponent)!;
    const productPos = new Vec3(
      platformTransform.worldPosition.x,
      platformTransform.worldPosition.y + stackHeight * 0.3, // Stack vertically
      platformTransform.worldPosition.z,
    );
    product.worldPosition = productPos;
    product.localScale = new Vec3(0.001, 0.001, 0.001); // Start tiny for animation

    platform.products.push({ transform: product, timer: 0 });
  }

  private _removeProductFromPlatform(platformIndex: number): void {
    const platform = this._platforms[platformIndex];
    if (platform.products.length === 0) return;

    const product = platform.products.pop()!;
    this._poolService.release(product.transform);
  }

  @subscribe(Events.UpgradePurchased)
  onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
    if (p.moduleId === 'warehouse') {
      this._updateActivePlatforms();
    }
  }
}