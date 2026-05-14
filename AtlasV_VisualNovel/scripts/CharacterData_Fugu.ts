/**
 * CharacterData_Fugu — Fugu's character configuration.
 *
 * Dialogue content lives in Story_Fugu.ts (Ink format) and is compiled
 * into Beat[] on demand by InkBeatAdapter. This file holds only the
 * metadata, departures, catch sequence, and character config.
 *
 * Casts progress in the order declared in FUGU_CAST_DEFS — no tiers.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { fuguNeutralTexture, cgFuguDriftAwayTexture, cgFuguLoveEndTexture, cgFuguReleaseEndTexture } from './Assets';

const CHARACTER_ID = 'fugu';
const FUGU_PORTRAIT_SPRITE = 'sprites/char_pufferfish_neutral.png';

// ============================================================
// Cast definitions — dialogue pulled from Ink, departures from side table
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const FUGU_CAST_DEFS: CastDef[] = [
  { start: 'fugu_t1_c1_b1',  name: 'Someone Sees Me!'          },
  { start: 'fugu_t1_c2_b1',  name: 'The Return'                },
  { start: 'fugu_t2_c3_b1',  name: 'The Spines'                },
  { start: 'fugu_t2_c4_b1',  name: 'Control'                   },
  { start: 'fugu_t3_c5_b1',  name: 'Imaginary Friends'         },
  { start: 'fugu_t3_c6_b1',  name: 'The Monster'               },
  { start: 'fugu_t4_c7_b1',  name: 'The First Silence'         },
  { start: 'fugu_t4_c8_b1',  name: 'My First Friend'           },
  { start: 'fugu_t5_c9_b1',  name: 'Hope'                      },
  { start: 'fugu_t5_c10_b1', name: 'The Choice'                },
];

// ============================================================
// Departures per cast (keyed by cast id)
// ============================================================

const FUGU_DEPARTURES: Record<string, CastData['departures']> = {
  fugu_t1_c1: {
    [DriftState.Charmed]:   { dialogue: ['Hey!', 'You\'re coming back tomorrow right?', 'Right?!', 'SAY YES!', '...please.', 'Trust me, I\'ll be here!'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Ok! Ok ok ok!', 'That was good!', 'Tomorrow? Same time?', '...even if you don\'t have a time. Just... come.'], icon: EmotionIconType.Curiosity },
    [DriftState.Neutral]:   { dialogue: ['...', 'Well.', 'That was... that was something.', 'Better than talking to rocks.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'You\'re a little scared huh?', 'It\'s ok.', 'Me too.', 'Of everything. All the time.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', '*slowly deflates*', '...', 'Forget about me.', 'Everyone does.'], icon: EmotionIconType.Shock },
  },
  fugu_t1_c2: {
    [DriftState.Charmed]:   { dialogue: ['TWICE!', 'You came TWICE!', 'That\'s a record! MY record!', 'Tomorrow! Tomorrow tomorrow tomorrow!', 'Trust me!'], icon: EmotionIconType.Delight },
    [DriftState.Warm]:      { dialogue: ['Hey...', 'Thanks for coming back.', 'Really.', '...tomorrow?'], icon: EmotionIconType.Warmth },
    [DriftState.Neutral]:   { dialogue: ['...', 'It\'s over already?', 'Ok.', 'Maybe tomorrow.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'Did I say something wrong?', 'I always say something wrong.', '...sorry.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', '...', 'At least rocks don\'t hurt.'], icon: EmotionIconType.Shock },
  },
  fugu_t2_c3: {
    [DriftState.Charmed]:   { dialogue: ['You know what you are?', 'You\'re brave.', 'Or crazy.', 'Both is good.', 'Tomorrow! Trust me!'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Thanks.', 'For... for not backing away.', 'Tomorrow.'], icon: EmotionIconType.Curiosity },
    [DriftState.Neutral]:   { dialogue: ['...', 'The spines are a lot huh?', 'I get it.', 'Tomorrow if you want.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'You backed away.', 'It\'s normal.', '...it\'s always normal.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'I\'m scary.', 'I know.', '...I\'m sorry for being like this.'], icon: EmotionIconType.Shock },
  },
  fugu_t2_c4: {
    [DriftState.Charmed]:   { dialogue: ['Tonight I\'m not talking to rocks!', 'Tonight I\'m thinking about tomorrow!', 'Because tomorrow you\'ll be here!', 'TRUST ME!'], icon: EmotionIconType.Delight },
    [DriftState.Warm]:      { dialogue: ['Tonight...', 'I\'m going to practice more.', 'With the spines.', 'For you.'], icon: EmotionIconType.Warmth },
    [DriftState.Neutral]:   { dialogue: ['...', 'See you tomorrow.', 'Maybe.', 'I hope.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'I talked too much.', 'Like always.', '...sorry.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'Goodnight.', '...', '*sinks into the depths*'], icon: EmotionIconType.Shock },
  },
  fugu_t3_c5: {
    [DriftState.Charmed]:   { dialogue: ['You know...', 'Bizu, Plop, and Big Algae...', 'They were fine.', 'But you\'re better.', 'Because you\'re real.', 'Trust me.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['Tomorrow...', 'Can we just... be here?', 'Without me telling sad stuff?', '...although I still have sad stuff.'], icon: EmotionIconType.Curiosity },
    [DriftState.Neutral]:   { dialogue: ['...', 'Sorry about the heavy stuff.', 'Tomorrow I\'ll be lighter.', 'Promise.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'I shouldn\'t have talked about the imaginary ones.', 'It\'s weird.', '...I\'m weird.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'Back to the rocks.', '...', 'At least they don\'t judge.'], icon: EmotionIconType.Shock },
  },
  fugu_t3_c6: {
    [DriftState.Charmed]:   { dialogue: ['Hey.', '...', 'Thanks.', 'For telling me I\'m not a monster.', 'Even without words.', 'Tomorrow. Trust me.'], icon: EmotionIconType.Warmth, flagsToSet: ['mood.fugu.not_monster_confirmed'] },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', '...', 'We\'ll talk about lighter stuff.', '...maybe.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]:   { dialogue: ['...', 'It\'s a big question.', 'Take your time.', '...but come back.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'I shouldn\'t have asked.', '...', 'Forget it.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'Maybe I am a monster.', '...', 'Maybe that\'s just what I am.'], icon: EmotionIconType.Shock },
  },
  fugu_t4_c7: {
    [DriftState.Charmed]:   { dialogue: ['...', '...', '*smiles*', '...', 'See you tomorrow.', '...', 'Trust me.'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:      { dialogue: ['That was...', 'That was calm.', 'I like calm now.', 'Because of you.'], icon: EmotionIconType.Contentment },
    [DriftState.Neutral]:   { dialogue: ['...', 'That was weird right?', 'The silence?', '...ok maybe it was just me.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'I tried.', 'The silence.', 'It\'s hard when the other one doesn\'t help.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'I opened up.', 'And you...', '...no. It\'s over.'], icon: EmotionIconType.Shock },
  },
  fugu_t4_c8: {
    [DriftState.Charmed]:   { dialogue: ['Friend.', '...', 'FRIEND!', 'My FRIEND!', 'TOMORROW MY FRIEND!', '*dances in circles*', 'TRUST ME!'], icon: EmotionIconType.Delight },
    [DriftState.Warm]:      { dialogue: ['Friend.', '...', 'That feels good to say.', 'Tomorrow.'], icon: EmotionIconType.Warmth },
    [DriftState.Neutral]:   { dialogue: ['...', 'It\'s a lot huh?', 'Take your time.', 'I\'ll be here tomorrow. Like always.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'Was it too much?', 'The word "friend" is too much?', '...sorry.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'You don\'t want to be my friend.', '...', 'It\'s ok. I\'m used to it.', '...no it\'s not ok. But that\'s life.'], icon: EmotionIconType.Shock },
  },
  fugu_t5_c9: {
    [DriftState.Charmed]:   { dialogue: ['Tomorrow.', '...', 'I\'ll be here.', 'Like always.', '...', 'But tomorrow is special.', 'You\'ll see.', 'Trust me.'], icon: EmotionIconType.Warmth, flagsToSet: ['mood.fugu.tomorrow_special'] },
    [DriftState.Warm]:      { dialogue: ['Tomorrow.', '...', 'I still have something to tell you.'], icon: EmotionIconType.Hesitation },
    [DriftState.Neutral]:   { dialogue: ['...', 'Tomorrow.', 'If you want.'], icon: EmotionIconType.Hesitation },
    [DriftState.Wary]:      { dialogue: ['...', 'I said too much.', 'Again.', '...but it was true.'], icon: EmotionIconType.Sadness },
    [DriftState.Scared]:    { dialogue: ['...', 'You know everything now.', 'And you still want to take.', '...'], icon: EmotionIconType.Shock },
  },
  fugu_t5_c10: {
    [DriftState.Charmed]: { dialogue: ['...'], icon: EmotionIconType.Warmth },
    [DriftState.Warm]:    { dialogue: ['...'], icon: EmotionIconType.Hesitation },
  },
};

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const FUGU_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'In a round bowl, Fugu swims in circles.\n\nHe smiles.\n\nFor the first time, he\'s not alone.\n\nEven if it\'s forever.',
  releaseEpitaph: 'Fugu dives into the depths, then surfaces again.\n\nHe swims in joyful circles at the surface.\n\nHe learned that you can be loved without being possessed.\n\nHe comes back every morning. Every morning.',
};

const FUGU_DRIFT_AWAY_JOURNAL_TEXT =
  'The bubbles rise alone.\n\nFugu has returned to the depths.\n\nMaybe he still talks to the rocks.';

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return FUGU_CAST_DEFS.map(d => {
    const castId = d.start.replace(/_b\d+$/, '');
    const departures = FUGU_DEPARTURES[castId] ?? {};
    return inkCast(CHARACTER_ID, d.start, d.name, departures);
  });
}

// ============================================================
// Character configuration (exported)
// ============================================================

const FUGU_CGS: CGData[] = [
  {
    id: 'portrait_fugu',
    characterId: CHARACTER_ID,
    name: 'Fugu',
    description: 'First encounter with the lonesome pufferfish.',
    unlockCondition: 'Meet Fugu for the first time',
    thumbnailPath: FUGU_PORTRAIT_SPRITE,
    thumbnailTexture: fuguNeutralTexture,
  },
  {
    id: 'ending_fugu_drift_away',
    characterId: CHARACTER_ID,
    name: 'The Bubbles Rise Alone',
    description: 'Fugu has returned to the depths. Maybe he still talks to the rocks.',
    unlockCondition: 'Fugu drifts away after being scared 3 times',
    thumbnailPath: 'sprites/fugu_drift_away.png',
    thumbnailTexture: cgFuguDriftAwayTexture,
  },
  {
    id: 'ending_fugu_reel',
    characterId: CHARACTER_ID,
    name: 'In a Round Bowl',
    description: 'For the first time, he\'s not alone. Even if it\'s forever.',
    unlockCondition: 'Choose "Reel" in Fugu\'s catch sequence',
    thumbnailPath: 'sprites/fugu_love_end.png',
    thumbnailTexture: cgFuguLoveEndTexture,
  },
  {
    id: 'ending_fugu_release',
    characterId: CHARACTER_ID,
    name: 'Joyful Circles',
    description: 'Fugu dives into the depths, then surfaces again.\n\nHe swims in joyful circles at the surface.\n\nHe learned that you can be loved without being possessed.\n\nHe comes back every morning. Every morning.',
    unlockCondition: 'Choose "Release" in Fugu\'s catch sequence',
    thumbnailPath: 'sprites/fugu_release_end.png',
    thumbnailTexture: cgFuguReleaseEndTexture,
  },
];

export const FUGU_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Fugu',
  species: 'Pufferfish',
  accentColor: '#FFB84D',

  portraitAssets: {
    neutral: '@sprites/char_pufferfish_neutral.png',
  },
  portraitTexture: fuguNeutralTexture,
  portraitSpritePath: FUGU_PORTRAIT_SPRITE,

  preferredLures: ['feather_fly', 'red_spinner'],
  dislikedLures: ['gold_teardrop', 'bare_hook'],

  lakeZones: ['near', 'far'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The True Friend',
  questHint: 'He just wants to be heard. Come back. Play. Stay. Don\'t take. Time is the proof — every visit counts.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Fugu',
    species: 'Pufferfish',
    accentColor: '#FFB84D',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: fuguNeutralTexture,
  }),

  catchSequenceData: FUGU_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: FUGU_DRIFT_AWAY_JOURNAL_TEXT,

  facts: [
    {
      flagKey: 'fact.fugu.appearance',
      text: 'Warm-colored pufferfish in orange and gold.',
    },
    {
      flagKey: 'fact.fugu.talks',
      text: 'Talks nonstop to fill the silence.',
    },
    {
      flagKey: 'fact.fugu.toxic',
      text: 'His toxic spines scare away all other fish.',
    },
    {
      flagKey: 'fact.fugu.alone',
      text: 'Grew up alone with imaginary friends.',
    },
    {
      flagKey: 'fact.fugu.dream',
      text: "Dreams of having a friend who isn't afraid of him.",
    },
    {
      flagKey: 'fact.fugu.puffs',
      text: 'Puffs up when excited or scared.',
    },
  ],

  cgs: FUGU_CGS,
};
