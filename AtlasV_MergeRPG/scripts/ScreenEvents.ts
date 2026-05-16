/**
 * ScreenEvents.ts
 *
 * Shared LocalEvents for screen transitions and button forwarding in the refactored UI.
 * GameComponent dispatches show/hide events; each screen component subscribes
 * to toggle its own visibility via customUi.isVisible.
 *
 * Button forwarding events: UiEvents are entity-scoped (only reach
 * components on the same entity as the CustomUiComponent). Since
 * GameComponent is on a different entity, each screen component
 * subscribes to its own UiEvents and forwards them via these
 * LocalEvents (which propagate to all entities on the client).
 *
 * All events are LocalEvents (client-side only).
 */
import { LocalEvent } from 'meta/worlds';
import { serializable } from 'meta/platform_api';

// ===== Show events =====
// GameComponent dispatches these after updating the relevant ViewModel.

/** Show the dungeon selection screen */
export const ShowDungeonSelectionEvent = new LocalEvent('PQ_ShowDungeonSelection');

/** Show the dungeon map screen */
export const ShowDungeonMapEvent = new LocalEvent('PQ_ShowDungeonMap');

/** Show the hero collection / roster management screen */
export const ShowHeroCollectionEvent = new LocalEvent('PQ_ShowHeroCollection');

/** Show the victory/defeat result screen */
export const ShowVictoryDefeatEvent = new LocalEvent('PQ_ShowVictoryDefeat');

/** Show the combat board (game_board entity) */
export const ShowCombatBoardEvent = new LocalEvent('PQ_ShowCombatBoard');

// ===== Hide events =====
// Dispatched when leaving a screen.

/** Hide the dungeon selection screen */
export const HideDungeonSelectionEvent = new LocalEvent('PQ_HideDungeonSelection');

/** Hide the dungeon map screen */
export const HideDungeonMapEvent = new LocalEvent('PQ_HideDungeonMap');

/** Hide the hero collection / roster management screen */
export const HideHeroCollectionEvent = new LocalEvent('PQ_HideHeroCollection');

/** Hide the victory/defeat result screen */
export const HideVictoryDefeatEvent = new LocalEvent('PQ_HideVictoryDefeat');

/** Hide the combat board (game_board entity) */
export const HideCombatBoardEvent = new LocalEvent('PQ_HideCombatBoard');

// ===== Button Forwarding Events =====
// UiEvents are entity-scoped. Screen components subscribe to their
// own UiEvents and re-dispatch them as these LocalEvents so
// GameComponent (on a different entity) can handle game logic.

// --- Payload for events that carry a string parameter ---
@serializable()
export class ButtonParamPayload {
  readonly parameter: string = '';
}

// --- Dungeon Selection / Run Start ---
// FwdDungeonSelectEvent kept for the legacy dungeon selection component wiring.
export const FwdDungeonSelectEvent = new LocalEvent('PQ_FwdDungeonSelect', ButtonParamPayload);
export const FwdManageTeamEvent = new LocalEvent('PQ_FwdManageTeam');
/** Fired from the roster screen "Enter Dungeon / Continue Run" button. */
export const FwdStartRunEvent = new LocalEvent('PQ_FwdStartRun');

// --- Dungeon Map ---
export const FwdEnterBattleEvent = new LocalEvent('PQ_FwdEnterBattle');
export const FwdFleeDungeonEvent = new LocalEvent('PQ_FwdFleeDungeon');

// --- Hero Collection ---
export const FwdHeroCardClickedEvent = new LocalEvent('PQ_FwdHeroCardClicked', ButtonParamPayload);
export const FwdHeroCardInfoClickedEvent = new LocalEvent('PQ_FwdHeroCardInfoClicked', ButtonParamPayload);
export const FwdRosterSlotClickedEvent = new LocalEvent('PQ_FwdRosterSlotClicked', ButtonParamPayload);
export const FwdDetailCloseEvent = new LocalEvent('PQ_FwdDetailClose');
export const FwdRosterEnterDungeonEvent = new LocalEvent('PQ_FwdRosterEnterDungeon');
export const FwdRosterBackEvent = new LocalEvent('PQ_FwdRosterBack');

// --- Buy Hero ---
export const FwdBuyCardClickedEvent = new LocalEvent('PQ_FwdBuyCardClicked');
export const FwdBuyConfirmYesEvent = new LocalEvent('PQ_FwdBuyConfirmYes');
export const FwdBuyConfirmNoEvent = new LocalEvent('PQ_FwdBuyConfirmNo');
export const FwdBuyResultCloseEvent = new LocalEvent('PQ_FwdBuyResultClose');

// --- Heal Hero ---
export const FwdHealConfirmYesEvent = new LocalEvent('PQ_FwdHealConfirmYes');
export const FwdHealConfirmNoEvent = new LocalEvent('PQ_FwdHealConfirmNo');

// --- Victory / Defeat ---
export const FwdReturnEvent = new LocalEvent('PQ_FwdReturn');
export const FwdDungeonContinueEvent = new LocalEvent('PQ_FwdDungeonContinue');
export const FwdDungeonExitEvent = new LocalEvent('PQ_FwdDungeonExit');
