/**
 * GameManager — Tick loop only.
 *
 * All gameplay logic lives in autonomous services. This component:
 *   - Forces service singletons to instantiate (constructor injection)
 *   - Fires Events.Tick at TICK_INTERVAL for services that need a heartbeat
 */
import {
  Component,
  OnEntityStartEvent, OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  NetworkingService, EventService,
  ExecuteOn, Service, component, subscribe,
} from 'meta/worlds';
import { TICK_INTERVAL } from './Constants';
import { Events } from './Types';
import { ResourceService } from './Services/ResourceService';
import { ActionService } from './Services/ActionService';
import { GeneratorService } from './Services/GeneratorService';
import { FrenzyService } from './Services/FrenzyService';
import { CritService } from './Services/CritService';
import { InterestService } from './Services/InterestService';
import { TapService } from './Services/TapService';
import { VaultService } from './Services/VaultService';

@component()
export class GameManager extends Component {

  // Force service availability on construction
  private services: Service[] = [
    ResourceService.get(),
    ActionService.get(),
    GeneratorService.get(),
    FrenzyService.get(),
    CritService.get(),
    InterestService.get(),
    TapService.get(),
    VaultService.get(),
  ];
  private _network  : NetworkingService = NetworkingService.get();
  private _tickAccum: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._network.isServerContext()) return;
    // Services declared their actions in onReady but ActionService only
    // populates its registry on subsequent ResourceChanged/StatsChanged.
    // Force one refresh now so the shop is populated before the first tap.
    ActionService.get().refreshDeclared();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    this._tickAccum += p.deltaTime;
    if (this._tickAccum >= TICK_INTERVAL) {
      EventService.sendLocally(Events.Tick, { dt: this._tickAccum });
      this._tickAccum = 0;
    }
  }
}
