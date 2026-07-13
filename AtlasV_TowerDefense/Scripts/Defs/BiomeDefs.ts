/**
 * BiomeDefs.ts — Static data table for biome definitions.
 *
 * Pure data — no side effects, no service calls.
 * Each biome specifies:
 *   - materialPath: project-relative path to the ground material asset
 *   - overworldBackground: project-relative path to the overworld background sprite
 *   - gameBackground: project-relative path to the in-game background texture
 *
 * Read by GameManager (random selection) and consumed by GroundBiomeController + OverworldHud.
 */

export interface IBiomeDef {
  id: string;
  name: string;
  materialPath: string;       // ground plane material
  overworldBackground: string; // overworld screen background sprite
  gameBackground: string;      // in-game background texture
  pathTexture: string;         // path tile texture (project-relative path)
}

export const BIOME_DEFS: readonly IBiomeDef[] = [
  {
    id: 'grass',
    name: 'Grass',
    materialPath: 'Models/Environment/Grass.material',
    overworldBackground: 'sprites/overworld_background-grass.png',
    gameBackground: 'Models/Environment/background-grass.png',
    pathTexture: 'Textures/path_tiles_cobblestone.png',
  },
  {
    id: 'snow',
    name: 'Snow',
    materialPath: 'Models/Environment/Snow.material',
    overworldBackground: 'sprites/overworld_background-snow.png',
    gameBackground: 'Models/Environment/background-snow.png',
    pathTexture: 'Textures/path_tiles_ice.png',
  },
  {
    id: 'volcano',
    name: 'Volcano',
    materialPath: 'Models/Environment/Volcano.material',
    overworldBackground: 'sprites/overworld_background-volcano.png',
    gameBackground: 'Models/Environment/background-volcano.png',
    pathTexture: 'Textures/path_tiles_lava.png',
  },
];
