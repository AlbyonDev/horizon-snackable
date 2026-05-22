---
name: sprites
summary: How to generate and process 2D sprite images using image generation and transformation tools
include: always
agents: [global]
---

# Sprite Generation and Processing

**⚠️ CRITICAL: Sprites should be the DEFAULT for nearly all visual game elements.** Generated sprite images look significantly better than procedural vector graphics or plain text. You should generate sprites for:

- **Characters** — Player characters, enemies, NPCs, bosses
- **Game objects** — Collectibles, obstacles, projectiles, power-ups
- **Backgrounds** — Environments, terrain, sky, ground
- **Logos and titles** — Game title, "Game Over", "You Win" graphics
- **HUD labels** — Stylized labels like "SCORE", "TIME LEFT", "HEALTH" (the label image, not the dynamic number)
- **Icons** — Hearts, stars, coins, arrows, and any symbolic element

**The first step when planning any 2D game should be identifying which sprite assets need to be generated.**

Exceptions where sprites are NOT needed:
- Dynamic numeric values (actual score number, timer countdown) — use `drawText()` or XAML
- Gameplay instructions or tutorial text — use standard text
- Particle effects — simple vector primitives are fine
- **Interactive boundaries** — containers, play areas, or any element where collision/interaction boundaries must exactly match visual boundaries (e.g., a Tetris well, puzzle board edges, goal zones). Use path graphics instead to ensure pixel-perfect alignment between what the player sees and what the game logic uses.
- When the user explicitly requests procedural/path-based art

### Why Use Path Graphics for Interactive Boundaries

Sprites are raster images that may have anti-aliased edges, transparency variations, or slight visual padding. When you use a sprite for something like a game container or boundary wall, mismatches can occur:

- The visual edge may not align exactly with the collision boundary
- Players may see gaps or overlaps between the sprite and game elements
- Scaling or positioning may introduce sub-pixel discrepancies

For any element where **the visual boundary IS the interactive boundary**, draw it procedurally with path graphics:

```typescript
// CORRECT: Draw a Tetris-style game well with path graphics
// The visual boundary exactly matches the logical boundary
private drawGameWell(ctx: DrawingContext2D): void {
  const wellLeft = this.kWellX;
  const wellTop = this.kWellY;
  const wellWidth = this.kCols * this.kCellSize;
  const wellHeight = this.kRows * this.kCellSize;

  ctx.beginPath();
  ctx.rect(wellLeft, wellTop, wellWidth, wellHeight);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// WRONG: Using a sprite for the game well
// The sprite's visual edges may not align with kWellX, kWellY, etc.
// ctx.drawImage(this.wellSprite, x, y);  // Don't do this!
```

Use sprites for characters, items, and decorative backgrounds. Use path graphics for play areas, containers, and collision boundaries.

You have three tools available for creating sprite assets directly:

| Tool | Purpose | Batch Support |
|------|---------|---------------|
| `generate_image_bulk` | Generate multiple images in parallel from prompt variations | ✅ Multiple images per call |
| `remove_image_background` | Remove backgrounds from images, producing transparent PNGs | ✅ Multiple images per call |
| `crop_image_to_content` | Crop images to visible content bounds, trimming transparent margins | ✅ Multiple images per call |

## Sprite Creation Workflow

Follow this pipeline for every sprite you create:

1. **Generate images** — Use `generate_image_bulk` with descriptive prompts. Always request images on a **solid color background** (white or a contrasting flat color). The image generation model cannot produce transparent backgrounds directly. You can generate multiple images in a single call.  Do NOT tell generate_image_bulk that you are working on sprites or that you want transparency, as it will try to do it itself and produce poor results.
2. **Remove backgrounds** — Use `remove_image_background` on the generated images to produce transparent PNGs. You can process multiple images in a single call.
3. **Crop to content** — Use `crop_image_to_content` on the transparent images to trim excess transparent margins so the visible sprite touches all four edges. You can process multiple images in a single call.
4. **Copy, rename, and clean up** — Copy each processed sprite from the `generatedImages/` folder into the game package's asset folder (e.g., `sprites/` or `images/`) with a clear, descriptive filename, then **delete the original files** from `generatedImages/`. The generated filenames contain hashes and are not human-readable. Use names that match what the sprite represents, e.g., `player.png`, `enemy_slime.png`, `background_forest.png`, `logo_game_title.png`, `label_score.png`.
5. **Set Premultiply Alpha** — **CRITICAL: You MUST do this step or transparency will be broken.** After copying each sprite to the assets folder, modify its `.assetmeta` file to enable premultiplied alpha. See the detailed instructions below.

⚠️ **IMPORTANT:** All three tools support batch processing — you can pass multiple images in a single call for maximum efficiency.

## ⚠️ CRITICAL: Setting Premultiply Alpha on Sprite Textures

**Every sprite texture with transparency MUST have Premultiply Alpha enabled, or the sprite will render with ugly black/white fringing around edges.**

After copying a sprite to the assets folder (e.g., `sprites/player.png`), the engine creates a corresponding `.assetmeta` file (e.g., `sprites/player.png.assetmeta`). You MUST modify this file to set `premultiplyAlpha` to `true`.

### How to Set Premultiply Alpha

1. **Read the `.assetmeta` file** for the sprite (e.g., `sprites/player.png.assetmeta`)
2. **Find and replace** `"premultiplyAlpha": false` with `"premultiplyAlpha": true`
3. **Repeat for every sprite** that has transparency

### Example `.assetmeta` Structure

The relevant section is inside `textureSettings`:

```json
{
    "class": "horizon::AssetMetadata",
    "data": {
        "assetBuilderSettings": [{
            "class": "horizon::renderer::tool::TextureAssetBuilderSettings",
            "data": {
                "textureSettings": {
                    "class": "horizon::renderer::tool::TextureAssetBuilderTextureSettings",
                    "data": {
                        "premultiplyAlpha": true,  // <-- MUST be true for transparency
                        ...
                    }
                }
            }
        }]
    }
}
```

### Batch Processing Tip

After copying all sprites to the assets folder, you can update all `.assetmeta` files in a batch by reading each one and replacing `"premultiplyAlpha": false` with `"premultiplyAlpha": true`.

**DO NOT SKIP THIS STEP.** If you forget to set premultiply alpha, the user will see broken transparency with visible fringing around sprite edges.

## File Handling

The transformation tools (`remove_image_background`, `crop_image_to_content`) overwrite the input file in place with the processed result. This means:

- If `generate_image_bulk` produces `generatedImages/cute_slime_enemy_1234.png`, after background removal the same path contains the transparent version, and after cropping the same path contains the final cropped sprite.
- **No manual cleanup is needed.** Each transformation step overwrites the previous file, so after the full pipeline the project contains only the final processed sprites.
- The final file paths are the same as the originally generated ones, just with the content progressively transformed.

## Prompt Guidelines

- Generate **static sprites only** — do not attempt animated sprite sheets.
- Use descriptive, specific prompts (e.g., "a cute pixel-art slime enemy with green body, white eyes, front-facing, on a solid white background").
- Always specify **"on a solid white background"** (or another flat color) in the prompt.
- Generate all requested images before processing them through the pipeline.

## Example

To create a set of enemy sprites for a 2D game:

1. Call `generate_image_bulk` with variations like:
   - "a cute pixel-art slime enemy with green body, front-facing, on a solid white background"
   - "a pixel-art skeleton warrior with sword, side view, on a solid white background"
   - "a pixel-art bat with purple wings spread, on a solid white background"
2. Call `remove_image_background` on all generated images to get transparent PNGs.
3. Call `crop_image_to_content` on all transparent images to trim the empty space.
4. Copy and rename the processed files into your game's asset folder, then delete the originals:
   - `generatedImages/cute_pixel_art_slime_enemy_a1b2.png` → `sprites/enemy_slime.png`
   - `generatedImages/pixel_art_skeleton_warrior_c3d4.png` → `sprites/enemy_skeleton.png`
   - `generatedImages/pixel_art_bat_e5f6.png` → `sprites/enemy_bat.png`
5. **Set Premultiply Alpha** on each sprite's `.assetmeta` file by replacing `"premultiplyAlpha": false` with `"premultiplyAlpha": true`.
6. The sprites are now ready to use in your game.
