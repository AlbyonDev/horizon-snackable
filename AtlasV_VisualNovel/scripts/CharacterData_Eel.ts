/**
 * CharacterData_Eel — NPC fish: cunning, calculating. Single 4-beat cast.
 *
 * Combo: DRIFT → DRIFT → DRIFT → REEL (fluid, patient, surrender-based).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { eelNeutralTexture } from './Assets';

const CHARACTER_ID = 'eel';
const EEL_PORTRAIT_SPRITE = 'sprites/eel_neutral.png';

const EEL_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The eel uncoils into the dark.*', '*Silence returns.*'],
    icon: EmotionIconType.None,
  },
};

const EEL_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The eel has been caught.',
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'eel_t1_c1_b1', 'The Eel', EEL_DEPARTURES),
  ];
}

const EEL_CGS: CGData[] = [
  {
    id: 'portrait_eel',
    characterId: CHARACTER_ID,
    name: 'Eel',
    description: 'A dark ribbon in the water — calculating every move.',
    unlockCondition: 'Encounter the eel',
    thumbnailPath: EEL_PORTRAIT_SPRITE,
    thumbnailTexture: eelNeutralTexture,
  },
];

export const EEL_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Eel',
  species: 'Eel',
  accentColor: '#2D4A3E',

  portraitAssets: {
    neutral: '@sprites/eel_neutral.png',
  },
  portraitTexture: eelNeutralTexture,
  portraitSpritePath: EEL_PORTRAIT_SPRITE,

  preferredLures: [],
  dislikedLures: [],

  lakeZones: ['far'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Eel',
  questHint: 'Let the line go slack. Drift, drift, drift — then strike.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Eel',
    species: 'Eel',
    accentColor: '#2D4A3E',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: eelNeutralTexture,
  }),

  catchSequenceData: EEL_CATCH_SEQUENCE_DATA,

  facts: [
    {
      flagKey: 'fact.eel.calculating',
      text: 'Studies every movement before committing.',
    },
    {
      flagKey: 'fact.eel.fluid',
      text: 'Respects what flows with the current, not against it.',
    },
    {
      flagKey: 'fact.eel.trust',
      text: 'Trust is earned through surrender, not force.',
    },
  ],

  cgs: EEL_CGS,
};
