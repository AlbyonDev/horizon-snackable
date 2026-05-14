/**
 * GeneratorDefs — Static catalog of all generator types.
 */

export interface IGeneratorDef {
  readonly id                : number;
  readonly name              : string;
  readonly baseOutput        : number;
  readonly cycleTime         : number;
  readonly upgradeMultipliers: readonly [number, number, number, number, number, number, number, number, number, number];
}

export const GENERATOR_DEFS: IGeneratorDef[] = [
  { id: 0, name: 'Jungle Shrine', baseOutput:  2.5, cycleTime:  5,
    upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9] },

  { id: 1, name: 'Crystal Mine',  baseOutput: 40,   cycleTime: 10,
    upgradeMultipliers: [2, 3, 4.5, 6.75, 10.125, 15.1875, 22.78, 34.17, 51.26, 76.9] },
];
