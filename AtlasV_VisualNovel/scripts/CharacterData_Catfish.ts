/**
 * CharacterData_Catfish — NPC fish: single 4-beat cast, combo-based catch.
 *
 * No deep-story arc. Replays from scratch on every encounter (per NPC design).
 * No ending CG. Catch shows a one-line epitaph; release/departure are silent.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, EndingData } from './Types';
import { DriftState, EmotionIconType, ExpressionState, Phase, ANY_LURE } from './Types';
import { inkCast } from './InkBeatAdapter';
import { catfishNeutralTexture } from './Assets';

const CHARACTER_ID = 'catfish';
const CATFISH_PORTRAIT_SPRITE = 'sprites/char_catfish_neutral.png';

const CATFISH_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The catfish sinks into the dark.*', '*Gone.*'],
    icon: EmotionIconType.None,
  },
};

const CATFISH_ENDINGS: Record<string, EndingData> = {
  reel: { epitaph: 'Catfish has been caught.' },
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'catfish_t1_c1_b1', 'The Catfish', CATFISH_DEPARTURES),
  ];
}

const CATFISH_CGS: CGData[] = [
  {
    id: 'portrait_catfish',
    characterId: CHARACTER_ID,
    name: 'Catfish',
    description: 'A heavy shape from the deep.',
    unlockCondition: 'Encounter the catfish',
    thumbnailPath: CATFISH_PORTRAIT_SPRITE,
    thumbnailTexture: catfishNeutralTexture,
  },
];

export const CATFISH_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Catfish',
  species: 'Catfish',
  accentColor: '#7A6850',

  portraitAssets: {
    neutral: '@sprites/char_catfish_neutral.png',
  },
  portraitTexture: catfishNeutralTexture,
  portraitSpritePath: CATFISH_PORTRAIT_SPRITE,

  // Ambient NPC — fills the mid + Night slot.
  recipes: [
    { id: 'home', zone: 'mid', phase: Phase.Night, lure: ANY_LURE, initial: true },
  ],

  unlockCondition: () => true,

  questName: 'The Catfish',
  questHint: 'Read the water. Wait, twitch, drift — then strike.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Catfish',
    species: 'Catfish',
    accentColor: '#7A6850',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: catfishNeutralTexture,
  }),

  endings: CATFISH_ENDINGS,

  facts: [
    {
      flagKey: 'fact.catfish.bottom_dweller',
      text: 'A bottom-dweller — patient, heavy, slow to commit.',
    },
    {
      flagKey: 'fact.catfish.curious',
      text: 'Reacts to small movements on the surface.',
    },
    {
      flagKey: 'fact.catfish.follows_drift',
      text: 'Will follow a drifting float through the current.',
    },
  ],

  cgs: CATFISH_CGS,
};
