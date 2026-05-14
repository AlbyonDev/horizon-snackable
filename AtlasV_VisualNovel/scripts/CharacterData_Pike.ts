/**
 * CharacterData_Pike — NPC fish: predator, intense. Single 4-beat cast.
 *
 * Combo: TWITCH → TWITCH → TWITCH → REEL (aggressive, direct provocation).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { pikeNeutralTexture } from './Assets';

const CHARACTER_ID = 'pike';
const PIKE_PORTRAIT_SPRITE = 'sprites/pike_neutral.png';

const PIKE_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The pike sinks into the weeds like a blade sheathed.*', '*Gone.*'],
    icon: EmotionIconType.None,
  },
};

const PIKE_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The pike has been caught.',
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'pike_t1_c1_b1', 'The Pike', PIKE_DEPARTURES),
  ];
}

const PIKE_CGS: CGData[] = [
  {
    id: 'portrait_pike',
    characterId: CHARACTER_ID,
    name: 'Pike',
    description: 'A predator — it does not ask, it takes.',
    unlockCondition: 'Encounter the pike',
    thumbnailPath: PIKE_PORTRAIT_SPRITE,
    thumbnailTexture: pikeNeutralTexture,
  },
];

export const PIKE_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Pike',
  species: 'Pike',
  accentColor: '#3A5C2E',

  portraitAssets: {
    neutral: '@sprites/pike_neutral.png',
  },
  portraitTexture: pikeNeutralTexture,
  portraitSpritePath: PIKE_PORTRAIT_SPRITE,

  preferredLures: [],
  dislikedLures: [],

  lakeZones: ['mid'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Pike',
  questHint: 'Challenge it. Twitch, twitch, twitch — prove you are not prey.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Pike',
    species: 'Pike',
    accentColor: '#3A5C2E',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: pikeNeutralTexture,
  }),

  catchSequenceData: PIKE_CATCH_SEQUENCE_DATA,

  facts: [
    {
      flagKey: 'fact.pike.predator',
      text: 'A born predator — it respects only strength.',
    },
    {
      flagKey: 'fact.pike.intense',
      text: 'Its focus is absolute. Once locked on, nothing else exists.',
    },
    {
      flagKey: 'fact.pike.respect',
      text: 'Respect is earned through defiance, not submission.',
    },
  ],

  cgs: PIKE_CGS,
};
