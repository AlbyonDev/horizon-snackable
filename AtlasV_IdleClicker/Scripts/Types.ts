/**
 * Types.ts — Single source of truth for all types, interfaces, enums, and events.
 *
 * Rules:
 *   - ZERO imports from sibling files (no circular deps)
 *   - All LocalEvent payloads: every field must have a default value
 *   - Event string IDs must be globally unique — always prefixed with 'Ev'
 */
import { LocalEvent } from 'meta/worlds';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ResourceType {
  Gold = 0,
}

export enum GainSource {
  Tap         = 0,
  Passive     = 1,
  Interest    = 2,
  VaultPayout = 3,
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * An action registered by a system in ActionService.
 * Everything here is display-only — the registering system owns all logic.
 */
export interface IAction {
  id       : string;
  label    : string;
  detail   : string;
  cost     : number;
  isEnabled: boolean;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export namespace Events {

  export class PlayerTapPayload {
    /** True when emitted by the auto-cursor cycle; false for a real player tap. */
    isAuto: boolean = false;
    /** Canvas-space tap position (only meaningful when isAuto = false). */
    tapX?: number = 240;
    tapY?: number = 320;
  }
  export const PlayerTap = new LocalEvent<PlayerTapPayload>('EvPlayerTap', PlayerTapPayload);

  export class ActionTriggeredPayload { id: string = ''; }
  export const ActionTriggered = new LocalEvent<ActionTriggeredPayload>('EvActionTriggered', ActionTriggeredPayload);

  export class ActionRegistryChangedPayload {}
  export const ActionRegistryChanged = new LocalEvent<ActionRegistryChangedPayload>('EvActionRegistryChanged', ActionRegistryChangedPayload);

  export class StatsChangedPayload {}
  export const StatsChanged = new LocalEvent<StatsChangedPayload>('EvStatsChanged', StatsChangedPayload);

  export class ResourceChangedPayload {
    type  : ResourceType = ResourceType.Gold;
    amount: number = 0;
  }
  export const ResourceChanged = new LocalEvent<ResourceChangedPayload>('EvResourceChanged', ResourceChangedPayload);

  export class GainAppliedPayload {
    amount  : number     = 0;
    source  : GainSource = GainSource.Tap;
    isCrit  : boolean    = false;
    isFrenzy: boolean    = false;
  }
  export const GainApplied = new LocalEvent<GainAppliedPayload>('EvGainApplied', GainAppliedPayload);

  export class TickPayload { dt: number = 0; }
  export const Tick = new LocalEvent<TickPayload>('EvTick', TickPayload);

}
