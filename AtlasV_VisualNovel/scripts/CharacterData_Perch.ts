/**
 * CharacterData_Perch — NPC fish: confident, alert. Single 4-beat cast.
 *
 * Combo: TWITCH → WAIT → TWITCH → REEL (active, then calm, then active).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { perchNeutralTexture } from './Assets';

const CHARACTER_ID = 'perch';
const PERCH_PORTRAIT_SPRITE = 'sprites/perch_neutral.png';

const PERCH_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The perch flashes its stripes and vanishes.*', '*Gone.*'],
    icon: EmotionIconType.None,
  },
};

const PERCH_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The perch has been caught.',
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'perch_t1_c1_b1', 'The Perch', PERCH_DEPARTURES),
  ];
}

const PERCH_CGS: CGData[] = [
  {
    id: 'portrait_perch',
    characterId: CHARACTER_ID,
    name: 'Perch',
    description: 'A bold flash of stripes in the shallows.',
    unlockCondition: 'Encounter the perch',
    thumbnailPath: PERCH_PORTRAIT_SPRITE,
    thumbnailTexture: perchNeutralTexture,
  },
];

export const PERCH_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Perch',
  species: 'Perch',
  accentColor: '#C87533',

  portraitAssets: {
    neutral: '@sprites/perch_neutral.png',
  },
  portraitTexture: perchNeutralTexture,
  portraitSpritePath: PERCH_PORTRAIT_SPRITE,

  preferredLures: [],
  dislikedLures: [],

  lakeZones: ['near'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Perch',
  questHint: 'Twitch to get its attention. Wait to earn its trust. Twitch again to seal it.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Perch',
    species: 'Perch',
    accentColor: '#C87533',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: perchNeutralTexture,
  }),

  catchSequenceData: PERCH_CATCH_SEQUENCE_DATA,

  facts: [
    {
      flagKey: 'fact.perch.hunter',
      text: 'A natural hunter — it chases what moves.',
    },
    {
      flagKey: 'fact.perch.confident',
      text: 'Confident enough to hold still when others flee.',
    },
    {
      flagKey: 'fact.perch.playful',
      text: 'Loves the thrill of the chase more than the catch.',
    },
  ],

  cgs: PERCH_CGS,
};
