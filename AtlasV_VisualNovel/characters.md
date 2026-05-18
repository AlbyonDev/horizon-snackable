# Fish Character Portrait Registry

> Sprite-prompt reference for the chibi-aquatic art direction. One `<id>_neutral.png` exists in [sprites/](sprites/) for every character in the roster.
>
> Authored content (zones, lures, arcs, quests) lives in [Docs/characters.md](Docs/characters.md). This file is for **portrait-prompt language only** — the chibi descriptor used to regenerate or extend the sprite.

Reference character: [`sprites/nereia_neutral.png`](sprites/nereia_neutral.png).

The locked elements of every prompt (square 1:1, moonlight rim + lantern fill, dark underwater backdrop, huge reflective eyes, neutral expression baseline) are described in [Docs/ART_DIRECTION.md](Docs/ART_DIRECTION.md). Per-character descriptors below are the variable `{CHARACTER_DESCRIPTION}` slot.

---

## Long-arc characters (3)

### Nereia — Koi
- **File:** [`sprites/nereia_neutral.png`](sprites/nereia_neutral.png)
- **Accent:** `#9B7FCC` purple / `#E8A84C` gold
- **Description:** A small round chibi fish-person inspired by the koi, with a deep midnight-blue and violet upper body, cream-peach belly and face, ornate gold swirling filigree across the head and top fin like a delicate crown, huge round glossy amber eyes, calm composed neutral expression with a small soft frown

### Kasha — Siamese Fighting Fish (Betta)
- **File:** [`sprites/char_veiltail_neutral.png`](sprites/char_veiltail_neutral.png)
- **Accent:** `#D33A2C` scarlet / `#E07A2B` burnt orange
- **True name:** Aki
- **Description:** A small round chibi fish-person inspired by the betta, with a scarlet and crimson body flushed with burnt-orange edges, long flowing veiltail fins like silk banners trailing behind, proud upturned head, huge round glossy amber-gold eyes with sharp highlights, calm composed neutral expression with a defiant set jaw

### Fugu — Pufferfish
- **File:** [`sprites/char_pufferfish_neutral.png`](sprites/char_pufferfish_neutral.png)
- **Accent:** `#FFB84D` warm orange
- **Description:** A round bulbous chibi fish-person inspired by the pufferfish, with a warm-orange and cream-yellow body covered in soft visible spines (not threatening), pudgy round cheeks, comically wide huge round glossy bright amber eyes overflowing with eager energy, calm composed neutral expression that struggles to contain a hopeful grin

---

## NPC characters (6)

### Perch
- **File:** [`sprites/perch_neutral.png`](sprites/perch_neutral.png)
- **Accent:** `#C87533`
- **Description:** A small round chibi fish-person inspired by the perch, with a chubby olive-green and golden-orange body with dark vertical stripes, a small puffy spiny top fin, confident alert expression with a mature knowing gaze, huge round glossy amber eyes

### Pike
- **File:** [`sprites/pike_neutral.png`](sprites/pike_neutral.png)
- **Accent:** `#3A5C2E`
- **Description:** A small round chibi fish-person inspired by the pike, shortened to a stubby chibi shape NOT elongated, with a chubby dark green and silver-grey body with mottled spots, a pudgy rounded snout, intense predatory expression with narrowed experienced focus, huge round glossy pale green eyes

### Carp
- **File:** [`sprites/carp_neutral.png`](sprites/carp_neutral.png)
- **Accent:** `#8B7D3C`
- **Description:** A big chubby chibi fish-person inspired by the carp, with a round olive-green and amber-gold body, heavy painted scale patterns, two short whisker-like barbels, wise patient expression with a weathered calm demeanour, huge round glossy dark amber eyes

### Catfish
- **File:** [`sprites/char_catfish_neutral.png`](sprites/char_catfish_neutral.png)
- **Accent:** `#7A6850`
- **Description:** A round dumpling-shaped chibi fish-person inspired by the catfish, with a chubby dark teal and brown body, four soft little whisker-like barbels around the mouth, calm mysterious expression with an experienced knowing look, huge round glossy deep amber eyes

### Trout
- **File:** [`sprites/trout_neutral.png`](sprites/trout_neutral.png)
- **Accent:** `#6B8FA3`
- **Description:** A small round chibi fish-person inspired by the trout, with a chubby silvery-pink body with dark speckled spots and an iridescent rainbow stripe along the side, small puffy fins, lively curious expression with bright attentive mature gaze, huge round glossy golden eyes

### Eel
- **File:** [`sprites/eel_neutral.png`](sprites/eel_neutral.png)
- **Accent:** `#2D4A3E`
- **Description:** A small round chibi fish-person inspired by the eel, shortened to a stubby chibi sausage shape NOT elongated, with a chubby dark olive-brown body with a golden sheen, tiny puffy ribbon-like fins, cunning calculating expression with narrowed experienced gaze, huge round glossy dark golden eyes

---

## Locked prompt template (for re-generation)

```
chibi aquatic illustration, [SPECIES] fish character, large expressive eyes,
{CHARACTER_DESCRIPTION},
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

Substitute `{CHARACTER_DESCRIPTION}` with the per-character description above. Keep all locked elements untouched to preserve cross-character coherence.
