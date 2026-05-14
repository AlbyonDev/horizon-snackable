/**
 * CharacterData_Kasha — Kasha's character configuration.
 *
 * Dialogue content lives in Story_Kasha.ts (Ink format) and is compiled
 * into Beat[] on demand by InkBeatAdapter. This file holds only the
 * metadata, departures, catch sequence, and character config.
 *
 * Casts progress in the order declared in KASHA_CAST_DEFS — no tiers.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { kashaNeutralTexture, cgKashaLoveEndTexture, cgKashaDriftAwayTexture } from './Assets';

const CHARACTER_ID = 'kasha';
const KASHA_PORTRAIT_SPRITE = 'sprites/char_veiltail_neutral.png';

// ============================================================
// Cast definitions (start node + display name) — dialogue from Ink
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const KASHA_CAST_DEFS: CastDef[] = [
  { start: 'kasha_t1_c1_b1',  name: 'The Champion'           },
  { start: 'kasha_t1_c2_b1',  name: 'The Audience'           },
  { start: 'kasha_t2_c3_b1',  name: 'The Test'               },
  { start: 'kasha_t2_c4_b1',  name: 'The Lie She Told'       },
  { start: 'kasha_t3_c5_b1',  name: 'The Thing About Before' },
  { start: 'kasha_t3_c6_b1',  name: 'The Day After'          },
  { start: 'kasha_t3_c7_b1',  name: 'The Question She Asks'  },
  { start: 'kasha_t4_c8_b1',  name: 'The Offer'              },
  { start: 'kasha_t4_c9_b1',  name: 'The Trophy Refused'     },
  { start: 'kasha_t5_c10_b1', name: 'The Name'               },
];

// ============================================================
// Departures per cast (keyed by cast id, e.g. 'kasha_t1_c1')
// ============================================================

const KASHA_DEPARTURES: Record<string, CastData['departures']> = {
  kasha_t1_c1: {
    [DriftState.Charmed]: { dialogue: ['Oi.', 'Come back.', "I'm not done with you.", '...Tomorrow.', "Don't be late, baka."], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Tch.', "You're alright.", 'Maybe.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Whatever.', "I'll see if you come back or not.", "Doesn't matter to me."], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ["...You're weird.", 'Not in the good way.', 'Maybe try again.', "Or don't. Whatever."], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['...', "Don't come back tomorrow."], icon: EmotionIconType.Shock },
  },
  kasha_t1_c2: {
    [DriftState.Charmed]: { dialogue: ['Tomorrow.', 'Same corner.', "Don't bring anyone else.", '...Just you.', 'Baka.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Maybe tomorrow.', "I haven't decided.", "...I've decided. Tomorrow."], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ["Whatever. I'll be here.", 'If you come, you come.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', 'Maybe think about whether you actually want to come back.', "I'm not begging."], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['Just go.', '...', 'Just go, baka.'], icon: EmotionIconType.Shock },
  },
  kasha_t2_c3: {
    [DriftState.Charmed]: { dialogue: ['You passed.', '...Some of it.', 'Come back tomorrow. New test.', "Don't get cocky, baka."], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Mm.', 'Acceptable performance.', 'Tomorrow.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ["We'll see.", 'Maybe.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', 'I expected better.', 'From you specifically.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ["Don't bother coming back.", '...', 'I mean it.'], icon: EmotionIconType.Shock },
  },
  kasha_t2_c4: {
    [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', 'Bring something.', "I don't know what. Surprise me.", "Don't bring nothing, baka."], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Tomorrow, then.', '...', 'Same corner.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Mm.', 'Maybe.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', "Don't push it.", "I told you something. Don't make me regret it."], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['...', "I shouldn't have told you that.", "Don't come back."], icon: EmotionIconType.Shock, flagsToSet: ['mood.kasha.regret_admission'] },
  },
  kasha_t3_c5: {
    [DriftState.Opened]:  { dialogue: ['...', 'Tomorrow.', "Don't bring it up.", '...', "Don't not bring it up either.", "Just — be normal. Be a baka. The way you usually are."], icon: EmotionIconType.Warmth },
    [DriftState.Raw]:     { dialogue: ['...', 'Tomorrow.', "I'll be here."], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['...', 'Whatever.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', 'I told you too much.', "I'm not doing that again."], icon: EmotionIconType.Surprise },
    [DriftState.Scared]:  { dialogue: ['...', "Don't come back.", 'I mean it this time.'], icon: EmotionIconType.Shock, flagsToSet: ['mood.kasha.shame_spiral'] },
  },
  kasha_t3_c6: {
    [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', "Bring nothing again. I don't need anything except— just come.", 'Just you, baka.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Tomorrow.', 'Be on time.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Mm. Tomorrow.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', "I don't know if I'll be here.", "Don't count on it."], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['...'], icon: EmotionIconType.Shock },
  },
  kasha_t3_c7: {
    [DriftState.Charmed]: { dialogue: ['...', 'Tomorrow.', 'Bring whatever you want. Or nothing.', 'Just come.', "Don't be late, baka."], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['Tomorrow.', '...', "I won't keep asking why you come.", '...For now.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Whatever.', 'Tomorrow.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', "Maybe don't come tomorrow.", 'Give me a day.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['...', 'I asked. You answered wrong.', "I don't want to see you for a while."], icon: EmotionIconType.Shock },
  },
  kasha_t4_c8: {
    [DriftState.Charmed]: { dialogue: ['Tomorrow.', '...', 'Same time. Same corner.', "I'll be — I'll be here.", 'Be on time, baka.'], icon: EmotionIconType.Warmth },
    [DriftState.Opened]:  { dialogue: ['Tomorrow.', '...', 'I need to think about today.', "Don't worry. It was good thinking."], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Mm.', 'Tomorrow, I guess.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', "I shouldn't have offered.", 'Forget I did.'], icon: EmotionIconType.Hesitation, flagsToSet: ['mood.kasha.offer_retracted'] },
    [DriftState.Scared]:  { dialogue: ['...', 'I made a mistake.', "Don't come back tomorrow."], icon: EmotionIconType.Shock, flagsToSet: ['mood.kasha.shame_deep'] },
  },
  kasha_t4_c9: {
    [DriftState.Charmed]: { dialogue: ['...', 'Tomorrow.', 'I want to tell you my real name.', 'Not tonight. Tomorrow.', 'Be on time.', 'Baka.'], icon: EmotionIconType.Warmth, flagsToSet: ['secret.kasha.real_name_intent'] },
    [DriftState.Opened]:  { dialogue: ['...', 'Tomorrow.', 'I have one more thing I want to say.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]: { dialogue: ['Mm.', 'Tomorrow. Maybe.'], icon: EmotionIconType.None },
    [DriftState.Wary]:    { dialogue: ['...', 'I told you too much.', 'Again.', 'I keep doing that with you.'], icon: EmotionIconType.Hesitation },
    [DriftState.Scared]:  { dialogue: ['...', "I think I'm going to leave.", 'Not tomorrow. Soon.', '...', "I told someone the truth and they didn't know what to do with it."], icon: EmotionIconType.Shock },
  },
  kasha_t5_c10: {
    [DriftState.Charmed]: { dialogue: ['...'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['...'], icon: EmotionIconType.Hesitation },
  },
};

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const KASHA_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'She wanted to be chosen.\n\nChosen is not the same as taken.\n\nShe had told you the difference.',
  releaseEpitaph: 'She wanted to be a person.\n\nNot a prize.\n\nYou let her be the person she was.\n\nShe comes back tomorrow.\n\nShe will keep coming back.',
};

const KASHA_DRIFT_AWAY_JOURNAL_TEXT =
  'The corner is empty.\n\nOther voices, briefly, mention that she talked about you a lot.\n\nThey are surprised that you are not surprised.';

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return KASHA_CAST_DEFS.map(d => {
    const castId = d.start.replace(/_b\d+$/, '');
    const departures = KASHA_DEPARTURES[castId] ?? {};
    return inkCast(CHARACTER_ID, d.start, d.name, departures);
  });
}

// ============================================================
// Character configuration (exported)
// ============================================================

const KASHA_CGS: CGData[] = [
  {
    id: 'portrait_kasha',
    characterId: CHARACTER_ID,
    name: 'Kasha',
    description: 'First encounter with the crimson veiltail.',
    unlockCondition: 'Meet Kasha for the first time',
    thumbnailPath: KASHA_PORTRAIT_SPRITE,
    thumbnailTexture: kashaNeutralTexture,
  },
  {
    id: 'ending_kasha_love_end',
    characterId: CHARACTER_ID,
    name: 'The Trophy',
    description: 'She wanted to be chosen.',
    unlockCondition: "Complete Kasha's Reel ending",
    thumbnailPath: '@sprites/kasha_love_end.png',
    thumbnailTexture: cgKashaLoveEndTexture,
  },
  {
    id: 'ending_kasha_drift_away',
    characterId: CHARACTER_ID,
    name: 'The Empty Corner',
    description: 'The corner is empty.',
    unlockCondition: 'Kasha leaves after repeated DRIFT_SCARED',
    thumbnailPath: '@sprites/kasha_drift_away.png',
    thumbnailTexture: cgKashaDriftAwayTexture,
  },
];

export const KASHA_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Kasha',
  trueName: 'Aki',
  trueNameFlag: 'secret.kasha.real_name_given',
  species: 'Siamese Fighting Fish (Betta)',
  accentColor: '#D33A2C',

  portraitAssets: {
    neutral: '@sprites/char_veiltail_neutral.png',
  },
  portraitTexture: kashaNeutralTexture,
  portraitSpritePath: KASHA_PORTRAIT_SPRITE,

  preferredLures: ['red_spinner', 'bone_whistle'],
  dislikedLures: ['gold_teardrop'],

  lakeZones: ['mid', 'far'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Championship',
  questHint: "She tests everyone. Stay when she tells you to leave. Push back without being cruel. Listen when she goes quiet.",

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Kasha',
    species: 'Siamese Fighting Fish (Betta)',
    accentColor: '#D4833A',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: kashaNeutralTexture,
  }),

  catchSequenceData: KASHA_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: KASHA_DRIFT_AWAY_JOURNAL_TEXT,

  facts: [
    {
      flagKey: 'fact.kasha.appearance',
      text: 'A vivid red betta with orange-gold fin tips.',
    },
    {
      flagKey: 'fact.kasha.champion',
      text: 'Claims to be the champion of her corner.',
    },
    {
      flagKey: 'fact.kasha.baka',
      text: 'Calls Floater "baka" as a term of endearment.',
    },
    {
      flagKey: 'fact.kasha.third_person',
      text: 'Refers to herself in third person when stressed.',
    },
    {
      flagKey: 'fact.kasha.origin',
      text: 'Came from somewhere else. Left because she was second.',
    },
    {
      flagKey: 'fact.kasha.real_name',
      text: 'Her real name is Aki (revealed in final cast).',
    },
  ],

  cgs: KASHA_CGS,
};
