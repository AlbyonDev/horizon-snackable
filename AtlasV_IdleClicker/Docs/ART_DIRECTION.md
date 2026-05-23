# Art Direction — AtlasV Idle Clicker

**Visual Style:** Stylised painterly fantasy — vibrant Aztec/Mayan-temple jungle and crystal-cave settings with chunky soft-edged forms, warm rim lighting, and a saturated jewel-tone palette. Mobile-game illustration look (think modern casual idle clicker art).

---

## Sprite Style

- **Form language:** chunky, rounded silhouettes; soft volumetric shading rather than flat cel-shading.
- **Lineart:** no hard inked outlines on world backgrounds; props (pickaxe, shrine) use soft dark outer rim instead of a uniform line.
- **Shading:** painted gradients with strong directional light from upper-center; pronounced specular highlights on metal, crystal, and water; deep blue-violet shadows.
- **Saturation:** high. Greens lean towards teal; golds and oranges are warm and glowing.
- **Background treatment:** props and icons render on transparent PNG with soft-edge anti-aliasing — sprite `.assetmeta` files should have `premultiplyAlpha: true` for transparent sprites. The two fullscreen scene backgrounds (`title_background.png`, `tap_zone_background.png`) are fully opaque and use `premultiplyAlpha: false`.
- **Facing direction:** the player pickaxe (`pickaxe_cursor.png`) faces upper-right (head to upper-right, handle to lower-left); it is mirrored in code for left-swing animation.
- **Minimum readable size:** icons are authored ~256×256 and must remain readable when rendered at 44×48 px (shop tabs and rows).

---

## Color Palette

### Scene / world (driven by backgrounds, not constants)
| Role | Hex | Notes |
|---|---|---|
| Jungle teal-green | `#2C9A7A` ish | tap zone foliage, water glow |
| Stone violet-grey | `#5A4A6A` ish | temple pillars, cave walls |
| Sky cyan | `#7BD3E8` ish | tap zone sky behind waterfall |
| Crystal pink/violet | `#C77FCB` / `#7E5FD8` | wall gems in title scene |

### UI surface
| Role | Hex |
|---|---|
| Shop background (top) | `#001C242F` → `#FF1C242F` (vertical gradient) |
| Shop tab bar | `#FF141C28` |
| Shop row background | `#FF17202D` |
| Shop row border | `#FF232C3A` |
| Upgrade card background | `#FF0F1A25` |
| Progress bar track | `#0A1019` |
| Progress bar fill (positive) | `#FF2ECC71` (teal-green) |
| Title-screen vignette | gradient `#AA000000` → `#33000000` → `#CC000000` |

### Buttons & accents
| Role | Hex |
|---|---|
| Buy button top (afford) | `#FF74BF16` |
| Buy button bottom (afford) | `#FF294E00` |
| Buy button disabled | `#553d2c2c` |
| Buy button red top (unafford) | `#FFD32F2F` |
| Buy button red bottom (unafford) | `#FF6B1010` |
| Play button top | `#FFD700` (gold) |
| Play button bottom | `#B8860B` (dark gold) |
| Icon tile background | `#FF154EBD` w/ border `#FF4192F1` |
| Active tab gradient | `#FF1A3A5C` → `#FF0F2840` |
| Active tab label | `#FF2ECC71` |

### Text
| Role | Hex |
|---|---|
| Primary white | `#FFFFFFFF` |
| Muted white | `#80FFFFFF` / `#60FFFFFF` |
| Resource counter gold | `#FFD700` |
| Stroke / outline | `#FF000000` (1–4 px) |

---

## UI Visual Style

- **Layout:** portrait 1080×1920. Each UI is a full-canvas `Grid` containing a `Viewbox` with a 480×850 inner authoring grid that scales uniformly.
- **Panels:** dark navy (`#FF17202D` / `#FF141C28`) with thin 1 px borders (`#FF232C3A`). Square corners on the shop frame; 5–7 px rounded corners on row icons, buy buttons, and upgrade cards.
- **Buttons:** flat vertical gradient (green for afford, red for unafford, gold for the title Play). Stroked white label text with a 1–4 px black outline. Press feedback is a 0.95 scale-down.
- **Icons:** displayed inside a 48×48 rounded-square tile with a blue background (`#FF154EBD`) and brighter blue border (`#FF4192F1`). Image stretched `Uniform` inside the tile.
- **Progress bars:** dark track (`#0A1019`), teal-green fill (`#FF2ECC71`) with a top-down white-to-transparent highlight gradient, 3 px corner radius.
- **Vignette / depth:** title screen uses a dark gradient overlay to push the background back; shop fades from transparent to solid `#1C242F` at the top so the tap-zone scene is visible behind it.

### Typography
| Role | Font | Size | Weight | Color | Stroke |
|---|---|---|---|---|---|
| Resource counter | `Bangers` | 40 | Bold | `#FFD700` | 1 px black |
| "TAP TO EARN" label | `Bangers` | 48 | Bold | `#FFFFFF` | 2 px black |
| Play button label | `Bangers` | 48 | Bold | `#FFE9E9E9` | 4 px black |
| Shop item title | (default) | 15 | Bold | `#FFFFFF` | — |
| Shop item description | (default) | 13 | Regular | `#60FFFFFF` | — |
| Buy button price | (default) | 20 | Bold | `#FFFFFF` | 1 px black |
| Shop tab label | (default) | 10 | DemiBold | `#80FFFFFF` (active: `#FF2ECC71`) | — |
| Upgrade card title | (default) | 13 | DemiBold | `#FFFFFF` | 1 px black |

The only custom font is **`Bangers`** — a chunky comic-book display face used for the marquee callouts (resource counter, TAP TO EARN, PLAY). All other text uses the engine default.

---

## Environment / Background Style

Two authored fullscreen scenes, both 512×512 source PNG (stretched `UniformToFill` over the 1080×1920 canvas):

- **`tap_zone_background.png`** — Daylit jungle clearing in front of an Aztec-style stepped temple. Twin carved stone idols flank a central ground altar inset with a glowing green gem. Twin waterfalls cascade in the mid-ground; palms and tropical foliage frame the edges. Saturated greens, warm sky, soft volumetric mist.
- **`title_background.png`** — Underground treasure cave at night. Carved stone columns inscribed with glyphs flank a small Mayan-style temple structure in the middle distance, lit by torches and a shaft of light from above. Walls are studded with raw crystal clusters in cyan, pink, and red. Mood: mysterious, jewel-toned, low-key with bright crystal highlights.

Neither background contains characters; the player avatar is invisible (scale 0). Both are painted as static scenes — there is no parallax or animation on the background image itself.

---

## Sprite Specifications

| Sprite | Authored dimensions | Transparency | Premultiply | Facing / role |
|---|---|---|---|---|
| `title_background.png` | 512×512 | opaque | false | Fullscreen scene, stretched UniformToFill |
| `title_logo.png` | ~512×256 | transparent | true | "Idle Temple" title — golden block-letter wordmark with carved-stone frame, jade inlays |
| `tap_zone_background.png` | 512×512 | opaque | false | Fullscreen scene, stretched UniformToFill |
| `gem_deposit.png` | ~256×256 | transparent | true | Central tappable gem altar (inline texture, not in Assets.ts) |
| `pickaxe_cursor.png` | ~256×256 | transparent | true | Player + auto-cursor pickaxe; gold head, brown wrapped handle; faces upper-right |
| `icon_gem_resource.png` | ~256×256 | transparent | true | Currency icon — single green gem |
| `icon_shrine.png` | ~256×256 | transparent | true | Jungle Shrine generator icon — stone monolith with glowing core |
| `icon_mine.png` | ~256×256 | transparent | true | Crystal Mine generator icon |
| `icon_critical.png` | ~256×256 | transparent | true | Crit perk — flaming orange/red star |
| `icon_frenzy.png` | ~256×256 | transparent | true | Frenzy perk |
| `icon_vault.png` | ~256×256 | transparent | true | Vault perk |
| `icon_income.png` | ~256×256 | transparent | true | Interest perk |
| `icon_tab_mining.png` | ~256×256 | transparent | true | Shop tab — MINING |
| `icon_tab_upgrade.png` | ~256×256 | transparent | true | Shop tab — UPGRADES |
| `icon_tab_coins.png` | ~256×256 | transparent | true | Shop tab — PERKS / coins |

**Naming convention:** `icon_<role>.png` for HUD/shop icons; `<role>_<descriptor>.png` for scene props and backgrounds. New sprites should match this convention.

**Authoring guidance for new icons:** subject centered on transparent background, soft outer glow allowed, no inner outline, painted shading matching the chunky-stylised pickaxe/shrine reference. Source square, minimum 256×256, expected display size 44–48 px on shop tabs / 48 px on shop rows / 30 px on upgrade cards.
