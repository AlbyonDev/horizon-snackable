import { TemplateAsset } from 'meta/worlds';
import { PowerUpType, type RGB, type BrickColorPalette } from './Types';
import { BrickAssets } from './Assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export type ColorPalette = {
  /** Ball color. */
  ball?: RGB;
  /** Base paddle color (restored after an effect ends). */
  paddle?: RGB;
  /** Background color. */
  background?: RGB;
};

/** Palette used when none is defined in the level. */
export const DEFAULT_PALETTE: Required<ColorPalette> = {
  ball: [1.00, 1.00, 1.00],
  paddle: [1.00, 1.00, 1.00],
  background: [0.04, 0.04, 0.06], // near black
};

export type BrickTemplate = {
  asset: TemplateAsset;
  /** Number of hits to destroy the brick. Default: 1 */
  hits?: number;
  /** If true, the brick can never be destroyed. Default: false */
  indestructible?: boolean;
  /** Colors keyed by remaining HP. Takes priority over the level palette. */
  colors?: BrickColorPalette;
};

export type PowerUpConfig = {
  type: PowerUpType;
  /** Relative weight. Ex: { BigPaddle:2, Sticky:1 } = 2/3 chance BigPaddle */
  weight: number;
  powerUpDuration?: number;
};

export type GameplaySettings = {
  /** Multiplier on ball scale. Default: 1 */
  ballSizeMultiplier?: number;
  /** Multiplier on paddle width. Default: 1 */
  paddleWidthMultiplier?: number;
};

export type VictoryCondition =
  | { kind: 'allBricksDestroyed' }
  | { kind: 'bricksDestroyed'; count: number }
  | { kind: 'survivalTime'; seconds: number };

export type PhysicsSettings = {
  /** Multiplier applied to the base ball speed. Default: 1 */
  ballSpeedMultiplier?: number;
  /** Downward acceleration (units/s²). 0 = no gravity. Default: 0 */
  gravity?: number;
  /**
   * Angular variance on bounces (0–1 mapped to 0–90°).
   * 0 = deterministic, 0.1 = slight chaos. Default: 0
   */
  bounceRandomness?: number;
  /** Multiplier applied to the base paddle speed. Default: 1 */
  paddleSpeedMultiplier?: number;
  /** Lerp factor for paddle movement per frame (0 = still, 1 = snap). Default: 1 */
  paddleLerpFactor?: number;
  /** Speed bonus added to the ball for each brick destroyed. Default: 0 */
  ballSpeedIncrementPerBrick?: number;
};

export type LevelConfig = {
  /**
   * Char → brick template mapping.
   * '0' and ' ' are always empty cells (no need to declare them).
   * Each other unique character = a distinct brick type.
   */
  brickTemplates: Record<string, BrickTemplate>;

  /**
   * ASCII grid. Rows separated by '\n'.
   * Each character maps to a key in brickTemplates, or '0'/' ' for empty.
   * Example: "121\n212\n121"
   */
  grid: string;

  // --- Layout ---
  /** Width of a brick cell. Default: 1.2 */
  brickWidth?: number;
  /** Height of a brick cell. Default: 0.4 */
  brickHeight?: number;
  /** Horizontal gap between bricks. Default: 0.1 */
  paddingX?: number;
  /** Vertical gap between bricks. Default: 0.1 */
  paddingY?: number;
  /** Y coordinate of the center of the first row. Default: 4 */
  startY?: number;

  // --- Power-ups ---
  /** Probability (0–1) that a destroyed brick spawns a power-up. Default: 0.2 */
  powerUpSpawnChance?: number;
  /** Selection weights per power-up type. Default: equal weights. */
  powerUps?: PowerUpConfig[];

  // --- Victory ---
  /** Condition to advance to the next level. Default: allBricksDestroyed */
  victory?: VictoryCondition;

  // --- Physics ---
  physics?: PhysicsSettings;

  // --- Gameplay ---
  /** Ball and paddle size for this level. */
  gameplay?: GameplaySettings;

  // --- Colors ---
  /** Level color palette. Missing values fall back to DEFAULT_PALETTE. */
  palette?: ColorPalette;

  // --- Lives ---
  /** Overrides the life count for this level only. undefined = global value. */
  livesOverride?: number;
};

// ---------------------------------------------------------------------------
// Default values (used by components during initialization)
// ---------------------------------------------------------------------------

export const LEVEL_DEFAULTS = {
  brickWidth: 1.2,
  brickHeight: 0.4,
  paddingX: 0.1125,
  paddingY: 0.1125,
  startY: 4,
  powerUpSpawnChance: 0.2,
  powerUpDuration: 10,
  ballSpeedMultiplier: 1,
  gravity: 0,
  bounceRandomness: 0,
  paddleSpeedMultiplier: 1,
  paddleLerpFactor: 0.88,
  ballSpeedIncrementPerBrick: 0,
  ballSizeMultiplier: 1,
  paddleWidthMultiplier: 1,
} as const;

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------

export const Title: LevelConfig = {
  // ── Title Screen ─────────────────────────────────────────────────────────
  //
  //   BRICK IT DOWN  —  police pixel 3×5, dégradé sur 15 lignes
  //
  //   Couloir chromatique calqué sur l'UI (or → hot pink → magenta → cyan) :
  //   pas de vert, pas de lime — même palette que le score et le "tap to start"
  //
  brickTemplates: {
    '1': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.85, 0.12] } }, // or
    '2': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.62, 0.12] } }, // or-orange
    '3': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.38, 0.12] } }, // orange-rouge
    '4': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.15, 0.12] } }, // rouge
    '5': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.12, 0.33] } }, // rouge-rose
    '6': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.12, 0.57] } }, // hot pink
    '7': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.00, 0.12, 0.80] } }, // hot pink-magenta
    '8': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.96, 0.12, 1.00] } }, // magenta
    '9': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.73, 0.12, 1.00] } }, // magenta-violet
    'a': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.49, 0.12, 1.00] } }, // violet
    'b': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.26, 0.12, 1.00] } }, // violet-bleu
    'c': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.12, 0.22, 1.00] } }, // bleu
    'd': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.12, 0.46, 1.00] } }, // bleu-cyan
    'e': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.12, 0.69, 1.00] } }, // bleu clair
    'f': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.12, 0.93, 1.00] } }, // cyan
  },
    grid: [
      '111  111  1  11 1 1',
      '2  2 2  2 2 2   22',
      '333  333  3 3   3',
      '4  4 4 4  4 4   44',
      '555  5  5 5  55 5 5',
  
      '',
      '        6 666',
      '        7  7 ',
      '        8  8 ',
      '        9  9 ',
      '',
      'aaa   aa  a   a a  a',
      'b  b b  b b   b bb b',
      'c  c c  c c   c c cc',
      'd  d d  d d d d d  d',
      'eee   ee   e e  e  e',
    ].join('\n'),

    brickWidth: 0.36,
    brickHeight: 0.33,
    paddingX: 0.08,
    paddingY: 0.08,
    startY: 5,

};

export const LEVELS: LevelConfig[] = [

  // ── Level 0: Arcade ───────────────────────────────────────────────────────
  //
  //   P P P P P P P P   ← 1hp #ff148a  rose
  //   O O O O O O O O   ← 1hp #FF7300  orange
  //   J J J J J J J J   ← 1hp #FFEB00  jaune
  //   V V V V V V V V   ← 1hp #1EF34D  vert
  //   B B B B B B B B   ← 1hp #008CFF  bleu
  //   M M M M M M M M   ← 1hp #B81AFF  mauve
  //
  {
    brickTemplates: {
      'P': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.176, 0.471] } }, // magenta néon #FF2D78
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.420, 0.102] } }, // orange vif #FF6B1A
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.878, 0.102] } }, // jaune électrique #FFE01A
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 1.000, 0.369] } }, // vert néon #1AFF5E
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 0.624, 1.000] } }, // bleu électrique #1A9FFF
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.706, 0.290, 1.000] } }, // violet néon #B44AFF
    },
    grid: [
      'PPPPPPPP',
      'OOOOOOOO',
      'JJJJJJJJ',
      'VVVVVVVV',
      'BBBBBBBB',
      'MMMMMMMM',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    physics: {
      ballSpeedMultiplier: 1,
      paddleLerpFactor: 0.88,
    },
    palette: {
      background: [0.020, 0.020, 0.031],
      ball: [1.000, 0.84, 0.85],
      paddle: [1.000, 0.84, 0.000],
    },
  },

  // ── Level 1: Diamond ──────────────────────────────────────────────────────
  {
    brickTemplates: {
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.118, 0.118] } }, // red
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.420, 0.102] } }, // orange
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.878, 0.102] } }, // yellow
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 1.000, 0.369] } }, // green
      'C': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 0.878, 1.000] } }, // cyan
    },
    grid: [
      '0000R0000',
      '000ROR000',
      '00ROJOR00',
      '0ROJVJOR0',
      'ROJVCVJOR',
      '0ROJVJOR0',
      '00ROJOR00',
      '000ROR000',
      '0000R0000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    physics: {
      ballSpeedMultiplier: 1,
      paddleLerpFactor: 0.88,
    },
    palette: {
      background: [0.020, 0.020, 0.031],
      ball: [0.000, 1.000, 0.933],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 2: Checkerboard ────────────────────────────────────────────────
  {
    brickTemplates: {
      'P': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.176, 0.471] } }, // hot pink
      'C': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.000, 0.950, 0.950] } }, // cyan
    },
    grid: [
      'P0C0P0C0P',
      '0C0P0C0P0',
      'P0C0P0C0P',
      '0C0P0C0P0',
      'P0C0P0C0P',
      '0C0P0C0P0',
      'P0C0P0C0P',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    physics: {
      ballSpeedMultiplier: 1,
      paddleLerpFactor: 0.88,
    },
    palette: {
      background: [0.040, 0.010, 0.050],
      ball: [1.000, 1.000, 0.200],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 3: Invader ─────────────────────────────────────────────────────
  {
    brickTemplates: {
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.200, 1.000, 0.200] } }, // neon green
      'E': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.200, 0.200] } }, // red eyes
    },
    grid: [
      '00V000V00',
      '000V0V000',
      '00VVVVV00',
      '0VV0V0VV0',
      'VVVVVVVVV',
      'V0VVVVV0V',
      'V0V000V0V',
      '000VV0000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.010, 0.020, 0.010],
      ball: [0.200, 1.000, 0.200],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 4: Zigzag ──────────────────────────────────────────────────────
  {
    brickTemplates: {
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.118, 0.200] } },
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.500, 0.000] } },
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.900, 0.000] } },
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.000, 1.000, 0.400] } },
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.000, 0.600, 1.000] } },
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.800, 0.200, 1.000] } },
    },
    grid: [
      'RRRR00000',
      '00OOOO000',
      '0000JJJJ0',
      '00VVVV000',
      'BBBB00000',
      '00MMMM000',
      '0000RRRR0',
      '00OOOO000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.020, 0.010, 0.040],
      ball: [1.000, 0.400, 1.000],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 5: Heart ───────────────────────────────────────────────────────
  {
    brickTemplates: {
      'P': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.100, 0.400] } }, // hot pink
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.300, 0.500] } }, // rose
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.900, 0.100, 0.600] } }, // magenta
    },
    grid: [
      '0RR000RR0',
      'RMMR0RMMR',
      'RMPPMPPMR',
      'RMPPPPPPR',
      '0RPPPPPR0',
      '00RPPPRR0',
      '000RPR000',
      '0000R0000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.050, 0.010, 0.030],
      ball: [1.000, 0.700, 0.800],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 6: Pyramid ─────────────────────────────────────────────────────
  {
    brickTemplates: {
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.150, 0.150] } },
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.500, 0.050] } },
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.850, 0.050] } },
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.050, 1.000, 0.350] } },
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.100, 0.500, 1.000] } },
      'I': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.300, 0.100, 0.900] } },
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.750, 0.200, 1.000] } },
    },
    grid: [
      '0000M0000',
      '000IMI000',
      '00BIMIB00',
      '0VBIMIOV0',
      'JVBIMIBVJ',
      'OJVBIBVJO',
      'ROJVBVJOR',
      'RROJVJORR',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.030, 0.020, 0.010],
      ball: [1.000, 0.900, 0.500],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 7: Columns ─────────────────────────────────────────────────────
  {
    brickTemplates: {
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.118, 0.200] } },
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.450, 0.050] } },
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.900, 0.050] } },
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.050, 1.000, 0.350] } },
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.050, 0.550, 1.000] } },
      'I': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.300, 0.100, 0.900] } },
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.800, 0.200, 1.000] } },
    },
    grid: [
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
      'R0O0J0V0B',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.010, 0.010, 0.030],
      ball: [1.000, 1.000, 1.000],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 8: Cross ───────────────────────────────────────────────────────
  {
    brickTemplates: {
      'G': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.843, 0.000] } }, // gold
      'W': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 1.000, 1.000] } }, // white
      'C': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.000, 0.900, 0.900] } }, // cyan
    },
    grid: [
      '000CCC000',
      '000CWC000',
      '000CWC000',
      'CCCGWGCCC',
      'CWWWGWWWC',
      'CCCGWGCCC',
      '000CWC000',
      '000CWC000',
      '000CCC000',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.010, 0.020, 0.040],
      ball: [1.000, 0.843, 0.000],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 9: Stripes diagonales ──────────────────────────────────────────
  {
    brickTemplates: {
      'R': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.150, 0.250] } },
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.500, 0.000] } },
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.900, 0.100] } },
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.100, 1.000, 0.400] } },
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.100, 0.550, 1.000] } },
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.750, 0.250, 1.000] } },
    },
    grid: [
      'RMOJVBRMO',
      'MOJVBRMOJ',
      'OJVBRMOJV',
      'JVBRMOJVB',
      'VBRMOJVBR',
      'BRMOJVBRM',
      'RMOJVBRMO',
      'MOJVBRMOJ',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.020, 0.010, 0.050],
      ball: [0.000, 1.000, 1.000],
      paddle: [1.000, 1.000, 1.000],
    },
  },

  // ── Level 10: Rings ──────────────────────────────────────────────────────
  {
    brickTemplates: {
      'P': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.176, 0.471] } },
      'O': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.420, 0.102] } },
      'J': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [1.000, 0.878, 0.102] } },
      'V': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 1.000, 0.369] } },
      'B': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.102, 0.624, 1.000] } },
      'M': { asset: BrickAssets.Normal, hits: 1, colors: { 1: [0.706, 0.290, 1.000] } },
    },
    grid: [
      '0PPPPPPP0',
      'PP00000PP',
      'P0JJJJJ0P',
      'P0J000J0P',
      'P0J0B0J0P',
      'P0J000J0P',
      'P0JJJJJ0P',
      'PP00000PP',
      '0PPPPPPP0',
    ].join('\n'),
    brickWidth: 0.9, brickHeight: 0.80, paddingX: 0.1125, paddingY: 0.1125, startY: 6.5,
    powerUpSpawnChance: 0,
    palette: {
      background: [0.020, 0.020, 0.031],
      ball: [0.000, 1.000, 0.933],
      paddle: [1.000, 1.000, 1.000],
    },
  },

];
