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

/** Model Visual (mesh + material + optional card texture) */
export interface IModel {
  meshPath: string;       // project-relative .fbx path
  materialPath: string;   // project-relative .material path
  cardTexturePath?: string; // project-relative .png path for shop card icon
}

export interface IBiomeDef {
  id: string;
  name: string;
  materialPath: string;       // ground plane material
  overworldBackground: string; // overworld screen background sprite
  gameBackground: string;      // in-game background texture
  pathTexture: string;         // path tile texture (project-relative path)
  flagMeshPath: string;        // flag mesh (project-relative .fbx path)
  flagMaterialPath: string;    // flag material (project-relative .material path)
  /** Optional per-tower visual overrides. Key = tower def id (e.g. 'cannon'). */
  tower: Record<string, IModel>;
}

export const BIOME_DEFS: readonly IBiomeDef[] = [
  {
    id: 'grass',
    name: 'Grass',
    materialPath: 'Models/Environment/Grass.material',
    overworldBackground: 'sprites/overworld_background-grass.png',
    gameBackground: 'Models/Environment/background-grass.png',
    pathTexture: 'Textures/path_tiles_cobblestone.png',
    flagMeshPath: 'Models/GameplayObjects/GrassFlag/GrassFlag.fbx',
    flagMaterialPath: 'Models/GameplayObjects/GrassFlag/GrassFlag.material',
	tower: {
      arrow: {
        meshPath: 'Models/Canons/BalistaCanon.fbx',
        materialPath: 'Models/Canons/Balista.material',
        cardTexturePath: 'Textures/balista_tower.png',
      },
    },
  },
  {
    id: 'snow',
    name: 'Snow',
    materialPath: 'Models/Environment/Snow.material',
    overworldBackground: 'sprites/overworld_background-snow.png',
    gameBackground: 'Models/Environment/background-snow.png',
    pathTexture: 'Textures/path_tiles_ice.png',
    flagMeshPath: 'Models/GameplayObjects/SnowFlag/SnowFlag.fbx',
    flagMaterialPath: 'Models/GameplayObjects/SnowFlag/SnowFlag.material',
    tower: {
      arrow: {
        meshPath: 'Models/Canons/SnowBalista/BalistaCanon-snow.fbx',
        materialPath: 'Models/Canons/SnowBalista/Balista-snow.material',
        cardTexturePath: 'Textures/balista_tower-snow.png',
      },
    },
  },
  {
    id: 'volcano',
    name: 'Volcano',
    materialPath: 'Models/Environment/Volcano.material',
    overworldBackground: 'sprites/overworld_background-volcano.png',
    gameBackground: 'Models/Environment/background-volcano.png',
    pathTexture: 'Textures/path_tiles_lava.png',
    flagMeshPath: 'Models/GameplayObjects/VolcanoFlag/VolcanoFlag.fbx',
    flagMaterialPath: 'Models/GameplayObjects/VolcanoFlag/VolcanoFlag.material',
    tower: {
      arrow: {
        meshPath: 'Models/Canons/VolcanoBalista/BalistaCanon-volcano.fbx',
        materialPath: 'Models/Canons/VolcanoBalista/Balista-volcano.material',
        cardTexturePath: 'Textures/balista_tower-volcano.png',
      },
    },
  },
];
