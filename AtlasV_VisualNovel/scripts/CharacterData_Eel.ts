/**
 * CharacterData_Eel — NPC fish: cunning, calculating. Single 4-beat cast.
 *
 * Combo: DRIFT → DRIFT → DRIFT → REEL (fluid, patient, surrender-based).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, EndingData } from './Types';
import { DriftState, EmotionIconType, ExpressionState, Phase, ANY_LURE } from './Types';
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

const EEL_ENDINGS: Record<string, EndingData> = {
  reel: { epitaph: 'The eel has been caught.' },
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

  // Ambient NPC — fills the near + Night slot.
  recipes: [
    { id: 'home', zone: 'near', phase: Phase.Night, lure: ANY_LURE, initial: true },
  ],

  unlockCondition: () => true,

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

  endings: EEL_ENDINGS,

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
