# Hooked on a Feeling — Art Direction

> Visual spec for all art, models, and meshes. Synced with the current 9-character roster.

---

## Master Art Style

**Style Name:** Nocturnal Pond Illustration — Mobile Otome Premium

**One-line reference:** the illustration quality and colour discipline of *Tears of Themis* or *Mr Love: Queen's Choice*, applied to a naturalist aquatic subject (pond ecosystem at night) with a chibi-adjacent character style for fish.

### What this style IS
- **Digital illustration** with clean linework and soft shading
- **Colour discipline:** dark dominant palette punched by warm light sources
- **Atmospheric depth** through layered blur and light diffusion — not flat
- **Characters are expressive and readable** at small sizes (square portrait format)
- **Backgrounds are painterly and detailed** but not photorealistic
- **Feeling:** quiet, beautiful, slightly melancholic, with moments of warmth

### What this style IS NOT
- Not realistic / photographic
- Not flat design or vector illustration
- Not bright or pastel
- Not Western cartoon or comic-book linework
- Not horror or dark fantasy — the darkness is atmospheric, not threatening
- Not cluttered — clear visual hierarchy in every illustration

---

## Colour Palette

All assets must operate within this palette. Hex values are exact for UI; backgrounds and sprites use them as the dominant range reference.

### Core palette

| Role | Hex | Usage |
|---|---|---|
| Void / Deep shadow | `#080D14` | Darkest darks in backgrounds, UI cards |
| Pond deep | `#0D1E35` | Mid-shadow in water, background base |
| Pond mid | `#1A3A5C` | Water colour, background mid-tones |
| Night sky | `#0F1B2D` | Sky in backgrounds |
| Moonlight | `#C8D8E8` | Cool highlight on water, rim-lighting on fish |
| Lantern warm | `#E8A84C` | Warm light source — lanterns, fire, gold lures |
| Lantern glow | `#F5D08A` | Brightest warm highlight |
| Lily white | `#E8EAD8` | Lily pads, foam, pale elements |

### Character accent colours

Each character's accent tints UI elements (action icons, affection bar, dialogue name label) while they're on screen.

| Character | Accent | Hex |
|---|---|---|
| Nereia (Koi) | Purple / gold | `#9B7FCC` / `#E8A84C` |
| Kasha (Betta) | Scarlet / burnt orange | `#D33A2C` / `#E07A2B` |
| Fugu (Pufferfish) | Warm orange | `#FFB84D` |
| Catfish | Earthy brown | `#7A6850` |
| Carp | Olive gold | `#8B7D3C` |
| Perch | Burnt orange | `#C87533` |
| Eel | Deep forest green | `#2D4A3E` |
| Pike | Pike green | `#3A5C2E` |
| Trout | Blue-grey | `#6B8FA3` |

### UI colours

| Role | Hex | Usage |
|---|---|---|
| UI dark card | `#0D1520CC` | Semi-transparent dialogue box, journal cards (CC = 80% opacity) |
| UI text primary | `#E8EAD8` | All main UI text |
| UI text secondary | `#8A9AB0` | Labels, secondary info |

---

## Lighting Rules

Two consistent sources across all art.

### Primary — Moon / Sky
- Cool, diffuse, from above and slightly behind
- Soft blue-white rim lighting on subjects
- Never harsh

### Secondary — Lanterns / Warm Practical
- Warm amber-gold, from background elements (lanterns, reflections)
- Warm fill on foreground subjects
- Adds depth and romance

### Water Reflections
- Both sources reflect and diffuse in water
- **Caustic light patterns** (rippling light underwater) — primary source of visual complexity in backgrounds

### Rule
No asset should contradict both sources. All fish portraits are lit from above (moonlight rim) with warm fill from the right (lantern glow).

---

## Fish Portrait Specifications

All portraits share format parameters. Only species-specific details change.

### Format
- **Square 1:1** (512×512 minimum)
- **Composition:** fish centred, head + pectoral fins occupy top 75% of frame
- **Water line:** ~65% from top — fish emerges from water at this line
- **Background:** deep underwater blue-black (`#0D1E35`) with soft caustic ripples
- **Lighting:** cool moonlight rim from above, warm amber fill from right
- **Linework:** clean, confident, moderate weight
- **Shading:** soft cel-shading — defined shadow areas with soft edges, not airbrushed
- **Eyes:** large, round, highly reflective, two specular highlights (one cool, one warm); eyes carry all emotion
- **Expression:** conveyed through eye shape, fin position, body lean — never facial features

### Expression states

`CharacterPortraitAssets` allows up to four states per character (`neutral`, `curious`, `warm`, `alarmed`). Currently **all 9 characters ship only `neutral`** — the renderer falls back to neutral when other states aren't bound.

| State | Look |
|---|---|
| EXPR_NEUTRAL | Round calm eyes, relaxed fins, upright posture |
| EXPR_CURIOUS | Wide eyes with bright highlights, fins perked forward, lean toward viewer |
| EXPR_WARM | Slightly narrowed eyes with soft highlight, relaxed spread fins, slight inward tilt |
| EXPR_ALARMED | Very wide eyes with sharp highlights, flared or pulled-back fins, lean away |

### What must NEVER appear
- Human features (lips, nose, hair, hands, ears, clothes)
- Text or UI elements
- Other fish or background characters
- Hard vignette edges
- Watermarks

---

## Background Specifications

### Format
- **Portrait 9:19.5** (1080×2340 minimum)
- **Portrait orientation only** — no landscape variants
- **Fish character:** NOT INCLUDED (overlay in code)
- **Float:** NOT INCLUDED (code-drawn)
- **Fishing line:** NOT INCLUDED (code-drawn)
- **Fishing rod:** INCLUDED at top-right — partial view, just the tip and reel
- **UI safe zones:** bottom 30% darker / less detailed (action menu); left 25% softened (dialogue box)

### Shared prompt block (include in every background prompt)

```
mobile game background illustration portrait orientation,
atmospheric nocturnal Japanese pond scene,
high quality digital painting, detailed and painterly,
dark dominant palette deep blues and blue-blacks,
warm lantern light sources creating golden reflections on water,
moonlight creating cool silver-blue highlights on water surface,
water lily pads scattered on pond surface,
fishing rod tip visible at top-right corner entering frame from outside,
subtle mist or humidity in air suggesting night atmosphere,
bottom third of image darker and less detailed for UI overlay,
left quarter of image softened for dialogue text overlay,
no humans visible, no fish visible, no text, no watermarks,
cinematic composition, wide sense of depth
```

### Current shipped background

- **`bg_lily_shallows.png`** — the only pond background currently in `sprites/`. Used for all encounters regardless of character. Dense lily coverage, stone lanterns on a wooden dock, full moon reflection. Coolest possible colour temperature.

Per-character territory backgrounds are a future asset run (one per zone or per long-arc character).

---

## CG Illustrations

### Format
- **Full portrait 9:19.5** (1080×2340 minimum)
- **Style:** same as backgrounds — painterly digital
- **Composition:** full freedom — not constrained to background format
- **Fish:** full body or near-full body, not portrait crops
- **Text overlay zone:** bottom 15% reserved for epitaph text in UI

### Reel (catch) CG tone
Aftermath of catching a fish. Composed on land, from the fisherman's perspective, never showing the fisherman directly. Tone alternates between absurdist and quietly melancholic per character.

### Release (let go) CG tone
The pond after the fish has been released. From above the water. Tone is warm and open.

### Drift-Away CG tone
A quiet, empty composition. The pond without the fish. No closure, no dialogue.

### Current shipped CGs (16 total)

Portraits exist for all 9 characters (`{id}_neutral.png` / `char_<species>_neutral.png`).
Ending CGs:

| Character | Reel | Release | Drift-Away |
|---|:-:|:-:|:-:|
| Nereia | ✓ `nereia_love_end.png` | ✓ `nereia_release_end.png` | — |
| Kasha | ✓ `kasha_love_end.png` | ✓ `kasha_release_end.png` | ✓ `kasha_drift_away.png` |
| Fugu | ✓ `fugu_love_end.png` | ✓ `fugu_release_end.png` | ✓ `fugu_drift_away.png` |
| Catfish / Carp / Perch / Eel / Pike / Trout | — | — | — |

NPC characters have only the portrait CG.

---

## Emotion Icon Set

### Format
- **Square 1:1** (128×128 minimum)
- **Background:** fully transparent
- **Style:** clean line art, slightly hand-drawn
- **Colour:** warm off-white (`#E8EAD8`) with subtle inner glow in the current character's accent colour
- **Linework:** single confident stroke weight, rounded ends
- **Shadow:** soft drop shadow `#00000040` 4px blur, 2px down

### Current shipped icons (9 in `sprites/`)

`emotion_curiosity.png`, `emotion_surprise.png`, `emotion_warmth.png`, `emotion_shock.png`, `emotion_hesitation.png`, `emotion_contentment.png`, `emotion_sadness.png`, `emotion_boredom.png`, `emotion_delight.png`

### Behaviour rules
- Bounce-in on Beat resolution
- Floats ~15% above the fish portrait's top edge
- Fades out after 2s unless a new icon replaces it
- Multiple icons can stack horizontally for combined states (e.g. `?` + `♥`)

---

## Action Icon Set

Four icons, one per `ActionId`. Same line-art style as emotion icons.

| File | Action |
|---|---|
| `action_icon_wait.png` | Wait |
| `action_icon_twitch.png` | Twitch |
| `action_icon_drift.png` | Drift |
| `action_icon_reel.png` | Reel |

The "Slight Reel / Loosen Line / Firm Tug" verbs from earlier design have been retired in favour of the four-action set above. Reuse those four icons everywhere actions appear (menu, HUD, journal explanations).

---

## Lure Icon Set

Square icons over the dark UI palette.

| File | Lure |
|---|---|
| `lure_none.png` | No Lure |
| `lure_red_spinner.png` | Red Spinner |
| `lure_gold_teardrop.png` | Gold Teardrop |
| `lure_feather_fly.png` | Feather Fly |

Icons for `night_lure`, `shell_hook`, `bare_hook` are declared in [LureData.ts](../scripts/LureData.ts) but not yet shipped — these lures fall back to a placeholder in the Tackle Box UI.

---

## UI Visual Language

### Core principles
- **Dark and legible** — all UI sits on dark semi-transparent cards; text is always light on dark
- **No decorative borders** — borders only where they delineate interactive elements
- **Accent per fish** — the current fish's accent tints action icons, the affection bar, and the dialogue name label
- **Code-drawn over asset-based** — float, line, affection bar, tension bar are all code; only icons and illustrations are assets

### Dialogue box
- Background: `#0D1520` @ 85% opacity, 12px rounded corners
- Border: 1px `#2A4060`
- Fish name label: fish accent, bold, 14pt
- Dialogue text: `#E8EAD8`, regular, 13pt, line height 1.5
- Max 3 lines per bubble, max 80 chars per line

### Action menu
- Row: full width, ≥52pt height
- Background: `#0D1520` @ 90% per row, 1px `#1A3A5C` separator
- Action icon: left, 32×32pt, line art in fish accent
- Action name: bold, `#E8EAD8`, 13pt
- Description: below name, `#8A9AB0`, 11pt italic
- INTENT label: right-aligned, fish accent, 10pt uppercase bold

---

## Prompt Templates

### Fish portrait

```
chibi aquatic illustration, [SPECIES] fish character, large expressive eyes,
[FISH-SPECIFIC PARAMETERS],
[EXPRESSION STATE MODIFIER],
emerging from dark pond water,
water line at approximately 65% from top of square frame,
head and pectoral fins occupy top 75% of frame, centered composition,
moonlight rim lighting from above cool blue-white,
warm amber lantern fill from right side,
deep blue-black underwater background #0D1E35 with soft caustic light ripples,
clean confident linework moderate weight,
soft cel-shading with defined shadow areas and soft edges,
large round highly reflective eyes with two specular highlights one cool one warm,
square 1:1 format, 512x512 minimum,
no humans, no human features, no text, no UI, no watermarks,
mobile game character portrait, otome mobile premium quality
```

### Background

```
mobile game background illustration portrait orientation 9:19.5 ratio,
atmospheric nocturnal Japanese pond scene,
[TERRITORY PARAMETERS],
high quality digital painting detailed and painterly,
dark dominant palette deep blues and blue-blacks #0D1E35 base,
warm amber-gold lantern light sources #E8A84C creating reflections on water,
moonlight creating cool silver-blue #C8D8E8 highlights on water surface,
water lily pads scattered on pond surface,
fishing rod tip visible at top-right corner entering frame from outside,
subtle mist humidity in air suggesting night atmosphere,
bottom third of image darker less detailed for UI overlay,
left quarter of image softened for dialogue text overlay,
no humans visible, no fish visible, no floating text, no watermarks,
cinematic composition wide sense of depth,
1080x2340 pixels minimum
```

### CG

```
full portrait illustration 9:19.5 ratio,
[CG-SPECIFIC PARAMETERS],
same art style as game backgrounds — painterly digital illustration,
no UI elements, no text overlays, no watermarks,
bottom 15% of frame kept relatively clear for text overlay,
1080x2340 pixels minimum
```

### Emotion icon

```
single isolated icon, clean simple line art,
warm off-white color #E8EAD8 fill, subtle inner warm glow,
soft drop shadow #00000040 4px blur 2px offset down,
fully transparent background,
square format 1:1, 128x128 minimum,
rounded stroke ends, slightly hand-drawn quality,
no background, no other elements, no text,
icon subject: [ICON DESCRIPTION]
```

---

## Implementation Notes

### All assets
1. Reference this document for canonical palette and lighting
2. Use the prompt templates as starting points
3. Stay inside the defined palette — no off-palette colours
4. Respect lighting (moonlight rim + lantern fill on every portrait)
5. Keep backgrounds painterly, not photorealistic or vector

### Fish portraits
- Currently only `neutral` is shipped per character — when authoring `curious / warm / alarmed` variants, use identical base parameters and vary only eye shape, fin position, and body lean
- Maintain species-specific details (scales, barbels, markings) across all variants

### Backgrounds
- Each background has one fixed time-of-day — do not vary
- Include the fishing rod tip at top-right
- Reserve bottom 30% / left 25% for UI overlays

### CGs
- Reel CGs: land-based, food-focused, absurdist or melancholic
- Release CGs: water-based, pond-focused, warm and open
- Drift-Away CGs: empty water, no dialogue, quiet exit
- All three should feel like natural conclusions to their respective choices

---

*Every asset described, nothing left to interpretation.*
