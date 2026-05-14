import type { Maybe, TextureAsset } from 'meta/worlds';
import { ActionId } from './Constants';

// === Game States ===
export enum GamePhase {
  Title = 'title',
  LakeIdle = 'lake_idle',
  CastCharging = 'cast_charging',
  RodCasting = 'rod_casting',
  CastFlying = 'cast_flying',
  FloatLanded = 'float_landed',
  FloatBounce = 'float_bounce',
  Approach = 'approach',
  Exchange = 'exchange',
  ActionSelect = 'action_select',
  FishReaction = 'fish_reaction',
  Departure = 'departure',
  Idle = 'idle',
  Ending = 'ending',
  NothingBites = 'nothing_bites',
}

// === Emotion Icon Types ===
export enum EmotionIconType {
  Curiosity = 'curiosity',     // ?
  Surprise = 'surprise',       // !
  Warmth = 'warmth',           // ♥
  Shock = 'shock',             // !!
  Hesitation = 'hesitation',   // …
  Contentment = 'contentment', // ♪
  Sadness = 'sadness',         // 💔
  Boredom = 'boredom',         // 💤
  Delight = 'delight',         // ✦
  None = 'none',               // no icon (dash)
}

// === Floating Emotion Icon (for DrawingSurface rendering) ===
export type EmotionIconAnchor = 'portrait' | 'float';

export interface FloatingEmotionIcon {
  type: EmotionIconType;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  timer: number;
  maxDuration: number;
  anchor: EmotionIconAnchor;
}

// === Ending Types ===
export enum EndingType {
  Reel = 'reel',
  Release = 'release',
  DriftAway = 'drift_away',
}

// === Splash Ripple ===
export interface SplashRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// === Drift States ===
export enum DriftState {
  None = 'none',
  Warm = 'DRIFT_WARM',
  Troubled = 'DRIFT_TROUBLED',
  Wary = 'DRIFT_WARY',
  Charmed = 'DRIFT_CHARMED',
  Scared = 'DRIFT_SCARED',
  Angry = 'DRIFT_ANGRY',
  Satisfied = 'DRIFT_SATISFIED',
  Neutral = 'DRIFT_NEUTRAL',
  Intrigued = 'DRIFT_INTRIGUED',
  Guarded = 'DRIFT_GUARDED',
  Raw = 'DRIFT_RAW',
  Opened = 'DRIFT_OPENED',
  Destabilised = 'DRIFT_DESTABILISED',
}

// === Expression States ===
export enum ExpressionState {
  Neutral = 'EXPR_NEUTRAL',
  Curious = 'EXPR_CURIOUS',
  Warm = 'EXPR_WARM',
  Alarmed = 'EXPR_ALARMED',
}

// === Action Effect ===
export interface ActionEffect {
  affectionDelta: number;
  resultExpression: ExpressionState;
  responseLines: string[];
  resultDrift?: DriftState;
  emotionIcon?: EmotionIconType;
  flagsToSet?: string[];
}

// === Beat ===
export interface Beat {
  beatId: string;
  fishLines: string[];
  actionEffects: Record<ActionId, ActionEffect>;
  seen: boolean;
  silentBeat?: boolean;
  silentBeatDurationSec?: number;
}

// === Departure Data ===
export interface DepartureData {
  dialogue: string[];
  icon: EmotionIconType;
  flagsToSet?: string[];
}

// === Cast ===
export interface CastData {
  id: string;
  name: string;
  beats: Beat[];
  departures: Partial<Record<DriftState, DepartureData>>;
}

// === Catch Sequence Data ===
// REEL action triggers the Reel ending directly; reaching the end of dialogue
// of an ending-eligible cast (release_ready or catch_available flag) triggers
// the Release ending. Both epitaphs are optional — when omitted, the ending
// overlay is skipped entirely (NPC-friendly).
export interface CatchSequenceData {
  reelEpitaph?: string;
  releaseEpitaph?: string;
}

// === Fish Character ===
export interface FishCharacter {
  id: string;
  name: string;
  species: string;
  accentColor: string;
  currentExpression: ExpressionState;
  affection: number;
  currentDrift: DriftState;
  portrait?: TextureAsset;
}



// === Fish Affection (SYS-01-AFFECTION) ===
export interface FishAffection {
  characterId: string;
  value: number;
  ceiling: number;
  lastChangeSessionId: string;
  lastChangeDelta: number;
  peakValue: number;
}

// === Lure Types (SYS-23-GIFTS) ===
export interface LureDefinition {
  id: string;
  name: string;
  description: string;
  attractedFish: string[];
  initialDrift: DriftState;
  driftModifiers: Record<string, DriftState>;
  isGifted: boolean;
  giftedBy?: string;
}

export interface LureReaction {
  lureId: string;
  fishId: string;
  castCount: number;
  lastExpression: ExpressionState;
  positiveActions: number;
  negativeActions: number;
}

// === Journal Types (SYS-05-JOURNAL) ===
export interface JournalFishEntry {
  fishId: string; // kept in runtime for convenience, but NOT persisted (it's the map key)
  unlocked: boolean;
  species: string; // NOT persisted — rebuilt from CharacterRegistry
  expressionsSeen: ExpressionState[];
  castsMade: number;
}

// Keepsake interface removed (deprecated feature)

// === Lake Zones ===
export type LakeZone = 'near' | 'mid' | 'far';

// === Quest Requirement Types ===
export type QuestRequirement =
  | { type: 'use_lure'; lureId: string }
  | { type: 'talk_to_fish'; fishId: string }
  | { type: 'talk_to_x_fish'; count: number }
  | { type: 'make_fish_leave'; fishId: string }
  | { type: 'custom'; flagKey: string };

// === Quest Save Data ===
export interface QuestSaveData {
  // completedQuests removed — derived from fishTalkedTo/fishMadeLeave/luresUsed + flags on load
  fishTalkedTo: string[];      // fish IDs the player has talked to
  fishMadeLeave: string[];     // fish IDs that have departed
  luresUsed: string[];         // lure IDs that have been used in a cast
  // Legacy field (read for backward compat, never written)
  completedQuests?: string[];
}

// === Fact Definitions (Flag-based journal observations) ===
export interface FactDefinition {
  flagKey: string;        // Flag that unlocks this fact (e.g. 'fact.nereia.ancient')
  text: string;           // The fact text shown when unlocked
  hintText?: string;      // Optional hint shown when locked (defaults to '???')
}

// === Character Configuration (Modular Character System) ===
export interface CharacterPortraitAssets {
  neutral: string;
  curious?: string;
  warm?: string;
  alarmed?: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  /** If set, this name replaces `name` once the trueNameFlag is active. */
  trueName?: string;
  /** Flag key that, when true, causes trueName to be displayed instead of name. */
  trueNameFlag?: string;
  species: string;
  accentColor: string;
  portraitAssets: CharacterPortraitAssets;
  /** Loaded TextureAsset for the neutral portrait — used by HUD, journal, CG viewer. */
  portraitTexture: TextureAsset;
  /** Sprite path string for XAML Image.Source bindings (e.g. 'sprites/foo.png'). */
  portraitSpritePath: string;
  preferredLures: string[];
  dislikedLures: string[];
  lakeZones: LakeZone[];
  questRequirement?: QuestRequirement;
  unlockCondition: (flags: Record<string, boolean | number>) => boolean;
  encounterRate: number;
  questName: string;
  questHint: string;
  getCasts: () => CastData[];
  initialState: () => FishCharacter;
  catchSequenceData?: CatchSequenceData;
  driftAwayJournalText?: string;
  facts: FactDefinition[];
  /** CGs owned by this character (portraits, endings). Aggregated by registry. */
  cgs?: CGData[];
}

// === CG (Computer Graphics) Gallery ===
export interface CGData {
  id: string;
  characterId: string;
  name: string;
  description: string;
  unlockCondition: string;
  thumbnailPath: string;
  /** Loaded TextureAsset for fullscreen viewer + thumbnail rendering. */
  thumbnailTexture: TextureAsset;
}

// === CG Gallery Card (for XAML grid display) ===
export interface CGGalleryCard {
  id: string;
  name: string;
  characterId: string;
  isUnlocked: boolean;
  thumbnailPath: string;
  thumbnailTexture: TextureAsset;
}

// === Save Data ===
export interface SaveData {
  fish: Record<string, FishSaveData>;
  flags: Record<string, boolean | number>;
  seenBeats: string[];
  lures?: LureSaveData;
  journal?: JournalSaveData;
  quests?: QuestSaveData;
  perFishCastIndex?: Record<string, number>;
  cgUnlocks?: string[];
  globalStats?: GlobalStatsSaveData;
  // Legacy fields (read for backward compat, never written)
  castCount?: number;
  currentCastIndex?: number;
}

// Forward declaration for GlobalStats (actual interface in GlobalStatsSystem.ts)
export interface GlobalStatsSaveData {
  totalCasts: number;
  // totalCharactersMet removed — derived from journal.fishEntries on load
  // totalFactsDiscovered removed — derived from flags + CharacterRegistry on load
  totalPlaySessions: number;
  unlockedBadges: string[];
  // Legacy fields (read for backward compat, never written)
  totalCharactersMet?: number;
  totalFactsDiscovered?: number;
}

export interface LureSaveData {
  owned: string[];
  selected?: string;
  equippedLureId: string | null;
  reactions: LureReaction[];
}

export interface JournalSaveData {
  fishEntries: Record<string, JournalFishEntry>;
  // keepsakes removed (deprecated); backward compat handled in deserialize
}

export interface FishSaveData {
  affection: number;
  drift: DriftState;
  // peakValue, lastChangeSessionId, lastChangeDelta removed — diagnostic only, not needed for gameplay
  // Legacy fields (read for backward compat, never written)
  peakValue?: number;
  lastChangeSessionId?: string;
  lastChangeDelta?: number;
}
