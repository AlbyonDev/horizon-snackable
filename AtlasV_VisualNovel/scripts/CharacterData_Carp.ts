/**
 * CharacterData_Carp — NPC fish: wise, patient. Single 4-beat cast.
 *
 * Combo: WAIT → DRIFT → WAIT → REEL (patient, calm approach).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { carpNeutralTexture } from './Assets';

const CHARACTER_ID = 'carp';
const CARP_PORTRAIT_SPRITE = 'sprites/carp_neutral.png';

const CARP_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The carp sinks back into the silt.*', '*The water stills.*'],
    icon: EmotionIconType.None,
  },
};

const CARP_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The old carp has been caught.',
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'carp_t1_c1_b1', 'The Carp', CARP_DEPARTURES),
  ];
}

const CARP_CGS: CGData[] = [
  {
    id: 'portrait_carp',
    characterId: CHARACTER_ID,
    name: 'Carp',
    description: 'An ancient shape from the deep silt.',
    unlockCondition: 'Encounter the carp',
    thumbnailPath: CARP_PORTRAIT_SPRITE,
    thumbnailTexture: carpNeutralTexture,
  },
];

export const CARP_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Carp',
  species: 'Carp',
  accentColor: '#8B7D3C',

  portraitAssets: {
    neutral: '@sprites/carp_neutral.png',
  },
  portraitTexture: carpNeutralTexture,
  portraitSpritePath: CARP_PORTRAIT_SPRITE,

  preferredLures: [],
  dislikedLures: [],

  lakeZones: ['far'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Carp',
  questHint: 'Patience is the oldest wisdom. Wait, drift, wait — then strike.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Carp',
    species: 'Carp',
    accentColor: '#8B7D3C',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: carpNeutralTexture,
  }),

  catchSequenceData: CARP_CATCH_SEQUENCE_DATA,

  facts: [
    {
      flagKey: 'fact.carp.ancient',
      text: 'An ancient fish — it has seen more seasons than you.',
    },
    {
      flagKey: 'fact.carp.patient',
      text: 'Follows the drift of the current with slow grace.',
    },
    {
      flagKey: 'fact.carp.trusting',
      text: 'Trust is earned through shared stillness.',
    },
  ],

  cgs: CARP_CGS,
};
