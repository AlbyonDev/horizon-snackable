# FloaterGame refactor — progress tracker

Decomposing `scripts/FloaterGame.ts` (3865 lines, ~75 methods, ~80 state fields) into 8 focused modules with pure subsystems and constructor injection.

State strategy: **Option C** — distributed state. Each controller owns its own state. A minimal `FloaterSharedState` holds only fields genuinely read/written by multiple controllers.

Communication: each controller receives the systems it needs + a `FloaterSharedState` reference + minimal interfaces of sibling controllers (to avoid circular ownership), via constructor injection. No internal event bus.

**Build strategy**: the original `FloaterGame.ts` stays untouched. New code is written into fresh files. At step 8 we assemble `FloaterGameV2.ts` as the orchestrator. The `@component()` decorator stays on the old class until the final swap — only one component can claim the scene entity at a time.

## Step status

- [x] **Step 1** — Create `FloaterSharedState.ts` ✓ Imports verified against Types.ts, CastData.ts, AffectionSystem.ts.
- [x] **Step 2** — Extract `CastSimulation.ts` ✓ 917 lines. IDE diagnostics clean. Two `require()` removed in favor of top-level imports. Action-anim float visuals owned here (Wait/Twitch/Drift/Reel offsets), triggered via `applyActionImpact(actionId)` from DialogueController.
- [x] **Step 3** — Extract `AnimationsRunner.ts` ✓ 729 lines. All anim timers/states centralized. Three callback hooks (`onFadeToBlackComplete`, `onIntroComplete`, `onDayNightSwap`) keep gameplay decisions out of this file. `spawnEmotionIcon` takes `landingTargetX/Y` as args (caller passes from CastSim) since AnimationsRunner doesn't own that.
- [x] **Step 4** — Extract `SaveCoordinator.ts` ✓ 257 lines. Uses `{current: T}` ref-box pattern for replaceable subsystems (FlagSystem, QuestSystem, CGGallerySystem, JournalSystem, GlobalStatsSystem) because `resetAllGameState` swaps instances; controllers reading through `ref.current` see the new instance. Two hooks: `onLoadComplete`, `onGameplayReset`. `seenBeats` Set ownership lives with DialogueController; coordinator only marshalls it through buildSaveData / loadGame.
- [x] **Step 5** — Extract `UIPresenter.ts` ✓ 452 lines. Unified `present()` replaces both `render()` and `syncViewModelFromState()` — single source of truth for VM visibility. `syncFromState()` is the no-draw variant for save-load / hot-reload paths. Takes a `DialogueSnapshot` from DialogueController each frame (avoids exposing dialogue internals). Uses ref-boxes for the replaceable subsystems (consistent with SaveCoordinator). Compromise: `FloatLanded` line transition reads progress from `splashRipples[0]` instead of `floatLandedTimer` (private in CastSim); behaviorally equivalent since both follow the same `FLOAT_LANDED_PAUSE` timeline.
- [x] **Step 6** — Extract `DialogueController.ts` (548) + `PhaseController.ts` (516) ✓ Cycle avoided via `PhaseTransitions` interface (dialogue depends on it; PhaseController implements it). DialogueController exposes `snapshot()` for the presenter. `advanceDepartureDialogue()` returns bool so PhaseController owns end-of-cast bookkeeping rather than nesting it inside dialogue. `floatingIcons` mutated cross-controller (PhaseController clears it on Departure/Ending) — owned by anim, written through.
- [x] **Step 7** — Extract `InputController.ts` ✓ 214 lines. Phase-based routing only — no gameplay logic. Touch-end cast launch writes `state.phase = CastFlying` directly (input has the strongest UX claim on that immediate transition).
- [x] **Step 8** — Create `FloaterGameV2.ts` orchestrator ✓ 537 lines. Pure wiring harness — no gameplay/render/anim logic. `@component()` decorator intentionally omitted (single-component-per-entity constraint). Late-binding via arrow-function proxies in hooks so controllers can reference each other through `this.X` without ordering issues at construction.
- [ ] **Swap** — Move `@component()` from `FloaterGame.ts` to V2; rename old file to `.legacy.ts` (or delete after sign-off)

## Swap procedure (when ready)

1. Open [FloaterGameV2.ts](scripts/FloaterGameV2.ts), find the comment `// component, // @component() goes here at swap time`. Replace it with `component,` and add `@component()` above `export class FloaterGameV2 extends Component`.
2. Open [FloaterGame.ts](scripts/FloaterGame.ts), remove the `@component()` decorator on the `FloaterGame` class.
3. Test in the editor. The scene entity will now claim FloaterGameV2's component.
4. Once you've confirmed parity (intro plays, cast lands, dialogue + actions + endings work, save/load round-trips, reset works, hot-reload survives), delete `FloaterGame.ts`.

## Parity checklist for testing

Critical flows to walk through:
- [ ] Fresh launch: title → Start → fade → intro typewriter → fade to LakeIdle.
- [ ] Cast with drag: idle bar → tap Cast → drag → release → flight → land → bounce.
- [ ] Encounter "nothing bites": cast in wrong zone/phase/lure → nothing bites toast → back to LakeIdle.
- [ ] Encounter success: Approach → portrait fade in → Hesitation emoji → Exchange → ActionSelect → action → FishReaction → next beat / monologue auto-advance.
- [ ] Skip toggle: during Exchange/FishReaction/Departure, button visible, toggles, auto-cancels at unseen beats and ActionSelect.
- [ ] Silent beat (Four Minutes): Wait button enabled, others gated by timer, unlock when timer hits.
- [ ] Action effects: affection delta applies, flags set/clear/disable, CG unlocks, portrait shake/bounce, float dip/tension.
- [ ] Ending: `#ending:<id>` triggers, epitaph fades in + typewriter, tap once to complete text, tap again to dismiss / show CG / return to LakeIdle. Tap-through three states.
- [ ] Departure: dialogue plays, fade-out at last line, auto-finalizes when fish alpha hits 0.
- [ ] Journal: open from idle bar, tab switching, character detail open/close.
- [ ] Inventory: open from idle bar, equip lure, equipped lure persists.
- [ ] Day/Night: toggle button → mid-fade swap → background changes.
- [ ] Save: changes persist across reload (affection, casts, flags, journal, CG, lure, intro_seen).
- [ ] Reset: confirm dialog → wipes save → CG unlocks survive → back to title.
- [ ] Hot reload: in-editor reload preserves the running phase + VM state.

## Final line count

| File | Lines | Notes |
|---|---|---|
| `FloaterGame.ts` (legacy) | 3865 | To be removed after parity sign-off |
| `FloaterSharedState.ts` | ~65 | Pure data |
| `CastSimulation.ts` | 917 | Physics + trajectory + action float anims |
| `AnimationsRunner.ts` | 729 | All UI/cosmetic animation |
| `SaveCoordinator.ts` | 257 | Save/load/reset orchestration |
| `UIPresenter.ts` | 452 | Unified render + VM sync |
| `DialogueController.ts` | 548 | Beat flow + skip + handleAction |
| `PhaseController.ts` | 516 | State machine + transitions |
| `InputController.ts` | 214 | Touch routing |
| `FloaterGameV2.ts` | 537 | Wiring harness only |
| **Total new code** | **4235** | Vs. 3865 original — overhead is constructor wiring + interface boundaries |

The extra ~370 lines are the cost of explicit injection + interface contracts. Net win: every file has a single responsibility, the duplicate `render`/`syncViewModelFromState` logic is unified, and reset/load flows are no longer scattered across the orchestrator.

Sanity check after each step: file compiles syntactically (Read + Grep imports), no orphan references (`this.X` where X no longer exists), no obvious wiring gaps.

## Field ownership map

### → `FloaterSharedState` (read/written by 3+ controllers)

| Field | Type | Read by |
|---|---|---|
| `phase` | `GamePhase` | all |
| `time` | `number` | presenter (render bobs), anims |
| `fish` | `FishCharacter` | dialogue, presenter, save, cast |
| `fishAffection` | `FishAffection` | dialogue, presenter, save |
| `displayedAffectionLabel` | `string` | presenter, dialogue (cast boundary) |
| `sessionId` | `string` | dialogue (action delta) |
| `castCount` | `number` | save, dialogue, presenter |
| `currentCastIndex` | `number` | dialogue, save, presenter |
| `perFishCastIndex` | `Record` | save, dialogue |
| `equippedLureId` | `string\|null` | input, cast, save, presenter |
| `savedFishRecords` | `Record` | save, cast, dialogue |
| `isDayMode` | `boolean` | input, cast (zone), presenter (bg) |

### → `DialogueController`

- `beats[]`, `currentBeatIndex`, `pendingNextBeatId`, `pendingTriggerEnding`
- `cgsUnlockedThisCast`, `seenBeats`, `flagsAtCastStart`
- `currentLines[]`, `currentLineIndex`, `displayedText`, `textProgress`
- `isTextComplete`, `isShowingReaction`, `currentReactionIsTerminal`
- `canSkip`, `skipActive`, `skipAdvanceTimer`
- `silentBeatActive`, `silentBeatTimer`, `silentBeatDuration`, `silentBeatUnlocked`
- `beatPauseTimer`, `noLureWarningTimer`, `nothingBitesTimer`, `departureFadeTimer`

Methods: `startNextBeat`, `startNewLine`, `advanceDialogue`, `advanceDepartureDialogue`, `completeCurrentText`, `handleAction`, `updateTypewriter`, `updateSkip`, `cancelSkip`, `syncAffectionBoundaryFlags`, `advanceToNextBeat`, `isAtEndOfCast`

### → `PhaseController`

- `phaseTimer`
- `approachPortraitDelay`, `approachEmotionDelay`, `approachEmotionSpawned`

Methods (transitions): `enterLakeIdle`, `enterExchange`, `enterDeparture`, `enterInkDeparture`, `triggerEnding`, `openMostRecentEndingCG`, `startCast`, `enterFloatBounce`, `onFloatLanded`, `startIntro`, `update(dt)` (dispatches per phase)

### → `CastSimulation`

State:
- `powerGaugeValue`, `powerGaugeDir`, `castPower`, `lastCastPower`, `castPeakFraction`
- `isInCastAiming`, `isCastTouching`, `castTouchStartX/Y`, `castTrajectoryDistance/OffsetX`, `previewLandingX/Y`
- `castFlightT`, `castFloatX/Y/Scale/Rotation`, `prevCastFloatScreenX/Y`
- `isBezierFlying`, `bezierFlightT`, `bezierFlightDuration`, `bezierP0/P1/P2`
- `verletPositions[]`, `verletPrevPositions[]`
- `splashRipples[]`, `splashTimer`, `floatLandedTimer`, `landingLineSnapshot[]`
- `floatBounceTimer`, `surpriseEmojiTimer`, `showingSurpriseEmoji`
- `pendingEncounter`, `landingTargetX/Y`
- `floater3DPos`, `floater3DVel`, `lineSegments3D[]`, `castFlyingTimer`, `lineExtensionProgress`
- `rod3D`, `rodState`
- `floatDip`, `lineTension`

Methods: `updatePowerGauge`, `launchFloat`, `updateCastFlight`, `updateCastFlying3D`, `updateCastFlightPOV`, `updateCastFlightSideView`, `initCast3D`, `initRod3D`, `updateRodTip`, `updateRodAnimation`, `unproject2Dto3D`, `project3Dto2D`, `calculateBallisticVelocity`, `computePhysicsLandingPoint`, `settleLineSegments`, `enterFloatBounce` (data prep portion), `onFloatLanded` (snapshot portion), `updateFloatLanded`, `updateFloatBounce`, `updateFloat` (dip decay), trajectory aim helpers

### → `AnimationsRunner`

State:
- `fishAlpha` (alpha shared via getter to presenter — owned here)
- `floatingIcons[]`
- `actionAnimType/Timer/Duration/OffsetX/OffsetY`
- `actionMenuAnimState/Timer`, `selectedActionId`, `ACTION_APPEAR/DISAPPEAR_DURATION`
- `idleBarAnimState/Timer`, `selectedIdleBtn`, `IDLE_BAR_APPEAR/DISAPPEAR_DURATION`
- `characterRipples[]`, `charRippleSpawnTimer`
- `floatIdleRipples[]`, `floatIdleRippleTimer`
- `portraitAnimType/Timer/Duration/OffsetX/OffsetY`
- `fadeState/Timer/Alpha` (title fade)
- `dayNightFadeState/Timer/Alpha`
- `introActive`, `introTextProgress`, `introHoldTimer`, `introFadeTimer`, `introState`, `introFullText`
- `epitaphFadeTimer/FullText/TextProgress/TextComplete`, `pendingEndingCG`
- `progressDotsTotal/Filled`

Methods: all `updateX(dt)` anim methods, `spawnEmotionIcon`, `triggerPortraitAnimation`, `animateAction`, `showActionButtons`, `hideActionButtons`, `setActionButtonsResponding`, `showIdleBar`, `hideIdleBar`, `setIdleBarResponding`, `startIntro` (data init portion), `advanceIntro`, `updateFadeTransition`, `updateDayNightFade`, `updateEpitaphAnimation`

### → `SaveCoordinator`

Methods: `buildSaveData`, `loadGame`, `resetAllGameState`, `persistCGData`, plus handler methods `onSaveDataLoaded`, `onCGDataLoaded`, `onResetComplete`, reset confirm dialog handlers

### → `UIPresenter`

Methods (unified): `present()` replaces `render()` + `syncViewModelFromState()`. Plus `syncAffectionDisplay`, `getPortraitTexture`, `getFishDisplayName`, `buildAffectionValuesMap`, `refreshJournalData`, all the journal/inventory/CG/character-detail event handlers (they are VM plumbing).

### → `InputController`

Methods: `screenToCanvas`, `onTouchStart`, `onTouchMove`, `onTouchEnd`, `enableTouchInput`. Routes taps/drags to the right controller based on `state.phase`.

### → `FloaterGame` (orchestrator)

Owns: `builder`, `renderer`, all external systems (`flagSystem`, `saveSystem`, `affectionSystem`, `questSystem`, `encounterSystem`, `cgGallerySystem`, `journalSystem`, `globalStatsSystem`), `lastTime`, and instances of all controllers above.

Logic: `onCreate` (wire everything), `onStart`, `onUpdate` (orchestrate the update order), `onBeforeHotReload` / `onAfterHotReload`, and `@subscribe` decorators that forward to controllers.

## Notes / surprises

(Updated as I encounter them.)

- The current `render()` and `syncViewModelFromState()` duplicate ~80 lines of dialogue/HUD visibility logic. Step 5 must unify these — both should call the same `present()` core. Diverging logic between them is a latent bug.
- `enterFloatBounce`, `onFloatLanded`, `startCast` straddle cast simulation and phase transitions. Plan: CastSimulation handles physics+visual prep; PhaseController handles phase enum + downstream effects (e.g. encounter recipe dispatch lives in PhaseController.startCast, not CastSim).
- `startIntro` straddles AnimationsRunner (animation state init) and PhaseController (since it's a phase transition decision). Plan: PhaseController.startIntro() calls AnimationsRunner.beginIntroAnimation() to seed the state.
- `floatDip` and `lineTension`: animations of the float during action. Tied to actions, but visually it's the float. Owned by CastSimulation (the float is its concern), set by DialogueController via a method like `cast.applyActionVisualImpact(actionId)`.
