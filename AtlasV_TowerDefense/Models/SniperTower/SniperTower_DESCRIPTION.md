# SniperTower — Asset Description

## What it is
A tall, narrow fantasy watchtower for a tower defense game (H5 Tower Defense). Features a stone base, layered wooden platforms, copper/iron structural accents, and a long-barreled crossbow weapon mounted on top pointing forward. Designed to communicate long-range sniping capability through its tall, narrow silhouette.

## Art Style
Chunky cartoon fantasy / low-poly stylized, matching the Kingdom Rush / Clash Royale / Goblin Clash aesthetic. Earthy warm tones: wood browns, stone grays, muted copper/iron metallic accents. Consistent with existing towers in the project (wooden platforms, stone base, warm earthy palette).

## Technical Details
- **Mesh file:** `Models/SniperTower/SniperTower (2).fbx`
- **Texture file:** `Models/SniperTower/texture.png`
- **Material file:** `Models/SniperTower/SniperTower (2).material`
- **Mesh asset ID:** `26631398616455768:14162780754545549202:2007718928`
- **Template asset ID:** `26631398616455768:14162780754545549202:2719744159`
- **Polycount:** ~9,821 vertices
- **Target height:** 4 meters
- **Bounding box:** ~1.47 m × 4.0 m × 1.51 m (W × H × D)
- **LOD:** 5-level canonical LOD curve applied

## Usage Notes
- Tower sits with its base at Y=0 (no ground offset required).
- The crossbow/weapon top is a separate conceptual element baked into the mesh; for turret rotation (top aims at enemies), a separate top mesh should be generated and parented to this base.
- Placed in a tower defense scene as a static base prop.
