# Hooked on a Feeling — Art Direction

> **Last updated:** Initial creation  
> **Purpose:** Define the visual style for all art, models, and meshes to ensure thematic consistency

---

## Master Art Style

**Style Name:** Nocturnal Pond Illustration — Mobile Otome Premium

**One-line reference:** The illustration quality and colour discipline of *Tears of Themis* or *Mr Love: Queen's Choice*, applied to a naturalist aquatic subject (pond ecosystem at night) with a chibi-adjacent character style for fish.

### What This Style IS

- **Digital illustration** with clean linework and soft shading
- **Colour discipline:** Dark dominant palette punched by warm light sources
- **Atmospheric depth** through layered blur and light diffusion — not flat
- **Characters are expressive and readable** at small sizes (square portrait format)
- **Backgrounds are painterly and detailed** but not photorealistic
- **Overall feeling:** Quiet, beautiful, slightly melancholic, with moments of warmth

### What This Style IS NOT

- ❌ Not realistic / photographic
- ❌ Not flat design or vector illustration
- ❌ Not bright or pastel (avoid at all times)
- ❌ Not Western cartoon or comic-book linework
- ❌ Not horror or dark fantasy — the darkness is atmospheric, not threatening
- ❌ Not cluttered — each illustration has clear visual hierarchy

---

## Colour Palette

All assets must operate within this palette. Exact hex values for UI elements; backgrounds and sprites use these as dominant range reference.

### Core Palette

| Role | Hex | Usage |
|---|---|------|
| **Void / Deep shadow** | `#080D14` | Darkest darks in backgrounds, UI cards |
| **Pond deep** | `#0D1E35` | Mid-shadow in water, background base |
| **Pond mid** | `#1A3A5C` | Water colour, background mid-tones |
| **Night sky** | `#0F1B2D` | Sky in backgrounds |
| **Moonlight** | `#C8D8E8` | Cool highlight on water, rim-lighting on fish |
| **Lantern warm** | `#E8A84C` | Warm light source — lanterns, fire, gold lures |
| **Lantern glow** | `#F5D08A` | Brightest warm highlight |
| **Lily white** | `#E8EAD8` | Lily pads, foam, pale elements |

### Character Accent Colours

| Character | Accent Colour | Hex |
|-----------|---------------|-----|
| **Nereia (Koi)** | Purple / gold | `#9B7FCC` / `#E8A84C` |

*Additional characters will be added here when implemented. Each character gets a unique accent colour pair.*

### UI Colours

| Role | Hex | Usage |
|---|---|------|
| **UI dark card** | `#0D1520CC` | Semi-transparent dialogue box, journal cards (CC = 80% opacity) |
| **UI text primary** | `#E8EAD8` | All main UI text |
| **UI text secondary** | `#8A9AB0` | Labels, secondary info |

---

## Lighting Rules

Every asset must have consistent light logic. In Hooked on a Feeling, there are two light sources:

### Primary — Moon/Sky
- **Cool, diffuse**, comes from above and slightly behind
- Creates **soft blue-white rim lighting** on subjects
- Never harsh

### Secondary — Lanterns/Warm Practical
- **Warm amber-gold**, comes from background elements (lanterns, reflections)
- Creates **warm fill** on foreground subjects
- Adds depth and romance

### Water Reflections
- Both light sources reflect and diffuse in the water
- **Caustic light patterns** (rippling light underwater) appear in water surfaces and on fish
- This is the primary source of visual complexity in backgrounds

### Rule
No asset should be lit in a way that contradicts both of these sources. All fish portraits are lit from above (moonlight rim) with warm fill from the right (lantern glow).

---

## Fish Portrait Specifications

All fish portraits share identical format parameters. Only species-specific details change.

### Format
- **Square 1:1 ratio** (512×512px minimum)
- **Composition:** Fish centered, head and pectoral fins occupying top 75% of frame
- **Water line:** Sits at approximately 65% from top — fish emerges from water at this line
- **Background:** Deep underwater blue-black (`#0D1E35`) with soft caustic light ripples
- **Lighting:** Cool moonlight rim from above, warm amber fill from right
- **Linework:** Clean, confident — not scratchy. Moderate weight.
- **Shading style:** Soft cel-shading — defined shadow areas with soft edges, not airbrushed
- **Eye style:** Large, round, highly reflective — two specular highlights (one cool, one warm). Eyes carry all emotion.
- **Expression system:** Emotion conveyed through eye shape, fin position, and body lean — not facial features

### Expression States (4 per fish)
1. **EXPR_NEUTRAL** — Round calm eyes, relaxed fins, upright posture
2. **EXPR_CURIOUS** — Wide eyes with bright highlights, fins perked forward, lean toward viewer
3. **EXPR_WARM** — Slightly narrowed eyes with soft highlight, relaxed spread fins, slight tilt inward
4. **EXPR_ALARMED** — Very wide eyes with sharp highlights, flared or pulled back fins, lean away from viewer

### What Must NEVER Appear in Fish Portraits
- ❌ Human features (lips, nose, hair, hands, ears, clothes)
- ❌ Text or UI elements
- ❌ Other fish or background characters
- ❌ Hard vignette edges
- ❌ Watermarks

---

## Background Specifications

### Format
- **Portrait rectangle 9:19.5 ratio** (1080×2340px minimum)
- **Orientation:** Portrait — no landscape variants needed
- **Fish character:** NOT INCLUDED in background — fish sprites overlay in code
- **Float:** NOT INCLUDED — float is code-drawn
- **Fishing line:** NOT INCLUDED — line is code-drawn
- **Fishing rod:** INCLUDED at top-right corner — partial view, just tip and reel section
- **UI safe zones:** Bottom 30% darker/less detailed for UI overlays; left 25% softened for dialogue box

### Shared Parameters (Include in ALL background prompts)
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

### Territory-Specific Characteristics

#### Nereia's Territory — The Lily Shallows (IMPLEMENTED)
- **Time:** Late night, full moon
- **Features:** Dense water lily coverage, stone lanterns on wooden dock, full moon reflection, clear water with visible depth, old stone walls, purple wisteria petals floating
- **Colour temperature:** Coolest of all backgrounds — moon dominates, lanterns distant

*Additional territory backgrounds will be designed when their corresponding characters are implemented.*

---

## CG Illustrations

### Format
- **Full portrait screen 9:19.5 ratio** (1080×2340px minimum)
- **Style:** Same art style as backgrounds — painterly digital illustration
- **Composition:** Full compositional freedom — not constrained to background format
- **Fish characters in CGs:** Full body or near-full body — not portrait crops
- **Text overlay zone:** Bottom 15% reserved for epitaph text in UI

### Reel (Catch) CG Tone
These depict the aftermath of catching a fish. Composed on land, from fisherman's perspective, never showing the fisherman directly. Tone alternates between absurdist and quietly melancholic per character.

**Example (Nereia):**
- Traditional Japanese kaiseki presentation, koi dish elegantly plated, single golden scale on table

### Release (Let Go) CG Tone
These depict the pond after the fish has been released. Composed from fisherman's perspective above water. Tone is warm and open.

**Example (Nereia):**
- Wide view of pond at dusk, float bobbing alone, golden koi shape deep under water circling once

---

## Emotion Icon Set

### Format
- **Square 1:1 ratio** (128×128px minimum)
- **Background:** Fully transparent
- **Style:** Clean vector-adjacent line art, slightly hand-drawn quality
- **Colour:** Warm off-white icon (`#E8EAD8`) with subtle inner glow in character accent colour
- **Linework:** Single confident stroke weight, rounded ends
- **Shadow:** Soft drop shadow — `#00000040` 4px blur, 2px offset down

### Icon Set
- `?` — Confusion, curiosity, suspicion
- `!` — Surprise, mild alarm
- `♥` — Affection, warmth
- `!!` — Strong alarm, shock
- `…` — Silence, waiting, hesitation
- `♪` — Contentment, humming, pleasant mood
- `💔` — Sadness, hurt
- `💤` — Boredom, drowsiness, disengagement
- `✦` (sparkle) — Bonded tier indicator, delight

### Behaviour Rules
- Icon appears with small bounce-in animation on Beat resolution
- Icon floats ~15% above fish portrait top edge
- Fades out after 2 seconds unless new icon replaces it
- Multiple icons can stack horizontally for combined states (e.g. `?` + `♥`)

---

## UI Visual Language

### Core UI Principles
- **Dark and legible:** All UI sits on dark semi-transparent cards. Text is always light on dark.
- **No borders for decoration:** Borders only appear where they delineate interactive elements
- **Colour per fish:** Accent colour of current fish tints interactive UI elements (action icons, affection bar, dialogue name label)
- **Code-drawn over asset-based:** Float, fishing line, affection bar, tension bar — all code. Only icons and illustrations are assets.

### Dialogue Box
- Background: `#0D1520` at 85% opacity, rounded corners 12px
- Border: 1px `#2A4060` — visible but not prominent
- Fish name label: fish accent colour, bold, 14pt
- Dialogue text: `#E8EAD8`, regular weight, 13pt, line height 1.5
- Maximum 3 lines before scroll or next bubble
- Maximum 80 characters per line

### Action Menu
- Each action row: full width, 52pt minimum height
- Background: `#0D1520` at 90% opacity per row, 1px separator `#1A3A5C`
- Action icon: left, 32×32pt, line art in fish accent colour
- Action name: bold, `#E8EAD8`, 13pt
- Description: below name, `#8A9AB0`, 11pt, italic
- INTENT label: right-aligned, fish accent colour, 10pt uppercase, bold

---

## Prompt Templates

### Fish Portrait Prompt Template
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

### Background Prompt Template
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

### CG Prompt Template
```
full portrait illustration 9:19.5 ratio,
[CG-SPECIFIC PARAMETERS],
same art style as game backgrounds — painterly digital illustration,
no UI elements, no text overlays, no watermarks,
bottom 15% of frame kept relatively clear for text overlay,
1080x2340 pixels minimum
```

### Emotion Icon Prompt Template
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

### For All Visual Assets
1. **Always reference FLOATER_VISUAL_BIBLE_v1.0.md** for complete specifications
2. **Use the exact prompt templates** provided above as starting points
3. **Maintain colour palette consistency** — no colours outside the defined palette
4. **Respect lighting rules** — moonlight rim + lantern fill for all fish portraits
5. **Keep backgrounds painterly** — not photorealistic, not flat vector

### For Fish Portraits
- Generate all 4 expression states per fish using identical base parameters
- Only vary eye shape, fin position, and body lean between expressions
- Maintain species-specific details (scales, barbels, markings) across all expressions

### For Backgrounds
- Each fish territory has one fixed time-of-day — do not vary
- Include fishing rod tip at top-right corner in all backgrounds
- Reserve bottom 30% and left 25% for UI overlays

### For CGs
- Reel CGs are land-based, food-focused, absurdist or melancholic
- Release CGs are water-based, pond-focused, warm and open
- Both types should feel like natural conclusions to their respective choices

---

*Every asset described, nothing left to interpretation.*
