// ===== Canvas =====
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 800;

// ===== Board Layout =====
export const BOARD_COLS = 7;
export const BOARD_ROWS = 7;
export const GEM_SIZE = 60; // Cell stride (pixels between gem centers)
export const BOARD_MARGIN = 16;

// Board pixel dimensions
export const BOARD_PIXEL_WIDTH = BOARD_COLS * GEM_SIZE; // 420px
export const BOARD_PIXEL_HEIGHT = BOARD_ROWS * GEM_SIZE; // 420px

// Mana HUD strip height below the board
export const MANA_HUD_STRIP_HEIGHT = 48;
// Bottom margin from canvas edge
export const BOARD_BOTTOM_MARGIN = 10;

// Center the board horizontally: (480 - 420) / 2 = 30px margin each side
export const BOARD_OFFSET_X = (CANVAS_WIDTH - BOARD_PIXEL_WIDTH) / 2;
// Align board to bottom: canvas - bottom margin - mana strip - board height
export const BOARD_OFFSET_Y = CANVAS_HEIGHT - BOARD_BOTTOM_MARGIN - MANA_HUD_STRIP_HEIGHT - BOARD_PIXEL_HEIGHT;

// Rendered gem size (slightly smaller than cell for visual spacing between gems)
export const GEM_RENDER_SIZE = GEM_SIZE - 8; // 52px rendered gem
export const GEM_CELL_SIZE = GEM_SIZE; // 60px cell stride

// ===== Scoring =====
export const SCORE_MATCH_3 = 100;
export const SCORE_MATCH_4 = 250;
export const SCORE_MATCH_5 = 500;
export const POINTS_PER_LEVEL = 1000;

// Gem-type count lives in Types.ts (derived from ALL_GEM_TYPES) so adding a
// new gem only requires touching the enum + iteration list in one place.
