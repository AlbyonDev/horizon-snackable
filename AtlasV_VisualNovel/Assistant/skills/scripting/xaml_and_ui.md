---
name: xaml_and_ui
summary: XAML layout, fullscreen pattern, standard UI controls, UiEvent button pattern, visibility bindings, and when to use XAML vs DrawingSurface
include: always
agents: [global]
---

# Standard XAML UI vs DrawingSurface

This document clarifies when to use standard XAML UI components versus the DrawingSurface API, and provides detailed guidance on how UI events communicate with world scripts.

## 🛑 STOP — Pre-Implementation Checklist

**Before writing ANY code, confirm your rendering strategy:**

- [ ] **Title screen** → Standard XAML (`<Grid>`, `<TextBlock>`, `<Button>`)
- [ ] **HUD (score, timer, health)** → Standard XAML (`<TextBlock>`, `<ProgressBar>`)
- [ ] **Pause menu** → Standard XAML with visibility binding
- [ ] **Game over screen** → Standard XAML (`<TextBlock>`, `<Button>`)
- [ ] **All buttons** → Standard XAML (`<Button>` with `Command` binding)
- [ ] **All UI** -> Standard XAML
- [ ] **Game world/sprites** → DrawingSurface (this is the ONLY thing for DrawingSurface)

**If you are about to render text, buttons, or menus on DrawingSurface — STOP and use XAML instead.**

---

## ⚠️ CRITICAL: DrawingSurface Is NOT For Traditional UI

**DrawingSurface should ONLY be used for dynamic game rendering** - content that changes every frame through procedural drawing. It is **NOT** appropriate for:

| ❌ DO NOT Use DrawingSurface For | ✅ Use Standard XAML UI Instead |
|----------------------------------|----------------------------------|
| Title screens / Start menus | `<Grid>`, `<StackPanel>`, `<Button>` |
| Game over screens | `<TextBlock>`, `<Button>` with visibility binding |
| HUD elements (score, health, ammo) | `<TextBlock>`, `<ProgressBar>`, `<Image>` |
| Pause menus | `<Grid>` with `Visibility` binding |
| Settings / Options screens | `<CheckBox>`, `<Slider>`, `<ComboBox>` |
| Perk / Upgrade selection | `<ListBox>`, `<Button>` |
| Inventory screens | `<ItemsControl>`, `<ListBox>` |
| Dialog boxes | `<Border>`, `<TextBlock>`, `<Button>` |
| Character selection | `<ListBox>`, `<ContentControl>` |
| Loading screens | `<ProgressBar>`, `<TextBlock>` |
| Leaderboards | `<ItemsControl>`, `<DataTemplate>` |

**DrawingSurface IS appropriate for:**
- Game world rendering (backgrounds, terrain)
- Player characters and enemies (per-frame animation)
- Projectiles, particles, and effects
- Procedural/dynamic graphics that change every frame
- Anything requiring custom drawing commands

## Why Use Standard XAML UI?

Standard XAML UI provides significant advantages over DrawingSurface for UI elements:

1. **Built-in interaction handling** - Buttons, checkboxes, and other controls handle touch/click automatically
2. **Accessibility** - Standard controls support screen readers and accessibility features
3. **Animations** - XAML storyboards provide smooth, declarative animations
4. **Styling** - Templates and styles allow consistent theming
5. **Data binding** - Automatic UI updates when ViewModel properties change
6. **Event system** - Clean communication between UI and world scripts via `UiEvent`

## Architecture: Combining DrawingSurface with XAML UI

For games that need both dynamic rendering AND traditional UI, layer them together:

> **⚠️ CRITICAL: Boolean Visibility Bindings**
>
> XAML's `Visibility` attribute expects a `Visibility` enum, NOT a boolean. Without `BooleanToVisibilityConverter`, boolean bindings fail silently and default to `Visible`. This causes overlays, menus, and game over screens to appear immediately on launch even when their boolean property is `false`.
>
> **ALWAYS define the converter and use it in ALL visibility bindings:**
> ```xml
> <Grid.Resources>
>   <BooleanToVisibilityConverter x:Key="BoolToVis" />
> </Grid.Resources>
>
> <Grid Visibility="{Binding someVisible, Converter={StaticResource BoolToVis}}">
> ```

```xml
<Grid Background="Black"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">

  <!-- REQUIRED: Define converter for boolean visibility bindings -->
  <Grid.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVis" />
  </Grid.Resources>

  <Viewbox Stretch="Uniform">
    <Grid Width="480" Height="800">
      <!-- Layer 1: Game canvas (DrawingSurface) - renders game content -->
      <local:DrawingSurface Width="480" Height="800"
                            Commands="{Binding drawCommands}" />

      <!-- Layer 2: HUD overlay - standard XAML -->
      <StackPanel VerticalAlignment="Top" Margin="10">
        <TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="White" />
        <ProgressBar Value="{Binding healthPercent}" Maximum="100" Width="200" Height="20" />
      </StackPanel>

      <!-- Layer 3: Pause menu - visibility controlled (MUST use converter!) -->
      <Grid Visibility="{Binding pauseMenuVisible, Converter={StaticResource BoolToVis}}" Background="#AA000000">
        <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
          <TextBlock Text="PAUSED" FontSize="36" Foreground="White" />
          <Button Content="Resume" Command="{Binding events.onResumeClicked}"
                  Width="200" Height="50" Margin="10" />
          <Button Content="Quit" Command="{Binding events.onQuitClicked}"
                  Width="200" Height="50" Margin="10" />
        </StackPanel>
      </Grid>

      <!-- Layer 4: Game over screen - visibility controlled (MUST use converter!) -->
      <Grid Visibility="{Binding gameOverVisible, Converter={StaticResource BoolToVis}}" Background="#CC000000">
        <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
          <TextBlock Text="GAME OVER" FontSize="48" Foreground="#FF4444" />
          <TextBlock Text="{Binding finalScoreText}" FontSize="24" Foreground="White" />
          <Button Content="Play Again" Command="{Binding events.onRestartClicked}"
                  Width="200" Height="50" Margin="20" />
        </StackPanel>
      </Grid>
    </Grid>
  </Viewbox>
</Grid>
```

---

# UI-to-World Event Communication

This is the critical pattern for making UI buttons trigger actions in your world scripts.

## The UiEvent Pattern

The `UiEvent` system allows XAML buttons and controls to trigger TypeScript handlers in your world components. This is essential for menus, buttons, and any interactive UI.

### Step-by-Step Guide

#### Step 1: Define the UiEvent

Create a `UiEvent` instance. This can be done in the ViewModel file or a separate events file.

**Simple event (no parameters):**
```typescript
import { UiEvent } from 'meta/custom_ui';

// Create event - the string must be unique and match the property name
export const onStartGameClicked = new UiEvent('onStartGameClicked');
```

**Event with parameters:**
```typescript
import { UiEvent } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';

// Define the payload class - MUST use @serializable() decorator
@serializable()
export class ItemClickedPayload {
  readonly parameter: string = "";
}

// Create event with payload type
export const onItemClicked = new UiEvent('onItemClicked', ItemClickedPayload);
```

#### Step 2: Expose Events in ViewModel

Add the events to an `events` object in your ViewModel class:

```typescript
import { UiViewModel, uiViewModel, UiEvent } from 'meta/custom_ui';

// Define events (can be in same file or imported)
export const onStartGameClicked = new UiEvent('onStartGameClicked');
export const onPauseClicked = new UiEvent('onPauseClicked');
export const onRestartClicked = new UiEvent('onRestartClicked');

@uiViewModel()
export class GameMenuViewModel extends UiViewModel {
  // UI state properties
  public titleScreenVisible: boolean = true;
  public pauseMenuVisible: boolean = false;
  public gameOverVisible: boolean = false;
  public scoreText: string = "Score: 0";

  // CRITICAL: Events must be in an 'events' object
  override readonly events = {
    onStartGameClicked,
    onPauseClicked,
    onRestartClicked,
  };
}

export const gameMenuVM = new GameMenuViewModel();
```

#### Step 3: Bind Events in XAML

Use `Command="{Binding events.eventName}"` on buttons:

```xml
<!-- Simple button - triggers event when clicked -->
<Button Content="Start Game"
        Command="{Binding events.onStartGameClicked}"
        Width="200" Height="50" />

<!-- Button with parameter - passes data to handler -->
<Button Content="Select Character"
        Command="{Binding events.onItemClicked}"
        CommandParameter="{Binding characterId}"
        Width="200" Height="50" />
```

**Alternative: Using EventTrigger with InvokeUiEventAction**

For non-button controls or other events:

```xml
<Button Content="Start Game">
  <b:Interaction.Triggers>
    <b:EventTrigger EventName="Click">
      <local:InvokeUiEventAction Event="{Binding events.onStartGameClicked}" />
    </b:EventTrigger>
  </b:Interaction.Triggers>
</Button>
```

**Note:** Requires `xmlns:b="http://schemas.microsoft.com/xaml/behaviors"` and `xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis"`.

#### Step 4: Subscribe to Events in World Component

In your world component, use `@subscribe()` to handle the events:

```typescript
import { component, Component, OnEntityStartEvent, subscribe } from 'meta/platform_api';
import { CustomUiComponent } from 'meta/custom_ui';
import {
  gameMenuVM,
  onStartGameClicked,
  onPauseClicked,
  onRestartClicked,
} from './viewmodels/GameMenuViewModel';

@component()
export class GameComponent extends Component {
  @subscribe(OnEntityStartEvent)
  onStart() {
    // Connect ViewModel to CustomUiComponent
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = gameMenuVM;
    }
  }

  // Handle "Start Game" button click
  @subscribe(onStartGameClicked)
  onStartGame() {
    console.log('Start game clicked!');
    gameMenuVM.titleScreenVisible = false;
    this.initializeGame();
  }

  // Handle "Pause" button click
  @subscribe(onPauseClicked)
  onPause() {
    console.log('Pause clicked!');
    gameMenuVM.pauseMenuVisible = true;
    this.pauseGame();
  }

  // Handle "Restart" button click
  @subscribe(onRestartClicked)
  onRestart() {
    console.log('Restart clicked!');
    gameMenuVM.gameOverVisible = false;
    this.resetGame();
  }

  private initializeGame() {
    // Game initialization logic
  }

  private pauseGame() {
    // Pause logic
  }

  private resetGame() {
    // Reset logic
  }
}
```

**Handling events with parameters:**

```typescript
import { ItemClickedPayload, onItemClicked } from './viewmodels/ItemViewModel';

@subscribe(onItemClicked)
onItemClick({ parameter }: ItemClickedPayload) {
  console.log(`Item clicked: ${parameter}`);
  // Find and process the clicked item
  const item = this.items.find(i => i.id === parameter);
  if (item) {
    this.selectItem(item);
  }
}
```

---

## Complete Example: Title Screen with Start Button

### ViewModel (TitleScreenViewModel.ts)

```typescript
import { UiViewModel, uiViewModel, UiEvent } from 'meta/custom_ui';

// Define the event
export const onStartGameClicked = new UiEvent('onStartGameClicked');

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  public titleVisible: boolean = true;
  public gameVisible: boolean = false;
  public gameName: string = "My Awesome Game";

  override readonly events = {
    onStartGameClicked,
  };

  hideTitle() {
    this.titleVisible = false;
    this.gameVisible = true;
  }
}

export const titleScreenVM = new TitleScreenViewModel();
```

### XAML (TitleScreen.xaml)

```xml
<Grid Background="#1A1A2E"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">

  <!-- Title Screen -->
  <Grid Visibility="{Binding titleVisible}">
    <Grid.Visibility>
      <Binding Path="titleVisible">
        <Binding.Converter>
          <BooleanToVisibilityConverter />
        </Binding.Converter>
      </Binding>
    </Grid.Visibility>
    <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
      <TextBlock Text="{Binding gameName}" FontSize="48" Foreground="White"
                 HorizontalAlignment="Center" Margin="0,0,0,40" />
      <Button Content="START GAME"
              Command="{Binding events.onStartGameClicked}"
              Width="250" Height="60" FontSize="24" Background="#E94560" Foreground="White" />
    </StackPanel>
  </Grid>

  <!-- Game Area (shown after start) -->
  <Grid>
    <Grid.Visibility>
      <Binding Path="gameVisible">
        <Binding.Converter>
          <BooleanToVisibilityConverter />
        </Binding.Converter>
      </Binding>
    </Grid.Visibility>
    <Viewbox Stretch="Uniform">
      <Grid Width="480" Height="800">
        <local:DrawingSurface Width="480" Height="800" Commands="{Binding drawCommands}" />
      </Grid>
    </Viewbox>
  </Grid>
</Grid>
```

### World Component (GameComponent.ts)

```typescript
import { component, Component, OnEntityStartEvent, subscribe } from 'meta/platform_api';
import { CustomUiComponent } from 'meta/custom_ui';
import { titleScreenVM, onStartGameClicked } from './viewmodels/TitleScreenViewModel';

@component()
export class GameComponent extends Component {
  @subscribe(OnEntityStartEvent)
  onStart() {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = titleScreenVM;
    }
  }

  @subscribe(onStartGameClicked)
  onStartGame() {
    // Hide title, show game
    titleScreenVM.hideTitle();

    // Start your game logic
    console.log('Game started!');
    this.startGameLoop();
  }

  private startGameLoop() {
    // Initialize game state, enable updates, etc.
  }
}
```

---

## Common Patterns

### Pattern 1: Multiple Screens with Visibility

```typescript
@uiViewModel()
class ScreenManagerVM extends UiViewModel {
  public titleScreenVisible: boolean = true;
  public gameScreenVisible: boolean = false;
  public settingsScreenVisible: boolean = false;
  public gameOverScreenVisible: boolean = false;

  showScreen(screen: 'title' | 'game' | 'settings' | 'gameOver') {
    this.titleScreenVisible = screen === 'title';
    this.gameScreenVisible = screen === 'game';
    this.settingsScreenVisible = screen === 'settings';
    this.gameOverScreenVisible = screen === 'gameOver';
  }

  override readonly events = {
    onStartClicked: new UiEvent('onStartClicked'),
    onSettingsClicked: new UiEvent('onSettingsClicked'),
    onBackClicked: new UiEvent('onBackClicked'),
    onRestartClicked: new UiEvent('onRestartClicked'),
  };
}
```

### Pattern 2: List Selection with CommandParameter

```typescript
// ViewModel
@serializable()
export class CharacterSelectedPayload {
  readonly parameter: string = "";
}

export const onCharacterSelected = new UiEvent('onCharacterSelected', CharacterSelectedPayload);

@uiViewModel()
class CharacterSelectVM extends UiViewModel {
  public characters = [
    { id: 'warrior', name: 'Warrior', icon: warriorIcon },
    { id: 'mage', name: 'Mage', icon: mageIcon },
    { id: 'rogue', name: 'Rogue', icon: rogueIcon },
  ];

  override readonly events = { onCharacterSelected };
}
```

```xml
<!-- XAML - ListBox or ItemsControl with button per item -->
<ItemsControl ItemsSource="{Binding characters}">
  <ItemsControl.ItemTemplate>
    <DataTemplate>
      <Button Content="{Binding name}"
              Command="{Binding DataContext.events.onCharacterSelected, RelativeSource={RelativeSource AncestorType=ItemsControl}}"
              CommandParameter="{Binding id}" />
    </DataTemplate>
  </ItemsControl.ItemTemplate>
</ItemsControl>
```

```typescript
// Component handler
@subscribe(onCharacterSelected)
onCharacterSelect({ parameter }: CharacterSelectedPayload) {
  const selectedId = parameter;
  console.log(`Selected character: ${selectedId}`);
  this.selectCharacter(selectedId);
}
```

### Pattern 3: Confirmation Dialog

```typescript
export const onConfirmClicked = new UiEvent('onConfirmClicked');
export const onCancelClicked = new UiEvent('onCancelClicked');

@uiViewModel()
class ConfirmDialogVM extends UiViewModel {
  public dialogVisible: boolean = false;
  public dialogTitle: string = "";
  public dialogMessage: string = "";

  override readonly events = { onConfirmClicked, onCancelClicked };

  showConfirmation(title: string, message: string) {
    this.dialogTitle = title;
    this.dialogMessage = message;
    this.dialogVisible = true;
  }

  hide() {
    this.dialogVisible = false;
  }
}
```

---

## Summary: Required Imports

```typescript
// For ViewModels and Events
import { UiViewModel, uiViewModel, UiEvent } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';

// For World Components
import { component, Component, OnEntityStartEvent, subscribe } from 'meta/platform_api';
import { CustomUiComponent } from 'meta/custom_ui';
```

## Key Points

1. **UiEvent** is the bridge between XAML buttons and TypeScript handlers
2. Events must be in an `events` object on the ViewModel
3. Use `@subscribe(eventInstance)` in components to handle events
4. Use `CommandParameter` to pass data (e.g., item IDs) with events
5. Event payloads must use the `@serializable()` decorator
6. **⚠️ CRITICAL:** Boolean visibility bindings REQUIRE `BooleanToVisibilityConverter` - without it, bindings fail silently and default to `Visible`
7. **DO NOT** use `UiCommand` - it does not exist in the API; use `UiEvent` only


---

# XAML Setup Details

# XAML Setup for 2D Games

This document covers XAML setup for 2D games, including DrawingSurface for game rendering and standard XAML controls for UI elements.

## ⚠️ CRITICAL: Unsupported XAML Features

**The following XAML features are NOT supported in Horizon and will cause errors:**

| ❌ NOT Supported | ✅ Alternative |
|------------------|----------------|
| `DropShadowEffect` | Use a dark `TextBlock` offset by 1-2px behind the main text, or use DrawingSurface to render text with shadows |
| `BlurEffect` | Not available - design UI without blur effects |
| `<Effect>` elements in general | Most WPF effects are not supported |

**Example - Fake text shadow using layered TextBlocks:**
```xml
<!-- Shadow layer (behind) -->
<TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="#000000"
           Margin="2,2,0,0" />
<!-- Main text layer (on top) -->
<TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="White" />
```

Or wrap in a Grid for proper layering:
```xml
<Grid>
  <TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="#000000"
             Margin="2,2,0,0" />
  <TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="White" />
</Grid>
```

---

## UI Approach: DrawingSurface + Standard XAML Controls

**For UI elements, use standard Custom UI XAML techniques** - not the DrawingSurface API. This includes:
- **Buttons** (`<Button>`) for interactive controls
- **TextBlocks** (`<TextBlock>`) for labels and score displays
- **Grids/StackPanels** for layout
- **Images** (`<Image>`) for static graphics
- **Any standard WPF/Noesis controls**

**Use DrawingSurface only for:**
- The game canvas itself (dynamic, per-frame rendering)
- Procedural graphics that change every frame
- Game objects, particles, and animations

**Recommended Pattern:** Layer standard XAML UI on top of the DrawingSurface:

```xml
<Grid Background="Black"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">

  <!-- ⚠️ REQUIRED: BooleanToVisibilityConverter for visibility bindings -->
  <Grid.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVis" />
  </Grid.Resources>

  <Viewbox Stretch="Uniform">
    <Grid Width="480" Height="800">
      <!-- Game canvas (DrawingSurface) -->
      <local:DrawingSurface Width="480" Height="800"
                            Commands="{Binding drawCommands}" />

      <!-- UI overlay using standard XAML controls -->
      <Grid>
        <!-- HUD at top -->
        <StackPanel VerticalAlignment="Top" Margin="10">
          <TextBlock Text="{Binding scoreText}" FontSize="24" Foreground="White" />
        </StackPanel>

        <!-- Menu/buttons when needed - NOTE: Converter required for boolean visibility! -->
        <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center"
                    Visibility="{Binding menuVisible, Converter={StaticResource BoolToVis}}">
          <Button Content="Start Game" Command="{Binding events.onStartGameClicked}"
                  Width="200" Height="50" Margin="5" />
          <Button Content="Settings" Command="{Binding events.onSettingsClicked}"
                  Width="200" Height="50" Margin="5" />
        </StackPanel>
      </Grid>
    </Grid>
  </Viewbox>
</Grid>
```

> **⚠️ CRITICAL: Boolean Visibility Bindings**
>
> XAML's `Visibility` attribute expects a `Visibility` enum, NOT a boolean. Without `BooleanToVisibilityConverter`, bindings fail silently and default to `Visible`. This causes UI elements to show immediately even when their boolean property is `false`. See the **Common Pitfalls** skill for details.

## Required XML Namespaces

```xml
<Grid
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis"
  x:Name="ComponentRoot">
```

- `xmlns:local` - Required for the `local:DrawingSurface` component

## ⚠️ REQUIRED: Fullscreen Game Layout Pattern

**When creating a fullscreen 2D game with DrawingSurface, you MUST wrap the content in an outer Grid with black background and a Viewbox with Uniform stretch.** This is NOT optional - it is required for proper fullscreen games.

### ⚠️ CRITICAL: Canvas Dimensions Must Match TypeScript

**The Width and Height values in XAML MUST exactly match the canvas constants in your TypeScript code.** A mismatch will cause touch coordinates to be wrong and rendering to be distorted.

```typescript
// TypeScript - defines the source of truth
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 800;
```

```xml
<!-- XAML - MUST match TypeScript exactly -->
<Grid Width="480" Height="800">
  <local:DrawingSurface Width="480" Height="800" ... />
</Grid>
```

**If these don't match:** Touch input will register at wrong positions, and the game may appear stretched or squished.

This pattern ensures:
- The game fills the entire screen
- The 3D world is completely hidden behind it
- Content scales uniformly to fit any screen size
- Consistent appearance across different device resolutions

**ALWAYS use this structure for fullscreen DrawingSurface games:**

```xml
<Grid Background="Black"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">
  <Viewbox Stretch="Uniform">
    <Grid Width="[CANVAS_WIDTH]" Height="[CANVAS_HEIGHT]">
      <local:DrawingSurface Width="[CANVAS_WIDTH]" Height="[CANVAS_HEIGHT]"
                            Commands="{Binding drawCommands}" />
    </Grid>
  </Viewbox>
</Grid>
```

**Example with typical game dimensions (480x800 portrait):**

```xml
<Grid Background="Black"
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis">
  <Viewbox Stretch="Uniform">
    <Grid Width="480" Height="800">
      <local:DrawingSurface Width="480" Height="800"
                            Commands="{Binding drawCommands}" />
    </Grid>
  </Viewbox>
</Grid>
```

**Why this pattern is required:**
1. **`Background="Black"` on outer Grid** - Fills any letterbox areas with black, hiding the 3D world
2. **`Viewbox` with `Stretch="Uniform"`** - Scales content proportionally to fit the screen while maintaining aspect ratio
3. **Inner `Grid` with fixed dimensions** - Defines your game's logical resolution that gets scaled

> **Note:** Because `Stretch="Uniform"` letterboxes the content when the screen aspect ratio differs from your game's aspect ratio, touch coordinates from `FocusedInteractionService` won't map 1:1 to your canvas. Use `CameraModeProvisionalService.aspectRatio` (from `meta/worlds_provisional`) to get the actual viewport aspect ratio and compute the correct mapping. See the **Touch Input** skill for the full `screenToCanvas()` implementation.

## DrawingSurface Element

The DrawingSurface must be bound to a string property on your ViewModel:

```xml
<local:DrawingSurface
  Width="480"
  Height="800"
  Commands="{Binding drawCommands}" />
```

**Key Points:**
- `Width` and `Height` define the canvas size in logical pixels
- `Commands` binds to a string property that receives the drawing commands
- The entire canvas is used for both rendering AND touch input

## Input Handling

**For XAML buttons, use `UiEvent` with the `events.eventName` binding pattern:**

```xml
<!-- Button with event command binding (RECOMMENDED) -->
<Button Content="Restart" Command="{Binding events.onRestartClicked}" />

<!-- Alternative: Button with event trigger -->
<Button Content="Start">
  <b:Interaction.Triggers>
    <b:EventTrigger EventName="Click">
      <local:InvokeUiEventAction Event="{Binding events.onStartGame}" />
    </b:EventTrigger>
  </b:Interaction.Triggers>
</Button>
```

**See the `standard_ui_vs_drawingsurface` skill for complete `UiEvent` documentation** including how to define events, subscribe to them in components, and pass parameters.

**For game input on the DrawingSurface canvas** (touch-based movement, aiming, etc.), use `FocusedInteractionService` to capture touch input with precise screen coordinates.

See the **Touch Input** skill for complete details on:
- Setting up FocusedInteractionService
- Coordinate mapping from screen space to canvas space
- Handling touch start, move, and end events

## Common Canvas Sizes

| Orientation | Width | Height | Use Case |
|-------------|-------|--------|----------|
| Portrait    | 480   | 800    | Mobile-style games |
| Landscape   | 800   | 480    | Arcade games |
| Square      | 600   | 600    | Puzzle games |

## Style Guidelines for UI Elements

When styling XAML UI elements (buttons, text, panels):

- **Background colors:** Use dark backgrounds (`#0A0A1A`, `#1A1A2E`, `#0F0F23`)
- **Button colors:**
  - Primary action: `#E94560` (red)
  - Secondary: `#0F3460` (blue)
  - Success/confirm: `#3B6E3B` (green)
- **Text:** White (`#FFFFFF`) or accent color (`#E94560`)
- **Touch targets:** Minimum 44x44 logical pixels for comfortable touch interaction

Example styled button:

```xml
<Button Width="200" Height="50" Margin="5"
        Background="#E94560" Foreground="White"
        BorderThickness="0" FontSize="18" FontWeight="Bold">
  <Button.Template>
    <ControlTemplate TargetType="Button">
      <Border Background="{TemplateBinding Background}"
              CornerRadius="8" Padding="10,5">
        <ContentPresenter HorizontalAlignment="Center"
                          VerticalAlignment="Center"/>
      </Border>
    </ControlTemplate>
  </Button.Template>
  Start Game
</Button>
```


## Common Pitfalls

### Boolean Visibility Bindings Require Converter

XAML Visibility expects a Visibility enum, NOT a boolean. Without BooleanToVisibilityConverter, boolean bindings fail silently and default to Visible. This causes menus/overlays to show immediately on launch.

Always define the converter and use it:

```xml
<Grid.Resources>
  <BooleanToVisibilityConverter x:Key="BoolToVis" />
</Grid.Resources>

<Grid Visibility="{Binding gameOverVisible, Converter={StaticResource BoolToVis}}">
```

### Unsupported XAML Features

DropShadowEffect, BlurEffect, and most WPF Effect elements are NOT supported in Horizon (Noesis). Use layered TextBlocks to fake shadows.

### Missing XAML Namespace

The local namespace is required for DrawingSurface:

```xml
xmlns:local="clr-namespace:horizon.ui_noesis;assembly=ui_noesis"
```

### Canvas Dimensions Must Match TypeScript

XAML Width/Height MUST exactly match TypeScript canvas constants. A mismatch causes wrong touch coordinates and distorted rendering.
