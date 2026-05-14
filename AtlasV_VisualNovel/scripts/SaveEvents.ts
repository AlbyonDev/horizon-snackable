/**
 * SaveEvents — NetworkEvent definitions for persistent save communication.
 * These bridge client (game logic) and server (PlayerVariablesService).
 */

import { NetworkEvent } from 'meta/worlds';
import { serializable, property } from 'meta/platform_api';

/** Server → Client: loaded save data from PlayerVariablesService */
@serializable()
export class SaveDataLoadedPayload {
  @property({maxLength: 10000})
  readonly data: string = '';
}
export const OnSaveDataLoaded = new NetworkEvent('FloaterSaveDataLoaded', SaveDataLoadedPayload);

/** Client → Server: request to persist save data */
@serializable()
export class SaveDataRequestPayload {
  @property({maxLength: 10000})
  readonly data: string = '';
}
export const OnSaveDataRequested = new NetworkEvent('FloaterSaveDataRequested', SaveDataRequestPayload);

/** Client → Server: request to clear all save data */
@serializable()
export class ResetSavePayload {
  @property()
  readonly confirm: boolean = false;
}
export const OnResetSaveRequested = new NetworkEvent('FloaterResetSaveRequested', ResetSavePayload);

/** Server → Client: confirmation that reset is complete */
@serializable()
export class ResetCompletePayload {
  @property()
  readonly success: boolean = false;
}
export const OnResetComplete = new NetworkEvent('FloaterResetComplete', ResetCompletePayload);

/** Server → Client: loaded CG data from separate PVar */
@serializable()
export class CGDataLoadedPayload {
  @property({maxLength: 10000})
  readonly data: string = '';
}
export const OnCGDataLoaded = new NetworkEvent('FloaterCGDataLoaded', CGDataLoadedPayload);

/** Client → Server: request to persist CG data separately */
@serializable()
export class CGSaveRequestPayload {
  @property({maxLength: 10000})
  readonly data: string = '';
}
export const OnCGSaveRequested = new NetworkEvent('FloaterCGSaveRequested', CGSaveRequestPayload);
