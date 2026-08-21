/** AGENTS: DO NOT MODIFY THIS FILE — use copy_local_file to install verbatim */

import {
    CustomUiComponent,
    LeaderboardEntry,
    LocalEvent,
    UiViewModel,
    UiEvent,
    uiViewModel,
    component,
    Component,
    subscribe,
    ExecuteOn,
    OnEntityStartEvent,
    Visibility,
} from 'meta/worlds';

export class OnRefreshLeaderboardEventPayload {
    public readonly entries: readonly LeaderboardEntry[];
    constructor(entries: LeaderboardEntry[] = []) {
        this.entries = entries;
    }
}

export const OnRefreshLeaderboardEvent = new LocalEvent(
    'OnRefreshLeaderboardEvent',
    OnRefreshLeaderboardEventPayload,
);

const toggleCommandEvent = new UiEvent('toggleCommandEvent');

@uiViewModel()
class LeaderboardEntryViewModel extends UiViewModel {
    rank: string = '';
    name: string = '';
    score: number = 0;
}

@uiViewModel()
class LeaderboardUIModel extends UiViewModel {
    entries: readonly LeaderboardEntryViewModel[] = [];
    emptyStateVisibility: Visibility = Visibility.Visible;
    panelVisibility: Visibility = Visibility.Collapsed;
    override readonly events = { toggleCommand: toggleCommandEvent };
}

/**
 * Displays leaderboard entries via XAML UI with a toggle button.
 * The toggle button is always visible on screen. Clicking it shows/hides
 * the leaderboard panel centered on screen.
 *
 * Listens for OnRefreshLeaderboardEvent (broadcast locally by
 * LeaderboardsManager via EventService.sendLocally) and maps entries
 * to view models for data binding.
 *
 * Setup:
 * 1. Attach to an entity with CustomUiComponent
 * 2. Set the CustomUiComponent XAML asset to UI/LeaderboardsUI.xaml
 * 3. Set customUiType to ScreenSpace
 * 4. Set isInteractable to true
 */
@component()
export class LeaderboardUI extends Component {
    private viewModel = new LeaderboardUIModel();
    private isVisible = false;

    @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
    onStart(): void {
        const customUiComponent = this.entity.getComponent(CustomUiComponent);
        if (customUiComponent != null) {
            customUiComponent.dataContext = this.viewModel;
        }
    }

    @subscribe(toggleCommandEvent)
    onToggle(): void {
        this.isVisible = !this.isVisible;
        this.viewModel.panelVisibility = this.isVisible
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    @subscribe(OnRefreshLeaderboardEvent)
    onRefreshLeaderboard(data: OnRefreshLeaderboardEventPayload): void {
        const newEntries: LeaderboardEntryViewModel[] = [];
        for (let i = 0; i < data.entries.length; i++) {
            const entry = data.entries[i];
            const vm = new LeaderboardEntryViewModel();
            vm.rank = `#${entry.rank}`;
            vm.name = entry.playerAlias;
            vm.score = entry.score;
            newEntries.push(vm);
        }
        this.viewModel.entries = newEntries;
        this.viewModel.emptyStateVisibility =
            newEntries.length === 0 ? Visibility.Visible : Visibility.Collapsed;
    }
}
