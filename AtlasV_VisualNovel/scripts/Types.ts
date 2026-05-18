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
  /** Flags to CLEAR (delete) when this action is picked — resets to default.
   *  For `recipe.X` flags whose recipe is `initial:true`, this re-activates
   *  the recipe (loop back to home). Use this for one-shot signals like
   *  `from.<fishId>.<recipeId>` or for re-enabling default home recipes. */
  flagsToClear?: string[];
  /** Flags to DISABLE (set false) when this action is picked — explicit off.
   *  Stores `false` so `isRecipeActive` returns false even for `initial:true`
   *  recipes. Used at tier transitions to permanently close a recipe slot. */
  flagsToDisable?: string[];
  /** Tooltip shown while the action button is pressed (hold-to-preview).
   *  Optional and context-specific: written per-Beat from Ink via #intent:"...". */
  intent?: string;
  /** True when this choice ends the cast (diverts to `END` or has no divert).
   *  The engine plays `responseLines` then triggers the visual departure
   *  directly — no side-table lookup. Lines should already contain the
   *  fish's goodbye, per Ink Authoring Guide §4.4. */
  terminal?: boolean;
  /** Beat id this choice diverts to. When absent and not terminal, the engine
   *  falls back to the next beat in CastData.beats order (legacy linear flow).
   *  Authored via `-> beat_id` after a choice in the Ink source. */
  nextBeatId?: string;
  /** CG ids to unlock when this choice is picked. Authored via `#unlock-cg:<cgId>`.
   *  Used for every CG unlock — endings, bonuses, mid-arc reveals. The engine
   *  does NOT auto-unlock any CG on ending dispatch; the author opts in
   *  explicitly. */
  cgsToUnlock?: string[];
  /** When set, the engine fires `triggerEnding(endingId)` after the reaction
   *  lines finish playing. Authored via `#ending:<id>`. The id is free-form —
   *  any string the auteur wants. If the character declares
   *  `endings[id].epitaph`, it's shown in the ending overlay; otherwise the
   *  overlay is skipped. Either way, `<id>.ending_complete` is set and the
   *  fish is removed from future encounters. */
  triggerEnding?: string;
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

// === Ending Data ===
// Author-defined ending content, keyed by free-form id. The Ink tag
// `#ending:<id>` looks up `CharacterConfig.endings[id]` and displays the
// epitaph (if any) before transitioning back to LakeIdle. CGs are NOT
// auto-unlocked — the author chains `#unlock-cg:<cgId>` on the same choice
// when a visual finale is wanted.
export interface EndingData {
  /** Optional epitaph shown in the fullscreen ending overlay. When omitted,
   *  the overlay is skipped entirely (NPC-friendly, or for silent endings). */
  epitaph?: string;
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

// === Day/Night Phase ===
// Used by the encounter recipe system (Zone + Phase + Lure → Fish).
// The player toggles this manually via the Day/Night button on the idle screen;
// time never advances on its own.
export enum Phase {
  Day = 'day',
  Night = 'night',
}

// === Lure Wildcard ===
// A recipe with `lure: ANY_LURE` accepts any equipped lure (or no lure).
// Used for early-game encounters where the player hasn't unlocked specific
// lures yet, and for waiting-loop dialogues.
export const ANY_LURE = 'ANY' as const;

// === Recipe (Deterministic Encounter) ===
// A recipe is a *fixed slot* where a fish can appear, identified by an id.
// It doesn't change over the arc. Ink controls activation via flags:
//
//   <fishId>.recipe.<id>.on    truthy → recipe is active
//                              falsy with `initial: true` → still active
//                              explicitly false → inactive
//
// When the encounter system matches a recipe, it sets a one-shot signal flag
// `<fishId>.from.<id>` and launches the fish's single entry knot
// (`<fishId>_entry`). The knot uses that signal to dispatch to the right
// dialogue, then clears the flag.
//
// Selection algorithm (zero RNG):
//   1. For each fish, gather its enabled recipes (per flag rules above).
//   2. Filter by zone + phase exact match.
//   3. Prefer recipe with lure == equippedLureId (specific).
//   4. Else, recipe with lure == ANY_LURE (wildcard).
//   5. Else, nothing bites.
//   6. Tie-break: specific > wildcard, then fishId alphabetic, then recipe
//      array order.
export interface Recipe {
  /** Stable, fish-local id (e.g. 'home', 'rdvT1', 'homeT2'). */
  id: string;
  zone: LakeZone;
  phase: Phase;
  /** Lure id (e.g. 'feather_fly') or ANY_LURE for wildcard. */
  lure: string;
  /** If true, this recipe is active by default unless the activation flag
   *  is explicitly set to false. */
  initial?: boolean;
  /** Higher priority wins ties at the same (zone, phase, lure-specificity).
   *  Main characters use priority 1; NPCs/fallback use 0 (default).
   *  Lets the 3 story fish always win over ambient NPCs in their slot. */
  priority?: number;
}

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
  /** Deterministic encounter recipes. Empty array = fish never appears. */
  recipes: Recipe[];
  questRequirement?: QuestRequirement;
  unlockCondition: (flags: Record<string, boolean | number>) => boolean;
  questName: string;
  questHint: string;
  getCasts: () => CastData[];
  initialState: () => FishCharacter;
  /** Map ending id → ending data. Looked up by `triggerEnding(id)` via the
   *  Ink tag `#ending:<id>`. Endings without an entry still fire (set
   *  `<id>.ending_complete`, remove from encounters) but show no overlay. */
  endings?: Record<string, EndingData>;
  facts: FactDefinition[];
  /** Ordered list of flag keys that mark narrative progression milestones.
   *  Used to drive the HUD progress gauge instead of raw affection.
   *  When omitted, the gauge falls back to the affection ratio (good for
   *  per-cast puzzle NPCs where affection itself measures progress). */
  progressionMilestones?: string[];
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
