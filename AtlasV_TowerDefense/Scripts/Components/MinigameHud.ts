/**
 * MinigameHud — Card shuffle (shell game) minigame controller.
 *
 * Component Attachment: Scene entity (MinigameUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * State machine: Reveal -> FlipDown -> Shuffle -> Pick -> Result -> Done
 * Cards are positioned via ViewModel posX/posY and animated per-frame.
 * Card flip animation: ScaleX animates 1→0→1 with ScaleY pop (1→1.05→1) for 3D depth effect.
 */
import {
  Component,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  CustomUiComponent,
  TextureAsset,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import { ResourceService } from '../Services/ResourceService';

// --- Constants ---
const REVEAL_DURATION = 2.5;       // seconds cards stay face up
const FLIP_DOWN_DURATION = 0.4;    // seconds for flip-down animation
const SWAP_COUNT_MIN = 5;
const SWAP_COUNT_MAX = 8;
const SWAP_DURATION_START = 0.45;  // seconds for first swap
const SWAP_DURATION_END = 0.18;    // seconds for last swap
const REVEAL_OTHERS_DELAY = 0.6;   // seconds before revealing remaining cards
const RESULT_DURATION = 2.5;       // seconds to show result (after all cards revealed)
const GOLD_BONUS = 50;
const GOLD_MALUS = 30;
const LIVES_BONUS = 2;
const LIVES_MALUS = 2;

// Card types
const CARD_GOLD_BONUS = 'gold_bonus';
const CARD_GOLD_MALUS = 'gold_malus';
const CARD_HEART_BONUS = 'heart_bonus';
const CARD_HEART_MALUS = 'heart_malus';
const CARD_NEUTRAL = 'neutral';

// Full pool of card types (each minigame picks 3 randomly from this)
const CARD_POOL: string[] = [CARD_GOLD_BONUS, CARD_GOLD_MALUS, CARD_HEART_BONUS, CARD_HEART_MALUS, CARD_NEUTRAL];

// Card positions (portrait 1080 wide, cards ~208px each, centered)
const CARD_Y = 700;
const CARD_POSITIONS = [193, 436, 679]; // posX for 3 cards (left edge of each card)
const SWAP_ARC_HEIGHT = 70; // pixels of Y offset at the peak of the arc

// Flip animation constants
const FLIP_HALF_DURATION = 0.17; // seconds per half-flip (total ~0.34s)

enum MinigameState {
  Inactive = 0,
  Reveal = 1,
  FlipDown = 2,
  Shuffle = 3,
  Pick = 4,
  RevealChosen = 5,   // chosen card revealed, waiting to reveal others
  RevealOthers = 6,   // other cards flipping up
  Result = 7,
  Done = 8,
}

// Flip animation direction
enum FlipDirection {
  ToFaceDown = 0,
  ToFaceUp = 1,
}

// Per-card flip animation state
interface CardFlipState {
  active: boolean;
  progress: number;      // 0..1 across the full flip
  direction: FlipDirection;
  faceSwapped: boolean;  // whether face has been swapped at midpoint
}

// --- Sub-ViewModel for a single card ---

@uiViewModel()
export class MinigameCardViewModel extends UiViewModel {
  posX: number = 0;
  posY: number = 0;
  faceUp: boolean = true;
  /** Inverse of faceUp - used by XAML to show the card back without a negate converter. */
  faceDown: boolean = false;
  cardType: string = CARD_NEUTRAL; // 'bonus', 'malus', 'neutral'
  cardIndex: string = '0';         // CommandParameter for tap
  label: string = '';
  icon: string = '';               // money bag, skull, dash
  iconImage: Maybe<TextureAsset> = null;  // TextureAsset for card icon image
  /** Horizontal scale for 3D flip effect (1=full, 0=edge-on). */
  cardScaleX: number = 1;
  /** Vertical scale for subtle depth pop during flip (1=normal, ~1.05=popped). */
  cardScaleY: number = 1;
}

// --- Main ViewModel ---

@uiViewModel()
export class MinigameViewModel extends UiViewModel {
  override readonly events = {
    cardTap: UiEvents.minigameCardTap,
  };

  visible: boolean = false;
  cards: readonly MinigameCardViewModel[] = [];
  feedbackText: string = '';
  feedbackVisible: boolean = false;
  titleText: string = 'Memorize the cards!';
}

// --- Component ---

@component()
export class MinigameHud extends Component {
  private viewModel: Maybe<MinigameViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  private state: MinigameState = MinigameState.Inactive;
  private stateTimer: number = 0;
  private levelIndex: number = 0;

  // Card data (logical order: which card type is at which slot)
  private cardTypes: string[] = [CARD_NEUTRAL, CARD_NEUTRAL, CARD_NEUTRAL];

  // Persistent card ViewModel references (mutated in place to avoid flicker)
  private cardViewModels: MinigameCardViewModel[] = [];

  // Shuffle state
  private swapCount: number = 0;
  private currentSwap: number = 0;
  private swapProgress: number = 0;
  private swapDuration: number = SWAP_DURATION_START;
  private swapA: number = 0;
  private swapB: number = 0;
  // Animated positions (actual pixel X and Y) per card slot
  private cardPosX: number[] = [...CARD_POSITIONS];
  private cardPosY: number[] = [CARD_Y, CARD_Y, CARD_Y];
  private swapStartA: number = 0;
  private swapStartB: number = 0;

  // Flip animation state per card
  private flipStates: CardFlipState[] = [
    { active: false, progress: 0, direction: FlipDirection.ToFaceDown, faceSwapped: false },
    { active: false, progress: 0, direction: FlipDirection.ToFaceDown, faceSwapped: false },
    { active: false, progress: 0, direction: FlipDirection.ToFaceDown, faceSwapped: false },
  ];

  // Result
  private chosenResult: string = CARD_NEUTRAL;
  private chosenIndex: number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new MinigameViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  /**
   * Public method called by OverworldHud to show the minigame as an overlay.
   * No phase transition needed - the overworld stays visible behind the dark backdrop.
   */
  public showMinigame(levelIndex: number): void {
    if (!this.viewModel) return;
    this.levelIndex = levelIndex;
    this._startMinigame();
  }

  @subscribe(UiEvents.minigameCardTap, { execution: ExecuteOn.Owner })
  onCardTap(payload: UiEvents.MinigameCardTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.state !== MinigameState.Pick) return;

    const idx = parseInt(payload.parameter, 10);
    if (isNaN(idx) || idx < 0 || idx > 2) return;

    console.log(`[MinigameHud] Card ${idx} tapped, type=${this.cardTypes[idx]}`);
    this._resolveChoice(idx);
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.state === MinigameState.Inactive) return;

    const dt = payload.deltaTime;
    this.stateTimer += dt;

    // Always tick flip animations
    this._tickFlipAnimations(dt);

    switch (this.state) {
      case MinigameState.Reveal:
        if (this.stateTimer >= REVEAL_DURATION) {
          this._enterFlipDown();
        }
        break;

      case MinigameState.FlipDown:
        // Wait until all flip animations complete
        if (!this._anyFlipActive()) {
          this._enterShuffle();
        }
        break;

      case MinigameState.Shuffle:
        this._tickShuffle(dt);
        break;

      case MinigameState.RevealChosen:
        // Wait until chosen card flip finishes, then start delay for others
        if (!this._anyFlipActive() && this.stateTimer >= REVEAL_OTHERS_DELAY) {
          this._startRevealOthers();
        }
        break;

      case MinigameState.RevealOthers:
        // Wait until all flips done, then enter Result
        if (!this._anyFlipActive()) {
          this.state = MinigameState.Result;
          this.stateTimer = 0;
        }
        break;

      case MinigameState.Result:
        if (this.stateTimer >= RESULT_DURATION) {
          this._finish();
        }
        break;

      default:
        break;
    }
  }

  // --- Flip Animation ---

  /** Start a flip animation for a specific card. */
  private _startFlip(cardIndex: number, direction: FlipDirection): void {
    const fs = this.flipStates[cardIndex];
    fs.active = true;
    fs.progress = 0;
    fs.direction = direction;
    fs.faceSwapped = false;
  }

  /** Returns true if any card is currently flipping. */
  private _anyFlipActive(): boolean {
    return this.flipStates[0].active || this.flipStates[1].active || this.flipStates[2].active;
  }

  /** Tick all active flip animations. */
  private _tickFlipAnimations(dt: number): void {
    const totalDuration = FLIP_HALF_DURATION * 2;

    for (let i = 0; i < 3; i++) {
      const fs = this.flipStates[i];
      if (!fs.active) continue;

      fs.progress += dt / totalDuration;

      if (fs.progress >= 1) {
        // Complete the flip
        fs.progress = 1;
        fs.active = false;
        this._applyFlipScale(i, 1, 1);
        // Ensure face is in final state
        if (!fs.faceSwapped) {
          this._swapCardFace(i, fs.direction);
          fs.faceSwapped = true;
        }
      } else if (fs.progress >= 0.5 && !fs.faceSwapped) {
        // Midpoint: swap the face content (card is edge-on / invisible)
        this._swapCardFace(i, fs.direction);
        fs.faceSwapped = true;
        this._applyFlipScale(i, 0, 1.05);
      } else {
        // Animate scaleX: first half 1->0, second half 0->1
        // Animate scaleY: peaks at 1.05 at midpoint (simulates card coming toward viewer)
        let scaleX: number;
        let scaleY: number;
        if (fs.progress < 0.5) {
          // First half: scaleX shrinks 1->0, scaleY grows 1->1.05
          const t = fs.progress / 0.5; // 0..1 in first half
          const eased = this._easeInOut(t);
          scaleX = 1 - eased;
          scaleY = 1 + 0.05 * eased;
        } else {
          // Second half: scaleX expands 0->1, scaleY shrinks 1.05->1
          const t = (fs.progress - 0.5) / 0.5; // 0..1 in second half
          const eased = this._easeInOut(t);
          scaleX = eased;
          scaleY = 1.05 - 0.05 * eased;
        }
        this._applyFlipScale(i, scaleX, scaleY);
      }
    }
  }

  /** Set the cardScaleX and cardScaleY on a card ViewModel for 3D flip effect. */
  private _applyFlipScale(cardIndex: number, scaleX: number, scaleY: number): void {
    const card = this.cardViewModels[cardIndex];
    if (card) {
      card.cardScaleX = Math.max(0, scaleX);
      card.cardScaleY = scaleY;
    }
  }

  /** Swap the card's visual face based on flip direction. */
  private _swapCardFace(cardIndex: number, direction: FlipDirection): void {
    const card = this.cardViewModels[cardIndex];
    if (!card) return;

    const showFaceUp = direction === FlipDirection.ToFaceUp;
    card.faceUp = showFaceUp;
    card.faceDown = !showFaceUp;
    card.label = showFaceUp ? this._labelForType(this.cardTypes[cardIndex]) : '?';
    card.icon = showFaceUp ? this._iconForType(this.cardTypes[cardIndex]) : '';
    card.iconImage = showFaceUp ? this._iconImageForType(this.cardTypes[cardIndex]) : null;
  }

  // --- State transitions ---

  private _startMinigame(): void {
    if (!this.viewModel) return;
    console.log('[MinigameHud] Starting minigame');

    // Pick 3 distinct card types from the pool (no duplicates)
    // Validation: re-draw if no bonus card (gold_bonus or heart_bonus) is present
    let drawn: string[];
    do {
      const poolCopy = [...CARD_POOL];
      this._shuffleArray(poolCopy);
      drawn = poolCopy.slice(0, 3);
    } while (!drawn.some(c => c === CARD_GOLD_BONUS || c === CARD_HEART_BONUS));
    this.cardTypes = drawn;

    // Reset positions
    this.cardPosX = [...CARD_POSITIONS];
    this.cardPosY = [CARD_Y, CARD_Y, CARD_Y];

    // Reset flip states
    for (let i = 0; i < 3; i++) {
      this.flipStates[i].active = false;
      this.flipStates[i].progress = 0;
      this.flipStates[i].faceSwapped = false;
    }

    // Build persistent card ViewModels (face up, full width)
    this._buildPersistentCards(true);

    this.viewModel.visible = true;
    this.viewModel.feedbackVisible = false;
    this.viewModel.titleText = 'Memorize the cards!';
    if (this.uiComponent) this.uiComponent.isVisible = true;

    this.state = MinigameState.Reveal;
    this.stateTimer = 0;
  }

  private _enterFlipDown(): void {
    if (!this.viewModel) return;
    console.log('[MinigameHud] Flipping cards down (animated)');
    this.viewModel.titleText = '';

    // Start flip animation for all 3 cards simultaneously (face up -> face down)
    for (let i = 0; i < 3; i++) {
      this._startFlip(i, FlipDirection.ToFaceDown);
    }

    this.state = MinigameState.FlipDown;
    this.stateTimer = 0;
  }

  private _enterShuffle(): void {
    console.log('[MinigameHud] Starting shuffle');
    this.viewModel!.titleText = 'Watch closely...';
    this.swapCount = SWAP_COUNT_MIN + Math.floor(Math.random() * (SWAP_COUNT_MAX - SWAP_COUNT_MIN + 1));
    this.currentSwap = 0;
    this._startNextSwap();

    this.state = MinigameState.Shuffle;
    this.stateTimer = 0;
  }

  private _startNextSwap(): void {
    // Pick random pair
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 2);
    if (b >= a) b++;
    this.swapA = a;
    this.swapB = b;
    this.swapProgress = 0;

    // Lerp swap duration from start to end based on progress
    const t = this.currentSwap / Math.max(1, this.swapCount - 1);
    this.swapDuration = SWAP_DURATION_START + t * (SWAP_DURATION_END - SWAP_DURATION_START);

    // Record start positions
    this.swapStartA = this.cardPosX[a];
    this.swapStartB = this.cardPosX[b];
  }

  private _tickShuffle(dt: number): void {
    if (!this.viewModel) return;

    this.swapProgress += dt / this.swapDuration;

    if (this.swapProgress >= 1) {
      // Snap to final positions
      this.cardPosX[this.swapA] = this.swapStartB;
      this.cardPosX[this.swapB] = this.swapStartA;
      // Reset Y positions back to baseline
      this.cardPosY[this.swapA] = CARD_Y;
      this.cardPosY[this.swapB] = CARD_Y;

      this.currentSwap++;
      if (this.currentSwap >= this.swapCount) {
        this._enterPick();
        return;
      }
      this._startNextSwap();
    } else {
      // Lerp X positions with easing (ease in-out)
      const t = this._easeInOut(this.swapProgress);
      this.cardPosX[this.swapA] = this.swapStartA + (this.swapStartB - this.swapStartA) * t;
      this.cardPosX[this.swapB] = this.swapStartB + (this.swapStartA - this.swapStartB) * t;

      // Arc Y offset using sine curve: peaks at midpoint (swapProgress = 0.5)
      const arcOffset = Math.sin(this.swapProgress * Math.PI) * SWAP_ARC_HEIGHT;
      // Card A arcs upward (lower Y value = visually higher), Card B arcs downward
      this.cardPosY[this.swapA] = CARD_Y - arcOffset;
      this.cardPosY[this.swapB] = CARD_Y + arcOffset;
    }

    // Update ViewModel positions (mutates in place, no array rebuild)
    this._updateCardPositions();
  }

  private _enterPick(): void {
    if (!this.viewModel) return;
    console.log('[MinigameHud] Awaiting player pick');
    this.viewModel.titleText = 'Pick a card!';
    this._updateCardPositions();
    this.state = MinigameState.Pick;
    this.stateTimer = 0;
  }

  private _resolveChoice(idx: number): void {
    if (!this.viewModel) return;
    this.chosenResult = this.cardTypes[idx];
    this.chosenIndex = idx;

    // Animate chosen card flipping face-up
    this._startFlip(idx, FlipDirection.ToFaceUp);

    // Apply effect
    let feedbackText = '';
    switch (this.chosenResult) {
      case CARD_GOLD_BONUS:
        ResourceService.get().applyBonus(GOLD_BONUS);
        feedbackText = `+${GOLD_BONUS} Gold next level`;
        console.log(`[MinigameHud] Gold Bonus: +${GOLD_BONUS} gold next level`);
        break;
      case CARD_GOLD_MALUS:
        ResourceService.get().applyMalus(GOLD_MALUS);
        feedbackText = `-${GOLD_MALUS} Gold next level`;
        console.log(`[MinigameHud] Gold Malus: -${GOLD_MALUS} gold next level`);
        break;
      case CARD_HEART_BONUS:
        ResourceService.get().applyLivesBonus(LIVES_BONUS);
        feedbackText = `+${LIVES_BONUS} Hearts next level`;
        console.log(`[MinigameHud] Heart Bonus: +${LIVES_BONUS} lives next level`);
        break;
      case CARD_HEART_MALUS:
        ResourceService.get().applyLivesMalus(LIVES_MALUS);
        feedbackText = `-${LIVES_MALUS} Hearts next level`;
        console.log(`[MinigameHud] Heart Malus: -${LIVES_MALUS} lives next level`);
        break;
      case CARD_NEUTRAL:
      default:
        feedbackText = 'Nothing happens';
        console.log('[MinigameHud] Neutral: no effect');
        break;
    }

    this.viewModel.feedbackText = feedbackText;
    this.viewModel.feedbackVisible = true;
    this.viewModel.titleText = '';

    this.state = MinigameState.RevealChosen;
    this.stateTimer = 0;
  }

  /** Start flipping the non-chosen cards face up (staggered). */
  private _startRevealOthers(): void {
    console.log('[MinigameHud] Revealing other cards (staggered)');
    for (let i = 0; i < 3; i++) {
      if (i === this.chosenIndex) continue;
      // Stagger: second card starts slightly later via a delayed progress offset
      this._startFlip(i, FlipDirection.ToFaceUp);
    }
    this.state = MinigameState.RevealOthers;
    this.stateTimer = 0;
  }

  private _finish(): void {
    console.log('[MinigameHud] Minigame finished, firing LevelCompleted');
    this._hide();

    // Fire LevelCompleted so OverworldHud unlocks the next node
    const lcp = new Events.LevelCompletedPayload();
    lcp.levelIndex = this.levelIndex;
    EventService.sendLocally(Events.LevelCompleted, lcp);
  }

  private _hide(): void {
    if (this.viewModel) {
      this.viewModel.visible = false;
      this.viewModel.feedbackVisible = false;
    }
    if (this.uiComponent) this.uiComponent.isVisible = false;
    this.state = MinigameState.Inactive;
  }

  // --- Helpers ---

  /** Creates persistent card ViewModel instances, stores them, and assigns once to viewModel.cards. */
  private _buildPersistentCards(faceUp: boolean): void {
    if (!this.viewModel) return;
    this.cardViewModels = [];
    for (let i = 0; i < 3; i++) {
      const card = new MinigameCardViewModel();
      card.posX = this.cardPosX[i];
      card.posY = CARD_Y;
      card.faceUp = faceUp;
      card.faceDown = !faceUp;
      card.cardType = this.cardTypes[i];
      card.cardIndex = `${i}`;
      card.label = faceUp ? this._labelForType(this.cardTypes[i]) : '?';
      card.icon = faceUp ? this._iconForType(this.cardTypes[i]) : '';
      card.iconImage = faceUp ? this._iconImageForType(this.cardTypes[i]) : null;
      card.cardScaleX = 1;
      card.cardScaleY = 1;
      this.cardViewModels.push(card);
    }
    this.viewModel.cards = this.cardViewModels;
  }

  /** Mutates posX/posY on existing card VMs during shuffle (no array rebuild = no flicker). */
  private _updateCardPositions(): void {
    for (let i = 0; i < 3; i++) {
      const card = this.cardViewModels[i];
      if (!card) continue;
      card.posX = this.cardPosX[i];
      card.posY = this.cardPosY[i];
    }
  }

  private _labelForType(type: string): string {
    switch (type) {
      case CARD_GOLD_BONUS: return '+50 Gold';
      case CARD_GOLD_MALUS: return '-30 Gold';
      case CARD_HEART_BONUS: return '+2 Hearts';
      case CARD_HEART_MALUS: return '-2 Hearts';
      case CARD_NEUTRAL: return 'Nothing';
      default: return '?';
    }
  }

  private _iconForType(type: string): string {
    switch (type) {
      case CARD_GOLD_BONUS: return '\ud83d\udcb0';
      case CARD_GOLD_MALUS: return '\ud83d\udc80';
      case CARD_HEART_BONUS: return '\u2764\ufe0f';
      case CARD_HEART_MALUS: return '\ud83d\udc94';
      case CARD_NEUTRAL: return '\u2014';
      default: return '?';
    }
  }

  private _iconImageForType(type: string): TextureAsset | null {
    switch (type) {
      case CARD_GOLD_BONUS: return new TextureAsset('@sprites/minigame_icon_gold_bonus.png');
      case CARD_GOLD_MALUS: return new TextureAsset('@sprites/minigame_icon_gold_malus.png');
      case CARD_HEART_BONUS: return new TextureAsset('@sprites/minigame_icon_heart_bonus.png');
      case CARD_HEART_MALUS: return new TextureAsset('@sprites/minigame_icon_heart_malus.png');
      case CARD_NEUTRAL: return new TextureAsset('@sprites/minigame_icon_neutral.png');
      default: return null;
    }
  }

  private _easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }

  private _shuffleArray(arr: string[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}
