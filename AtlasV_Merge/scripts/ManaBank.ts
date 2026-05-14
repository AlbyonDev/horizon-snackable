/**
 * ManaBank
 *
 * Tracks mana for each of the 5 gem types separately.
 * Each color has a cap of 20 units; overflow is discarded.
 */
import { GemType, GEM_TYPE_COUNT } from './Types';

const MANA_CAP_PER_COLOR = 20;

export class ManaBank {
  private mana: number[] = new Array(GEM_TYPE_COUNT).fill(0);

  /** Add mana to a specific color. Returns the amount actually added (after cap). */
  addMana(gemType: GemType, amount: number): number {
    const current = this.mana[gemType];
    const space = MANA_CAP_PER_COLOR - current;
    const added = Math.min(amount, space);
    this.mana[gemType] = current + added;

    if (added < amount) {
    }

    return added;
  }

  /** Get current mana for a color */
  getMana(gemType: GemType): number {
    return this.mana[gemType];
  }

  /** Get the cap per color */
  getCap(): number {
    return MANA_CAP_PER_COLOR;
  }

  /** Spend mana from a color. Returns true if enough was available. */
  spendMana(gemType: GemType, amount: number): boolean {
    if (this.mana[gemType] < amount) return false;
    this.mana[gemType] -= amount;
    return true;
  }

  /** Get all mana values as an array (indexed by GemType) */
  getAllMana(): readonly number[] {
    return this.mana;
  }

  /** Reset all mana to 0 */
  reset(): void {
    this.mana.fill(0);
  }
}
