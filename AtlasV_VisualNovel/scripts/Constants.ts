// === Canvas Dimensions ===
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 800;
export const GAME_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

// === Color Palette (from Visual Bible) ===
export const COLOR_VOID = '#080D14';
export const COLOR_POND_DEEP = '#0D1E35';
export const COLOR_POND_MID = '#1A3A5C';
export const COLOR_MOONLIGHT = '#C8D8E8';
export const COLOR_LANTERN_WARM = '#E8A84C';
export const COLOR_LANTERN_GLOW = '#F5D08A';
export const COLOR_LILY_WHITE = '#E8EAD8';
export const COLOR_ACCENT_PURPLE = '#9B7FCC';
export const COLOR_UI_DARK_CARD = '#0D1520';
export const COLOR_UI_TEXT_PRIMARY = '#E8EAD8';
export const COLOR_UI_TEXT_SECONDARY = '#8A9AB0';
export const COLOR_UI_SEPARATOR = '#1A3A5C';

// === Float ===
export const FLOAT_X = CANVAS_WIDTH / 2;
export const FLOAT_Y = CANVAS_HEIGHT * 0.58;
export const FLOAT_WIDTH = 24;
export const FLOAT_HEIGHT = 40;
export const FLOAT_BOB_AMPLITUDE = 3;
export const FLOAT_BOB_SPEED = 2.5;

// === Fish Portrait (Zone 2: left-aligned above dialogue bubble) ===
export const FISH_PORTRAIT_SIZE = 140;
export const FISH_PORTRAIT_X = 50; // Shifted right from 20
export const FISH_PORTRAIT_Y = CANVAS_HEIGHT * 0.44; // Shifted down from 0.38

// === Dialogue Bubble (Zone 3: separate from portrait) ===
export const DIALOGUE_BUBBLE_MARGIN = 20;
export const DIALOGUE_BUBBLE_X = DIALOGUE_BUBBLE_MARGIN;
export const DIALOGUE_BUBBLE_Y = CANVAS_HEIGHT * 0.62 + 100;
export const DIALOGUE_BUBBLE_WIDTH = CANVAS_WIDTH - DIALOGUE_BUBBLE_MARGIN * 2;
export const DIALOGUE_BUBBLE_HEIGHT = 120;
export const DIALOGUE_BUBBLE_RADIUS = 12;
export const DIALOGUE_BUBBLE_PADDING = 14;
export const DIALOGUE_BUBBLE_BG_OPACITY = 0.85;

export const DIALOGUE_TEXT_X = DIALOGUE_BUBBLE_X + DIALOGUE_BUBBLE_PADDING;
export const DIALOGUE_TEXT_Y = DIALOGUE_BUBBLE_Y + DIALOGUE_BUBBLE_PADDING;
export const DIALOGUE_TEXT_WIDTH = DIALOGUE_BUBBLE_WIDTH - DIALOGUE_BUBBLE_PADDING * 2;
export const DIALOGUE_TEXT_HEIGHT = DIALOGUE_BUBBLE_HEIGHT - DIALOGUE_BUBBLE_PADDING * 2;
export const DIALOGUE_NAME_HEIGHT = 14;



// === Action Menu (Zone 4: below dialogue) ===
export const ACTION_MENU_Y = CANVAS_HEIGHT * 0.80;
export const ACTION_ROW_HEIGHT = 52;
export const ACTION_MENU_WIDTH = CANVAS_WIDTH * 0.92;
export const ACTION_MENU_X = (CANVAS_WIDTH - CANVAS_WIDTH * 0.92) / 2;

// === Cast Mechanics ===
export const GAUGE_X = CANVAS_WIDTH - 55;
export const GAUGE_Y = CANVAS_HEIGHT * 0.30;
export const GAUGE_WIDTH = 30;
export const GAUGE_HEIGHT = 200;
export const GAUGE_CYCLE_TIME = 1.5;
export const GAUGE_BORDER_RADIUS = 6;
export const GAUGE_INDICATOR_HEIGHT = 12;
export const COLOR_GAUGE_BG = '#1A2A40';
export const COLOR_GAUGE_FILL = '#F09040';
export const COLOR_GAUGE_INDICATOR = '#FFFFFF';
export const COLOR_GAUGE_BORDER = '#3A5A7A';

export const CAST_START_X = CANVAS_WIDTH / 2;
export const CAST_START_Y = CANVAS_HEIGHT * 0.85;
export const CAST_TARGET_X = FLOAT_X;
export const CAST_TARGET_Y = FLOAT_Y;
export const CAST_FLIGHT_TIME = 1.2;
export const CAST_MIN_ARC_HEIGHT = 60;
export const CAST_MAX_ARC_HEIGHT = 220;

export const SPLASH_RIPPLE_COUNT = 3;
export const SPLASH_RIPPLE_DELAY = 0.12;
export const SPLASH_RIPPLE_MAX_RADIUS = 45;
export const SPLASH_RIPPLE_EXPAND_SPEED = 80;

// Float Idle Ripples (periodic ripples while float is stationary in water)
export const FLOAT_IDLE_RIPPLE_INTERVAL = 2.5; // seconds between spawns
export const FLOAT_IDLE_RIPPLE_MAX_RADIUS = 70; // wider spread on title screen
export const FLOAT_IDLE_RIPPLE_EXPAND_SPEED = 35; // slower expansion for longer duration
export const SPLASH_DURATION = 0.8;
export const FLOAT_LANDED_PAUSE = 0.5;

// === Float Bounce (after landing) ===
export const FLOAT_BOUNCE_DURATION = 0.8;
export const FLOAT_BOUNCE_COUNT = 3;
export const FLOAT_BOUNCE_AMPLITUDE = 8;

// === Rod Casting Animation ===
export const ROD_CAST_DURATION = 0.25;

// === 3D Fishing Rod Parameters ===
export const ROD_3D_LENGTH = 2.5; // meters
export const ROD_3D_BASE_X = 2.8; // Projects rod tip to just off-screen right (~508px)
export const ROD_3D_BASE_Y = 0.3; // Low base so tip Y projects to visible range (~250px)
export const ROD_3D_BASE_Z = -1.0; // Moderate depth for balanced perspective
export const ROD_3D_INITIAL_ANGLE = Math.PI / 4; // 45 degrees (pointing up-right)
export const ROD_3D_TIP_Z_FACTOR = 0.3; // Slight forward angle for tip

// Rod Animation Phases (as fraction of total cast time)
export const ROD_PHASE_WINDUP_END = 0.2;
export const ROD_PHASE_ACCELERATE_END = 0.4;
export const ROD_PHASE_RELEASE_END = 0.5;
// Follow-through: 0.5 to 1.0

// Rod Animation Angles (radians)
export const ROD_WINDUP_PULLBACK = Math.PI / 8; // Pull back 22.5 degrees
export const ROD_ACCELERATE_SWING = Math.PI / 2; // Swing up to ~80 degrees
export const ROD_RELEASE_ANGLE = Math.PI / 2 + Math.PI / 8; // ~100 degrees (slightly past vertical)
export const ROD_FOLLOWTHROUGH_SETTLE = Math.PI / 4; // Settle back by 45 degrees

// Rod Animation State Enum
export enum RodState {
  WindUp = 'windup',
  Accelerate = 'accelerate',
  Release = 'release',
  FollowThrough = 'followthrough',
}

// === 3D Physics Cast Toggle ===
export const USE_3D_PHYSICS_CAST = true; // Set to false to use POV or side-view arc

// === Power-Based Landing Range ===
// Low power (0%) lands near fisherman (high Y), high power (100%) lands far (low Y)
export const CAST_LANDING_NEAR_Y = CANVAS_HEIGHT * 0.68; // Close to fisherman (bottom of pond area)
export const CAST_LANDING_FAR_Y = CANVAS_HEIGHT * 0.42;  // Far from fisherman (top of pond area)
// X can vary slightly for realism
export const CAST_LANDING_X_VARIANCE = 20; // +/- pixels from center
export const CAST_LANDING_X_OFFSET = 40; // Shift all landings to the right

// === 3D Physics Cast Parameters ===
export const CAST_3D_GRAVITY_Y = -9.8; // m/s^2
export const CAST_3D_NUM_LINE_SEGMENTS = 15;
export const CAST_3D_SEGMENT_LENGTH = 0.4; // meters (15 × 0.4 = 6m total line)
export const CAST_3D_FOCAL_LENGTH = 3.0; // perspective projection focal length
export const CAST_3D_WATER_Y = -2.0; // Y level where floater lands
export const CAST_3D_MAX_FLIGHT_TIME = 4.0; // seconds max before forced landing
export const CAST_3D_BASE_SPEED = 8.0; // Increased from 5.0 for more powerful cast
export const CAST_3D_POWER_MULTIPLIER = 4.0; // Increased from 3.0
export const CAST_3D_START_DEPTH = 0.2; // Closer to camera (was 0.5)
export const CAST_3D_SCALE_MULTIPLIER = 1.5; // Scale boost in projection
// Inverse-projection ballistic flight time range (power 0→100 maps high→low time)
export const CAST_3D_CALC_MIN_FLIGHT_TIME = 1.8; // Fast cast (high power) — still arcs upward visibly
export const CAST_3D_CALC_MAX_FLIGHT_TIME = 2.8; // Slow, high arc (low power) — dramatic upward arc

// === POV Cast Animation Toggle ===
export const USE_POV_CAST_ANIMATION = true; // Set to false for side-view arc

// === POV Cast Animation Parameters ===
export const POV_CAST_START_X = 400; // Right side (right hand position)
export const POV_CAST_START_Y = 650; // Bottom of screen (close to camera)
export const POV_CAST_START_SCALE = 2.0; // Very large (in hand)
export const POV_CAST_END_SCALE = 0.5; // Subtle growth during fall (avoids "coming toward camera" effect)
export const POV_CAST_PEAK_X = 200; // Center-left (natural arm swing arc)
export const POV_CAST_PEAK_Y = 100; // High up in the sky (far away)
export const POV_CAST_PEAK_SCALE = 0.3; // Very small at peak (far away)
export const POV_CAST_PEAK_T = 0.4; // Peak occurs at 40% of flight
export const POV_CAST_FLIGHT_TIME = 1.4; // Duration of cast flight
// Fishing line origin for POV (bottom-right, where hand is)
export const POV_LINE_START_X = 540; // Off-screen right (rod held by viewer)
export const POV_LINE_START_Y = -80;  // Off-screen above (creates "held from outside frame" effect)

// === Fishing Line (Side-View) ===
export const LINE_START_X = CANVAS_WIDTH + 60; // Off-screen right (rod held outside frame)
export const LINE_START_Y = -80; // Off-screen above top edge

// === Title Screen Rod Tip (calculated from XAML transforms on rod.png) ===
// rod.png attachment point (2,12) after RenderTransformOrigin=0.5,0.5, Rotate 42°, Translate(188,113)
export const TITLE_LINE_START_X = 341;
export const TITLE_LINE_START_Y = 254;

// === Timing (seconds) ===
export const APPROACH_DURATION = 2.0;
export const DEPARTURE_DURATION = 2.0;
export const TEXT_DISPLAY_SPEED = 0.04;
export const BEAT_PAUSE_DURATION = 0.5;

// === Affection Thresholds ===
export const AFFECTION_DRIFT_AWAY_THRESHOLD = -10; // Triggers Drift-Away ending when affection drops this low
export const AFFECTION_MAX = 50;

// === Action Definitions (4 actions) ===
export enum ActionId {
  Wait = 'wait',
  Twitch = 'twitch',
  Drift = 'drift',
  Reel = 'reel',
}

export interface ActionDefinition {
  id: ActionId;
  name: string;
  fishingMeaning: string;
  emotionalIntent: string;
  description: string;
}

export const ACTIONS: ActionDefinition[] = [
  {
    id: ActionId.Wait,
    name: 'Wait',
    fishingMeaning: 'Hold perfectly still',
    emotionalIntent: 'LISTEN',
    description: 'Be patient',
  },
  {
    id: ActionId.Twitch,
    name: 'Twitch',
    fishingMeaning: 'Small jerk of the line',
    emotionalIntent: 'FLIRT',
    description: 'Get noticed',
  },
  {
    id: ActionId.Drift,
    name: 'Drift',
    fishingMeaning: 'Slack in the line',
    emotionalIntent: 'RELAX',
    description: 'Give space',
  },
  {
    id: ActionId.Reel,
    name: 'Reel',
    fishingMeaning: 'Strong pull',
    emotionalIntent: 'CAPTURE',
    description: 'Capture',
  },
];

// === Action Animation Constants ===
export const ACTION_ANIM_WAIT_DURATION = 2.0;       // seconds - one full slow bob cycle
export const ACTION_ANIM_WAIT_AMPLITUDE = 4;        // pixels - gentle vertical bob
export const ACTION_ANIM_WAIT_SPEED = 3.0;          // radians/sec - slow sine

export const ACTION_ANIM_REEL_DURATION = 0.8;       // seconds - quick pull + bounce
export const ACTION_ANIM_REEL_PULL_Y = -18;         // pixels - upward pull distance
export const ACTION_ANIM_REEL_BOUNCE_COUNT = 3;     // number of resistance bounces
export const ACTION_ANIM_REEL_BOUNCE_DECAY = 0.5;   // bounce amplitude decay factor

export const ACTION_ANIM_DRIFT_DURATION = 1.8;      // seconds - slow lateral drift
export const ACTION_ANIM_DRIFT_AMPLITUDE_X = 20;    // pixels - horizontal sway distance
export const ACTION_ANIM_DRIFT_AMPLITUDE_Y = 2;     // pixels - subtle vertical bob during drift

export const ACTION_ANIM_TWITCH_DURATION = 0.4;     // seconds - sharp quick jerk
export const ACTION_ANIM_TWITCH_AMPLITUDE_Y = -10;  // pixels - sharp upward jerk
export const ACTION_ANIM_TWITCH_AMPLITUDE_X = 4;    // pixels - slight horizontal wiggle

// === Emotion Icon Constants ===
export const EMOTION_ICON_SIZE = 48;

// === Character Ripple Animation (expansion + fade, same as splash ripples) ===
export const CHAR_RIPPLE_SPAWN_INTERVAL = 2.5; // seconds between new ripple spawns (synced with float)
export const CHAR_RIPPLE_MAX_RADIUS = 100; // max horizontal radius before removal (larger than float)
export const CHAR_RIPPLE_EXPAND_SPEED = 50; // pixels/sec expansion rate
export const CHAR_RIPPLE_Y_SQUISH = 0.35; // vertical squish factor (ellipse)

// === Fade Transition ===
export const FADE_OUT_DURATION = 0.6; // seconds to fade to black
export const FADE_IN_DURATION = 0.6;  // seconds to fade back in

// === Nothing Bites ===
export const NOTHING_BITES_DURATION = 2.5; // seconds before auto-returning to idle
export const EMOTION_ICON_Y_OFFSET = -30; // Higher above portrait top edge
export const EMOTION_ICON_DURATION = 2.5; // seconds total
export const FLOAT_SURPRISE_EMOJI_DURATION = 0.25; // seconds — quick flash before portrait appears
export const EMOTION_ICON_BOUNCE_TIME = 0.4; // seconds for bounce-in animation
export const EMOTION_ICON_FADE_TIME = 0.5; // seconds for fade-out (scale down + float up)
export const EMOTION_ICON_SPACING = 44; // horizontal gap between stacked icons
