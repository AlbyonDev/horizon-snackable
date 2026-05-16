/**
 * SaveData.ts
 *
 * Defines the save data structure and NetworkEvents used to communicate
 * between the client-side GameComponent and the server-side SaveManagerComponent.
 *
 * Flow:
 * - Client sends PuzzleSaveRequestEvent globally with serialized save data
 * - Server SaveManagerComponent receives it, persists via PlayerVariablesService
 * - On load: Server fetches data and sends PuzzleLoadCompleteEvent globally
 * - Client GameComponent receives loaded data and restores state
 */
import { serializable, property, NetworkEvent } from 'meta/worlds';

// ===== Save Data Structure (plain interface, serialized as JSON string) =====

/** Per-hero HP entry for serialization */
export interface HeroHpEntry {
  id: string;
  current: number;
  max: number;
}

/** Per-hero XP entry for serialization */
export interface HeroXpEntry {
  id: string;
  xp: number;
  level: number;
}

/** Per-hero death timestamp entry for serialization */
export interface HeroDeathTimestampEntry {
  id: string;
  deathTime: number;
}

/** Complete save data - serialized as a JSON string for PVar storage */
export interface SaveData {
  /** Hero IDs in roster slots (null for empty slots) */
  rosterSlotIds: (string | null)[];
  /** HP state for each hero in the collection */
  heroHpEntries: HeroHpEntry[];
  /** Per-hero XP/level entries */
  heroXpEntries?: HeroXpEntry[];
  /** @deprecated Total accumulated XP (kept for migration from old saves) */
  totalXp: number;
  /** Gold carried across runs */
  gold: number;
  /** Serialized RunRoom[] from EncounterBuilder.serializeRunSequence() — null if no active run */
  activeRunSequence?: string | null;
  /** Room index the player was on when the game was saved */
  activeRunRoomIndex?: number;
  /** Timestamp (Date.now()) when this save was written — used for offline regen calculation */
  lastSaveTimestamp?: number;
  /** Death timestamps for KO'd heroes — used for resurrection timer */
  heroDeathTimestamps?: HeroDeathTimestampEntry[];
  /** IDs of heroes the player has unlocked */
  ownedHeroIds?: string[];
  /** Save version for forward compatibility */
  version: number;
}

export const SAVE_DATA_VERSION = 5;
export const PVAR_SAVE_KEY = 'pq_save_data';

// ===== NetworkEvent Payloads =====

/** Payload for requesting a save (client → server) */
@serializable()
export class PuzzleSaveRequestPayload {
  @property({maxLength: 2000})
  readonly saveJson: string = '';
}

/** Payload for requesting a load (client → server) */
@serializable()
export class PuzzleLoadRequestPayload {
  @property()
  readonly requestId: number = 0;
}

/** Payload for delivering loaded data (server → client) */
@serializable()
export class PuzzleLoadCompletePayload {
  /** Empty string means no save data found (new player) */
  @property({maxLength: 2000})
  readonly saveJson: string = '';

  @property()
  readonly success: boolean = false;
}

// ===== NetworkEvent Definitions =====

export const PuzzleSaveRequestEvent = new NetworkEvent<PuzzleSaveRequestPayload>(
  'PuzzleSaveRequestEvent',
  PuzzleSaveRequestPayload,
);

export const PuzzleLoadRequestEvent = new NetworkEvent<PuzzleLoadRequestPayload>(
  'PuzzleLoadRequestEvent',
  PuzzleLoadRequestPayload,
);

export const PuzzleLoadCompleteEvent = new NetworkEvent<PuzzleLoadCompletePayload>(
  'PuzzleLoadCompleteEvent',
  PuzzleLoadCompletePayload,
);
