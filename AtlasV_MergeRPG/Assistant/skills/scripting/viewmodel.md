---
name: viewmodel
summary: UiViewModel setup, data binding to XAML, connecting ViewModel to components, and updating UI state
include: always
agents: [global]
---

# ViewModel and Data Binding

The `UiViewModel` bridges your TypeScript game logic to the XAML UI through data binding. This works for both DrawingSurface game rendering and standard XAML UI elements.

## ViewModel Structure

```typescript
import {uiViewModel, UiViewModel} from 'meta/custom_ui';

@uiViewModel()
class MyGameViewModel extends UiViewModel {
  // Property bound to DrawingSurface for game rendering
  drawCommands: string = '';

  // Properties bound to standard XAML UI elements
  scoreText: string = 'Score: 0';
  menuVisible: boolean = true;
  gameOverVisible: boolean = false;
}
```

**Key Points:**
- Use `@uiViewModel()` decorator
- Extend `UiViewModel` base class
- `drawCommands` property is bound to `<local:DrawingSurface Commands="{Binding drawCommands}" />`
- Other properties bind to standard XAML controls (`{Binding scoreText}`, `{Binding menuVisible}`)
- **For button input**: Use `UiEvent` with XAML button `Command` binding (see the **xaml_and_ui** skill)
- **For canvas touch input**: Use `FocusedInteractionService` (see the **touch_input** skill)
- **`UiCommand` does NOT exist** in the API - only `UiEvent` exists for button event handling

## Connecting ViewModel to Component

```typescript
@component()
export class MyGameComponent extends Component {
  private viewModel: MyGameViewModel = new MyGameViewModel();
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();

  @subscribe(OnEntityCreateEvent)
  onCreate() {
    const customUiComponent = this.entity.getComponent(CustomUiComponent);
    if (customUiComponent != null) {
      customUiComponent.dataContext = this.viewModel;
    }

    // Enable touch input
    this.enableTouchInput();

    // Initialize game state
    this.initializeGame();
  }
}
```

## Updating UI State from Game Logic

Update ViewModel properties directly to drive XAML UI changes:

```typescript
private updateGame(): void {
  // Increment score over time
  if (this.frameCount % 72 === 0) {
    this.score++;
    this.viewModel.scoreText = 'Score: ' + String(this.score);
  }
}

private triggerGameOver(): void {
  this.gameOver = true;
  this.viewModel.gameOverVisible = true;
}

private restartGame(): void {
  this.score = 0;
  this.viewModel.scoreText = 'Score: 0';
  this.gameOver = false;
  this.viewModel.gameOverVisible = false;
}
```

## Game State via Touch Events

For 2D games, state transitions are often handled via touch events and game state:

```typescript
@component()
export class MyGameComponent extends Component {
  private viewModel: MyGameViewModel = new MyGameViewModel();
  private gameState: 'title' | 'playing' | 'gameOver' = 'title';

  private handleTap(x: number, y: number): void {
    switch (this.gameState) {
      case 'title':
        this.startGame();
        this.viewModel.menuVisible = false;
        break;
      case 'gameOver':
        this.restartGame();
        this.viewModel.gameOverVisible = false;
        break;
      case 'playing':
        // Handle gameplay input
        break;
    }
  }
}
```

## Common Pitfalls

### Forgetting to Set DataContext

XAML bindings won't work and DrawingSurface shows nothing if you never connect the ViewModel.

```typescript
// WRONG - Never set dataContext
@subscribe(OnEntityCreateEvent)
onCreate() {
  // viewModel never connected to UI!
}

// CORRECT
@subscribe(OnEntityCreateEvent)
onCreate() {
  const customUiComponent = this.entity.getComponent(CustomUiComponent);
  if (customUiComponent != null) {
    customUiComponent.dataContext = this.viewModel;
  }
}
```

### UiCommand Does Not Exist

The `meta/custom_ui` package exports `UiEvent` but NOT `UiCommand`. Use `UiEvent` for XAML button handling. See the **xaml_and_ui** skill for the complete UiEvent pattern.
