/**
 * DungeonState.ts
 *
 * Tracks the player's progress through a procedural run:
 * - Rolled room sequence (set at run start)
 * - Current room index
 * - Accumulated rewards
 * - Gold (persists across runs)
 */
import {
  RoomType,
  type RunRoom,
  type RoomReward,
  type RunProgress,
} from './DungeonTypes';
import { RUN_TOTAL_ROOMS } from './EncounterPool';

export class DungeonState {
  /** Rolled room sequence for the current run. Empty = no run active. */
  private roomSequence: RunRoom[] = [];
  private currentRoomIndex: number = 0;
  private roomsCleared: number = 0;
  private totalGoldEarned: number = 0;
  private totalXpEarned: number = 0;

  /** Overall gold — persists across runs and is saved to disk. */
  gold: number = 0;

  // ===== Run state queries =====

  get isInDungeon(): boolean { return this.roomSequence.length > 0; }

  get roomIndex(): number { return this.currentRoomIndex; }

  get totalRooms(): number { return this.roomSequence.length; }

  get currentRoom(): RunRoom | null {
    return this.roomSequence[this.currentRoomIndex] ?? null;
  }

  get currentRoomType(): RoomType {
    return this.currentRoom?.type ?? RoomType.Combat;
  }

  getProgress(): RunProgress | null {
    if (!this.isInDungeon) return null;
    return {
      currentRoomIndex: this.currentRoomIndex,
      totalRooms: this.roomSequence.length,
      isComplete: this.roomsCleared >= this.roomSequence.length,
    };
  }

  // ===== Run lifecycle =====

  /** Start a new run with the given pre-rolled room sequence. */
  startRun(sequence: RunRoom[]): void {
    this.roomSequence = sequence;
    this.currentRoomIndex = 0;
    this.roomsCleared = 0;
    this.totalGoldEarned = 0;
    this.totalXpEarned = 0;
  }

  /** Restore an in-progress run from save data (player resumed mid-run). */
  restoreRun(sequence: RunRoom[], roomIndex: number): void {
    this.roomSequence = sequence;
    this.currentRoomIndex = roomIndex;
    this.roomsCleared = roomIndex;
    this.totalGoldEarned = 0;
    this.totalXpEarned = 0;
  }

  /** Called when the current room is cleared. Returns the reward. */
  completeRoom(): RoomReward {
    const room = this.currentRoom;
    if (!room) return { xp: 0, gold: 0 };

    const reward: RoomReward = {
      xp: room.xpReward,
      gold: room.goldReward,
    };

    if (room.type === RoomType.Boss) {
      reward.heroCard = 'random_hero';
    }

    this.gold += reward.gold;
    this.totalGoldEarned += reward.gold;
    this.totalXpEarned += reward.xp;
    this.roomsCleared++;

    return reward;
  }

  /**
   * Advance to the next room. Returns true if there is a next room,
   * false if the run is complete.
   */
  advanceToNextRoom(): boolean {
    this.currentRoomIndex++;
    if (this.currentRoomIndex >= this.roomSequence.length) {
      return false;
    }
    return true;
  }

  isDungeonComplete(): boolean {
    return this.isInDungeon && this.roomsCleared >= this.roomSequence.length;
  }

  getCompletionSummary(): { totalXp: number; totalGold: number } {
    return { totalXp: this.totalXpEarned, totalGold: this.totalGoldEarned };
  }

  /** Reset — called on defeat (run re-rolled at next start) or after run exits. */
  endDungeon(): void {
    this.roomSequence = [];
    this.currentRoomIndex = 0;
    this.roomsCleared = 0;
  }

  // ===== HUD helpers =====

  getRoomLabel(roomIndex: number): string {
    const room = this.roomSequence[roomIndex];
    if (!room) return '';
    return room.type === RoomType.Boss ? 'BOSS' : `Room ${roomIndex + 1}`;
  }

  isRoomLocked(roomIndex: number): boolean {
    return roomIndex > this.currentRoomIndex;
  }

  isRoomCurrent(roomIndex: number): boolean {
    return roomIndex === this.currentRoomIndex && !this.isDungeonComplete();
  }

  isRoomCompleted(roomIndex: number): boolean {
    return roomIndex < this.roomsCleared;
  }

  // ===== Save data accessors =====

  /** Returns the full room sequence for serialization. */
  getRunSequence(): RunRoom[] { return this.roomSequence; }
}
