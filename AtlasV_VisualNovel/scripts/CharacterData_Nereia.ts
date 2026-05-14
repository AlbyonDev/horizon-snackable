/**
 * CharacterData_Nereia — Nereia's character configuration.
 *
 * Dialogue content lives in Story_Nereia.ts (Ink format) and is compiled
 * into Beat[] on demand by InkBeatAdapter. This file holds only the
 * metadata, departures, catch sequence, and character config.
 *
 * Casts progress in the order declared in NEREIA_CAST_DEFS — no tiers.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { nereiaNeutralTexture, cgNereiaLoveEndTexture, cgNereiaReleaseEndTexture } from './Assets';

const CHARACTER_ID = 'nereia';
const NEREIA_PORTRAIT_SPRITE = 'sprites/nereia_neutral.png';

// ============================================================
// Cast definitions — dialogue pulled from Ink, departures shared from a side table
// ============================================================

interface CastDef {
  start: string;
  name: string;
  /** Override the derived cast id (used for variant casts). */
  id?: string;
  /** Override the departure lookup key (defaults to derived/explicit id). */
  departuresKey?: string;
}

const NEREIA_CAST_DEFS: CastDef[] = [
  { start: 'nereia_t1_c1_b1',  name: 'First Contact'                },
  { start: 'nereia_t1_c2_b1',  name: 'The Compliment'               },
  { start: 'nereia_t2_c3_b1',  name: 'The Discrepancy'              },
  { start: 'nereia_t2_c4_b1',  name: 'The Morning You Did Not Come' },
  // Variant of cast 4 that skips the missed-cast opening beat.
  { start: 'nereia_t2_c4_b2',  name: 'The Morning You Did Not Come',
    id: 'nereia_t2_c4bis', departuresKey: 'nereia_t2_c4' },
  { start: 'nereia_t3_c5_b1',  name: 'The Directive'                },
  { start: 'nereia_t3_c6_b1',  name: '340 Years'                    },
  { start: 'nereia_t3_c7_b1',  name: 'The Choice'                   },
  { start: 'nereia_t4_c8_b1',  name: 'What Must Be Known'           },
  { start: 'nereia_t4_c9_b1',  name: 'What She Wanted To Say'       },
  { start: 'nereia_t5_c10_b1', name: 'The Last Morning'             },
];

// ============================================================
// Departures per cast (keyed by cast id)
// ============================================================

const NEREIA_DEPARTURES: Record<string, CastData['departures']> = {
  nereia_t1_c1: {
    [DriftState.Charmed]:   { dialogue: ['...', 'The mist is heavy this morning.', 'Heavier than it should be.', '...', 'It weighs 0.4% above my prediction.', '...', 'That is also your fault.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['...', 'A dragonfly will pass in ten seconds.', '...', 'Watch.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['...', 'T-2313 remains T-2313.', 'I did not move the counter this morning.', '...', 'I am permitting myself.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'You asked the wrong question first.', 'Most do.', '...', 'I have learned to be indifferent to that variable.', 'I am told this is sad.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'Noted.', '...', 'The file did not predict you.', 'It predicted me.', 'I will adjust.'], icon: EmotionIconType.Shock },
  },
  nereia_t1_c2: {
    [DriftState.Charmed]:   { dialogue: ['...', 'The dragonfly came back.', 'Three days later than predicted.', '...', 'It had never done that.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['...', 'Bring me a question I cannot predict.', 'I will award points.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['...', 'The file is updated.', 'Return when you wish.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The file requires corrections.', 'Return.', 'Or do not.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'The file will be closed.'], icon: EmotionIconType.Shock },
  },
  nereia_t2_c3: {
    [DriftState.Charmed]:   { dialogue: ['...', "I used the word 'want' this morning.", '...', 'I had not used it in 340 years.', '...', 'It weighs more than expected.'], icon: EmotionIconType.Warmth, flagsToSet: ['mood.nereia.first_want'] },
    [DriftState.Warm]:      { dialogue: ['...', 'T-2104 dropped to T-2103 while you were speaking.', '...', 'I did not know it could drop faster.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['...', 'The deviation continues.', 'Return.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The deviation is noted.', 'Return carefully.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'I will report what I must.'], icon: EmotionIconType.Shock },
  },
  nereia_t2_c4: {
    [DriftState.Charmed]:   { dialogue: ['...', 'Did you know dragonflies do not sleep?', '...', 'They close their eyes.', 'It is not the same thing.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['...', 'Bring the irritation.', 'I will bring the precision.', '...', 'We will see what we make.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['...', 'The data continues.', 'Return.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The deviation is noted.', 'Return carefully.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'I will report what I must.'], icon: EmotionIconType.Shock },
  },
  nereia_t3_c5: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow.', '...', 'I will be here at 7:08 again.', '...', 'You can be early too.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', 'The directive remains unfollowed.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['Return.', 'I will be here.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['The directive is noted.', 'Be careful.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'Perhaps the directive was correct.'], icon: EmotionIconType.Shock },
  },
  nereia_t3_c6: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow.', '...', 'The file has a name now.', 'Your name.', '...', 'Return at 7:08.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', 'Earlier.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['Return.', '340 years continue.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The rule applies.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'Subject 2848. File closed.'], icon: EmotionIconType.Shock },
  },
  nereia_t3_c7: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow at 7:00.', '...', 'I will be at 6:45.', 'Be there earlier.', '...', 'Please.'], icon: EmotionIconType.Warmth, flagsToSet: ['mood.nereia.said_please'] },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', '...', 'Earlier.', 'Please.'], icon: EmotionIconType.Hesitation, flagsToSet: ['mood.nereia.said_please'] },
    [DriftState.Satisfied]: { dialogue: ['Return.', 'The choice is made.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The choice may change.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'Perhaps the choice was wrong.'], icon: EmotionIconType.Shock },
  },
  nereia_t4_c8: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow.', '6:35.', '...', 'I have other things to give you.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', 'The inheritance continues.'], icon: EmotionIconType.Hesitation },
    [DriftState.Satisfied]: { dialogue: ['Return.', 'There is more.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'The data waits.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'The inheritance is revoked.'], icon: EmotionIconType.Shock },
  },
  nereia_t4_c9: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow.', '...', 'I do not know the time.', 'It will be early.', '...', 'Be there.'], icon: EmotionIconType.Warmth, flagsToSet: ['nereia.catch_available'] },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', '...', 'Early.', 'Be there.'], icon: EmotionIconType.Hesitation, flagsToSet: ['nereia.catch_available'] },
    [DriftState.Satisfied]: { dialogue: ['Return.', 'One more time.'], icon: EmotionIconType.None },
    [DriftState.Wary]:      { dialogue: ['...', 'Return.', 'If you wish.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:    { dialogue: ['...', 'The last entry is deleted.'], icon: EmotionIconType.Shock },
  },
  nereia_t5_c10: {
    [DriftState.Charmed]: { dialogue: ['...'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['...'], icon: EmotionIconType.Hesitation },
  },
};

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const NEREIA_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The data ends here.\n\nThe lake remembers.\n\nShe had said it would be enough.',
  releaseEpitaph: 'The file is closed.\n\nThe lake remembers.\n\nYou will remember.\n\nIt is more than enough.',
};

const NEREIA_DRIFT_AWAY_JOURNAL_TEXT =
  'She was not there.\n\nThe file was closed.\n\n7:14. The surface was empty.\n\nThe deviation was zero centimetres.';

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return NEREIA_CAST_DEFS.map(d => {
    const depKey = d.departuresKey ?? d.id ?? d.start.replace(/_b\d+$/, '');
    const departures = NEREIA_DEPARTURES[depKey] ?? {};
    return inkCast(CHARACTER_ID, d.start, d.name, departures, d.id);
  });
}

// ============================================================
// Character configuration (exported)
// ============================================================

const NEREIA_CGS: CGData[] = [
  {
    id: 'portrait_nereia',
    characterId: CHARACTER_ID,
    name: 'Nereia',
    description: 'First encounter with the midnight koi.',
    unlockCondition: 'Meet Nereia for the first time',
    thumbnailPath: NEREIA_PORTRAIT_SPRITE,
    thumbnailTexture: nereiaNeutralTexture,
  },
  {
    id: 'ending_nereia_reel',
    characterId: CHARACTER_ID,
    name: 'The Last Morning',
    description: 'The data ends here. The lake remembers.',
    unlockCondition: 'Choose "Reel" in Nereia\'s catch sequence',
    thumbnailPath: 'sprites/nereia_love_end.png',
    thumbnailTexture: cgNereiaLoveEndTexture,
  },
  {
    id: 'ending_nereia_release',
    characterId: CHARACTER_ID,
    name: 'The File Is Closed',
    description: 'The lake remembers. You will remember. It is more than enough.',
    unlockCondition: 'Choose Nereia\'s name in the catch sequence',
    thumbnailPath: 'sprites/nereia_release_end.png',
    thumbnailTexture: cgNereiaReleaseEndTexture,
  },
];

export const NEREIA_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Nereia',
  species: 'Koi',
  accentColor: '#9B7FCC',

  portraitAssets: {
    neutral: '@sprites/nereia_neutral.png',
  },
  portraitTexture: nereiaNeutralTexture,
  portraitSpritePath: NEREIA_PORTRAIT_SPRITE,

  preferredLures: ['gold_teardrop', 'shell_hook'],
  dislikedLures: ['red_spinner'],

  lakeZones: ['near', 'mid'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Patient Offering',
  questHint: 'Gold catches her eye. Patience holds her gaze. The lure and the silence are both the gift — staying long enough is the proof.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Nereia',
    species: 'Koi',
    accentColor: '#9B7FCC',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: nereiaNeutralTexture,
  }),

  catchSequenceData: NEREIA_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: NEREIA_DRIFT_AWAY_JOURNAL_TEXT,

  facts: [
    {
      flagKey: 'fact.nereia.ancient',
      text: 'Ancient resident of the pond.',
    },
    {
      flagKey: 'fact.nereia.ornamental',
      text: 'Ornamental scales that shimmer purple and gold.',
    },
    {
      flagKey: 'fact.nereia.formal',
      text: 'Speaks with formal precision.',
    },
    {
      flagKey: 'fact.nereia.counter',
      text: 'Maintains a counter system (T-XXXX) tracking something.',
    },
    {
      flagKey: 'fact.nereia.340years',
      text: 'Has been in the pond for 340 years.',
    },
    {
      flagKey: 'fact.nereia.directive',
      text: 'Received a directive she refuses to follow.',
    },
    {
      flagKey: 'fact.nereia.file',
      text: 'Keeps detailed files on pond visitors.',
    },
  ],

  cgs: NEREIA_CGS,
};
