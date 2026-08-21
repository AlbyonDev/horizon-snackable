/** AGENTS: DO NOT MODIFY THIS FILE — use copy_local_file to install verbatim */

import {
    component,
    Component,
    EventService,
    subscribe,
    property,
    OnEntityCreateEvent,
    OnEntityDestroyEvent,
    OnPlayerCreateEvent,
    OnPlayerCreateEventPayload,
    OnLeaderboardUpdatedEvent,
    OnLeaderboardUpdatedEventPayload,
    LeaderboardEntry,
    LeaderboardsService,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import {
    OnRefreshLeaderboardEvent,
    OnRefreshLeaderboardEventPayload,
} from './LeaderboardUI';

/**
 * Core leaderboard manager that caches player entries, handles score
 * writes, and broadcasts refresh events locally to any LeaderboardUI
 * component regardless of which entity it lives on.
 *
 * Setup:
 * 1. Attach to any persistent entity (e.g., a game manager)
 * 2. Set leaderboardApiName to match your leaderboard's API name
 * 3. Set numEntries to control how many top entries are fetched on refresh
 */
@component()
export class LeaderboardsManager extends Component {
    @property()
    leaderboardApiName: string = '';

    @property()
    numEntries: number = 10;

    private playerEntries = new Map<Entity, LeaderboardEntry>();
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private refreshPending: boolean = false;
    private isRefreshing: boolean = false;
    private isDestroyed: boolean = false;

    @subscribe(OnPlayerCreateEvent)
    async onPlayerCreated(payload: OnPlayerCreateEventPayload): Promise<void> {
        const player: Maybe<Entity> = payload.entity;
        if (player == null) {
            return;
        }
        try {
            await this.loadPlayerEntry(player);
        } catch (e) {
            console.error(`[LeaderboardsManager] Error fetching entry for player: ${e}`);
        }
    }

    /**
     * Fetch the player's current entry from the service and cache it. Returns
     * the cached entry, or undefined if the player genuinely has no entry yet.
     * Throws if the fetch fails, so callers that must not overwrite a persisted
     * score (e.g. incrementScore) can abort instead of assuming a score of 0.
     */
    private async loadPlayerEntry(player: Entity): Promise<LeaderboardEntry | undefined> {
        const entry = await LeaderboardsService.get().fetchEntryForPlayer(
            player,
            this.leaderboardApiName,
        );
        if (entry != null) {
            this.playerEntries.set(player, entry);
        }
        return this.playerEntries.get(player);
    }

    @subscribe(OnEntityCreateEvent)
    async onReady(): Promise<void> {
        await this.refreshLeaderboard();
    }

    @subscribe(OnEntityDestroyEvent)
    onDestroy(): void {
        this.isDestroyed = true;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    @subscribe(OnLeaderboardUpdatedEvent)
    async onLeaderboardUpdated(payload: OnLeaderboardUpdatedEventPayload): Promise<void> {
        if (payload.leaderboardApiName !== this.leaderboardApiName) {
            return;
        }
        this.scheduleRefresh();
    }

    /**
     * Set a player's score to an exact value (override).
     */
    public async setScore(player: Entity, score: number): Promise<void> {
        try {
            const newEntry = await LeaderboardsService.get().updateEntryForPlayer(
                player,
                this.leaderboardApiName,
                score,
            );
            if (newEntry == null) {
                console.error('[LeaderboardsManager] Failed to set score');
                return;
            } else {
                this.playerEntries.set(player, newEntry);
            }
        } catch (e) {
            console.error(`[LeaderboardsManager] Error setting score: ${e}`);
        }
    }

    /**
     * Increment (or decrement) a player's score by a given amount.
     * Reads the current score from the local cache.
     */
    public async incrementScore(player: Entity, amount: number): Promise<void> {
        // The join-time fetch may still be in flight, or a score may arrive
        // before OnPlayerCreateEvent. Reading an empty cache would treat the
        // current score as 0 and overwrite the player's persisted score with a
        // lower value, so load the authoritative entry first on a cache miss.
        let currentEntry = this.playerEntries.get(player);
        if (currentEntry == null) {
            try {
                currentEntry = await this.loadPlayerEntry(player);
            } catch (e) {
                // The fetch failed, so we cannot know the persisted score.
                // Abort rather than risk overwriting a higher stored score.
                console.error(`[LeaderboardsManager] Skipping increment; failed to load current score: ${e}`);
                return;
            }
        }
        const currentScore = currentEntry != null ? currentEntry.score : 0;
        await this.setScore(player, currentScore + amount);
    }

    /**
     * Get the cached entry for a player, if available.
     */
    public getPlayerEntry(player: Entity): LeaderboardEntry | undefined {
        return this.playerEntries.get(player);
    }

    private scheduleRefresh(): void {
        if (this.isDestroyed) return;

        if (this.refreshTimer || this.isRefreshing) {
            this.refreshPending = true;
            return;
        }

        void this.doRefresh();
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            if (this.refreshPending) {
                this.refreshPending = false;
                this.scheduleRefresh();
            }
        }, 1000);
    }

    private async doRefresh(): Promise<void> {
        this.isRefreshing = true;
        try {
            await this.refreshLeaderboard();
        } finally {
            this.isRefreshing = false;
            if (this.refreshPending && !this.isDestroyed) {
                this.refreshPending = false;
                this.scheduleRefresh();
            }
        }
    }

    private async refreshLeaderboard(): Promise<void> {
        if (this.isDestroyed) {
            return;
        }

        try {
            const entries = await LeaderboardsService.get().fetchEntries(
                this.leaderboardApiName,
                { numEntries: this.numEntries },
            );
            EventService.sendLocally(
                OnRefreshLeaderboardEvent,
                new OnRefreshLeaderboardEventPayload(entries),
            );
        } catch (e) {
            console.error(`[LeaderboardsManager] Error fetching leaderboard entries: ${e}`);
        }
    }
}
