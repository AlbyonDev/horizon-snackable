# Button Creation Rules

These rules apply to ALL interactive buttons created in the game UI (XAML panels).
**Reference implementation: the SKULLS button in `UI/Overworld.xaml`** — use it as the canonical template.

---

## XAML Structure (follow this exact layering)

```
Grid (wrapper, RenderTransform: ScaleTransform for animation)
├── Border (GLOW layer)
│     Background: Transparent
│     BorderBrush: #AAf5c518 (gold, semi-transparent)
│     BorderThickness: 10
│     CornerRadius: 24
│     Opacity: 0 (animated by idle pulse)
│     Margin: -8 (extends beyond main border)
├── Border (MAIN frame)
│     Background: #CC1a1a2e (dark navy, slight transparency)
│     BorderBrush: #FFf5c518 (solid gold)
│     BorderThickness: 5
│     CornerRadius: 18
│     ├── 8× Ellipse (corner ornaments)
│     │     Width/Height: 18, Fill: #FFf5c518
│     │     Positioned at all 4 corners + midpoints via Margin
│     └── StackPanel (content, Margin: 44,22,44,22)
│           └── Text layers (see Text Style below)
```

---

## Visual Style

- **Main border:** Dark navy background (`#CC1a1a2e`), solid gold border (`#FFf5c518`), thickness 5, CornerRadius 18
- **Glow border:** Same gold at reduced alpha (`#AAf5c518`), thickness 10, CornerRadius 24, Margin -8 (extends outside), starts at Opacity 0
- **Corner ornaments:** 8 gold Ellipses (18×18) at corners and edge midpoints — mandatory for primary CTAs, optional for secondary
- **No gradients on the frame itself** — keep it flat dark + gold border

---

## Text Style

- **Font:** Anton, Bold
- **Size:** 72px for primary CTAs; 48px for secondary; 32px for small labels
- **Casing:** ALL CAPS always
- **Text rendering:** 4-layer stack for outline effect:
  1. Black copy offset (-2, -2)
  2. Black copy offset (+2, -2)
  3. Black copy offset (-2, +2)
  4. Black copy offset (+2, +2)
  5. Top layer: gold/cream (`#F5E6C8` or `#FFf5c518`)
- **This gives a solid black 2px outline around gold text — do NOT use TextBlock.TextDecorations or Stroke**

---

## Size & Tap Targets

- **Minimum tap area:** 48×48px (extend hit area if visual is smaller)
- **Primary CTA:** Content padding 44px horizontal, 22px vertical (inside the main border)
- **Secondary:** Content padding 24px horizontal, 14px vertical
- **The overall button size is determined by content + padding — do not set fixed Width/Height unless layout requires it**

---

## States

| State | Visual Change |
|-------|--------------|
| **Normal** | Idle pulse running (see Animation) |
| **Pressed** | Press animation plays (scale down + bounce back) + click SFX |
| **Disabled** | Stop pulse, set main border BorderBrush to `#FF555555`, text to `#FF888888`, glow Opacity locked at 0 |
| **Unaffordable** | Same as Disabled — grey border, grey text, no pulse |

---

## Animation (CRITICAL — match the Skulls button exactly)

### Idle Breathing Pulse (MANDATORY on all primary buttons)

A looping scale + glow animation that runs forever from the moment the button appears:

```
Storyboard (RepeatBehavior=Forever, AutoReverse=True):

  Target: Wrapper Grid's ScaleTransform.ScaleX
    From: 1.0  To: 1.06  Duration: 0:0:0.9
    EasingFunction: SineEase (EaseInOut)

  Target: Wrapper Grid's ScaleTransform.ScaleY
    From: 1.0  To: 1.06  Duration: 0:0:0.9
    EasingFunction: SineEase (EaseInOut)

  Target: Glow Border's Opacity
    From: 0.0  To: 1.0  Duration: 0:0:0.9
    EasingFunction: SineEase (EaseInOut)

Full cycle: 1.8s (0.9s expand + 0.9s contract)
```

### Auto-start

Use `b:EventTrigger` (no EventName = triggers on Loaded) with `b:ControlStoryboardAction` to start the pulse automatically. No code-behind needed.

### Secondary buttons

Secondary/smaller buttons use a subtler pulse: ScaleX/Y 1.0→1.03, Duration 1.2s, no glow layer.

### Press Animation (MANDATORY on all buttons)

A quick scale-down + bounce-back triggered on `MouseLeftButtonDown`:

```
Storyboard (RepeatBehavior=1x, AutoReverse=False):

  Target: Wrapper Grid's ScaleTransform.ScaleX
    Keyframes:
      0:0:0.00 → 1.0 (current)
      0:0:0.08 → 0.90 (squish down, PowerEase EaseOut Power=2)
      0:0:0.22 → 1.0  (bounce back, ElasticEase EaseOut Oscillations=1 Springiness=4)

  Target: Wrapper Grid's ScaleTransform.ScaleY
    (same keyframes as ScaleX)
```

Total duration: 0.22s. Feels snappy and physical.

**Trigger:** `MouseLeftButtonDown` starts the press storyboard. The command/action still fires on `MouseLeftButtonUp`.

### Click SFX (MANDATORY on all buttons)

Every button tap plays a short UI click sound effect on `MouseLeftButtonUp` (same event as the command fire). Implementation:

- Use a shared `AudioService.playUiClick()` call (or equivalent) from the ViewModel/controller
- Sound file: `sfxlib_ui_WoodConfirm_01/sfxlib_ui_WoodConfirm_01.ogg` (hollow wood knock, 0.44s)
- Volume: 0.3 (subtle, never louder than gameplay SFX)
- No pitch variation needed for UI clicks (keep consistent)

---

## Layout & Spacing

- **Between buttons (horizontal row):** 12–16px gap
- **Between buttons (vertical stack):** 16–20px gap
- **Alignment:** Always center-aligned within container
- **Screen edge margin:** Minimum 16px from any edge

---

## Do / Don't

✅ **Do:**
- Always add the idle breathing pulse — it makes buttons feel alive
- Always add the press animation (scale 0.90 squish + bounce back)
- Always play the click SFX on tap
- Use the 4-layer text outline technique (not stroke)
- Include the glow border layer on primary CTAs
- Add 8 gold corner ornament Ellipses on primary buttons
- Fire commands via `MouseLeftButtonUp` (not Click or MouseDown)
- Auto-start idle animations via `b:EventTrigger` + `b:ControlStoryboardAction`

❌ **Don't:**
- Use VisualStates for button states — handle via Storyboard start/stop + property binding
- Use flat/borderless buttons — everything gets the gold frame
- Skip the press animation or click SFX on any tappable element
- Set fixed Width/Height unless layout demands it (let padding define size)
- Use white text or modern sans-serif — always Anton, always gold/cream
- Hide buttons when unaffordable (grey them instead)
