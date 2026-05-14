/**
 * SYS-10-SAVE: AUTO_ONLY save model with persistent storage.
 * Saves after every Beat resolution within 0.5 seconds.
 * In-memory storage backed by PlayerVariablesService for cross-session persistence.
 * The PersistentSaveManager component handles the actual PVar read/write.
 */

import type { SaveData } from './Types';

const SAVE_KEY = 'floater_save_v1';

/** Callback invoked when a save is written (for persistent storage integration) */
export type OnSaveCallback = (json: string) => void;

export class SaveSystem {
  private pendingSave: boolean = false;
  private saveTimer: number = 0;
  private readonly SAVE_DELAY = 0.5; // seconds after Beat resolution
  private onSaveCallback: OnSaveCallback | null = null;
  private ready: boolean = false;

  /** Mark save system as ready — saves are blocked until this is called.
   *  Call after persistent data load completes (even if data is empty). */
  setReady(): void {
    this.ready = true;
    console.log('[SaveSystem] Ready — saves unlocked');
  }

  /** Check if the save system is ready to accept saves. */
  isReady(): boolean {
    return this.ready;
  }

  /** Register callback that fires every time save data is written */
  setOnSaveCallback(cb: OnSaveCallback): void {
    this.onSaveCallback = cb;
  }

  /** Mark that a save is needed (call after Beat resolution) */
  requestSave(): void {
    if (!this.ready) {
      console.log('[SaveSystem] Save requested but system not ready — blocked (waiting for persistent data load)');
      return;
    }
    this.pendingSave = true;
    this.saveTimer = this.SAVE_DELAY;
    console.log('[SaveSystem] Save requested');
  }

  /**
   * Immediately flush a save to persistent storage, bypassing the delay timer.
   * Use at critical moments (departure, ending) to prevent data loss on reload.
   */
  flushImmediate(getData: () => SaveData): void {
    if (!this.ready) {
      console.log('[SaveSystem] Flush requested but system not ready — blocked (waiting for persistent data load)');
      return;
    }
    this.pendingSave = false;
    this.saveTimer = 0;
    const data = getData();
    this.writeSave(data);
    console.log('[SaveSystem] Immediate flush complete');
  }

  /** Update timer, execute save when ready. Returns true if save was executed. */
  update(dt: number, getData: () => SaveData): boolean {
    if (!this.ready) return false;
    if (!this.pendingSave) return false;

    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.pendingSave = false;
      const data = getData();
      this.writeSave(data);
      return true;
    }
    return false;
  }

  /** Write save data to storage */
  private writeSave(data: SaveData): void {
    try {
      const json = JSON.stringify(data);
      _savedState = json;
      console.log('[SaveSystem] Save complete');
      // Notify persistent storage layer
      if (this.onSaveCallback) {
        this.onSaveCallback(json);
      }
    } catch (e) {
      console.log('[SaveSystem] ERROR: Failed to save');
    }
  }

  /** Load save data from storage. Returns null if no save exists. */
  loadSave(): SaveData | null {
    try {
      if (_savedState) {
        const data = JSON.parse(_savedState) as SaveData;
        console.log('[SaveSystem] Load complete');
        return data;
      }
    } catch (e) {
      console.log('[SaveSystem] ERROR: Failed to load');
    }
    return null;
  }

  /** Set persistent data received from server (PlayerVariablesService).
   *  Call this when OnSaveDataLoaded arrives from server. */
  setPersistentData(json: string): void {
    if (json && json.length > 0) {
      _savedState = json;
      console.log(`[SaveSystem] Persistent data set: ${json.length} chars`);
    } else {
      console.log('[SaveSystem] No persistent data (new player or empty)');
    }
  }

  /** Get current save data as JSON string (for sending to server) */
  getPersistentData(): string {
    return _savedState ?? '';
  }

  /** Clear save data */
  clearSave(): void {
    _savedState = null;
    console.log('[SaveSystem] Save cleared');
  }

  /** Check if a save exists */
  hasSave(): boolean {
    return _savedState !== null;
  }
}

// Module-level storage (will be managed by component hot-reload hooks)
let _savedState: string | null = null;
