# H5 Tower Defense — Art Direction

## Style

A bold, cartoony fantasy tower defense in the spirit of Kingdom Rush and Bloons TD, with a slightly darker, chunkier edge — think *Goblin Clash*: orcs and goblins versus medieval towers, fought on a sunlit grassy battlefield.

The art mixes two contrasting moods on purpose:
- **The battlefield itself** is bright, sunny, painterly and welcoming — vibrant yellow-green grass, soft round bushes, big friendly grey boulders.
- **The branding and UI chrome** (title, buttons, panels, frames) is darker and heavier — heavy stone slabs, iron rivets, cracked rock textures, fiery orange-gold lettering with deep shadows and metallic highlights, evoking a goblin warband banner.

This contrast — playful battlefield, gritty frame around it — is the signature look. Neither side should drift too far: the gameplay area stays readable and friendly, the chrome stays chunky and characterful, and together they give the game its identity.

---

## Environment

The playfield is a flat ground viewed from a near top-down angle with a slight tilt that gives it a 2.5D feel. The ground is a painted scene of a grassy clearing: vibrant yellow-green grass in the middle, framed on all sides by darker rounded bushes and chunky grey boulders that form a natural border around the play area. The center stays calm and uncluttered so towers, enemies and the path read clearly on top of it.

The enemy path is **not** part of the painted ground. It is rendered on top as a winding cobblestone trail made of clustered grey stones — irregular, hand-drawn, snaking through the clearing from the spawn point at the top to the base at the bottom. The stones have soft painted shadows so the path feels embedded in the grass rather than floating on it.

*Technical note:* the path uses a **custom shader with world-space UVs** and a tileable **rocks texture**, so segments stitch seamlessly regardless of how the path mesh is shaped or oriented. See [Shaders/PathTile.surface](../Shaders/PathTile.surface).

Lighting is soft and sunny, with gentle painted shadows baked into the decor. No skybox, no horizon, no distant scenery — the camera is almost overhead, so the painted ground and the stone path carry the whole atmosphere of the level.

---

## Towers, Enemies and Effects

Towers are chunky 3D cartoon constructions — wooden platforms, stone bases, copper and iron parts — with warm earthy tones (browns, dark wood, weathered metal) so they stand out from the bright green grass without clashing with the painted ground. Each tower family has a clear color and silhouette identity (Arrow, Cannon, Frost, Laser) so the player recognizes roles instantly. Small health/charge bars float above when relevant.

*Technical note:* each tower is built from a **3D base + a separate 3D top** so the top (turret / barrel) can rotate to aim and animate a short recoil punch on each shot, independent of the base.

Enemies are stylized fantasy creatures in the goblin/orc family — green-skinned, hunched, exaggerated proportions, lots of personality in the silhouette. Each enemy type reads distinctly from above thanks to size, color and posture. Small green health bars sit above their heads.

*Technical note:* enemies are **rigged 3D characters with skeletal animations** (walk, attack, hit, death) — not sprite billboards — so motion stays smooth and readable under the 2.5D camera. New enemies are produced via the [`create-enemy`](../Assistant/skills/create-enemy.md) skill, which handles mesh + rig + animation setup end-to-end.

Effects (projectiles, hits, range previews) stay punchy and cartoony — clear shapes, no realistic particles. Placement previews glow green when valid and red when not.

---

## UI

The UI sits in framed panels at the top and bottom of the screen so the play area in the middle is never covered. The frames themselves are the chunky "Goblin Clash" style: dark stone or wood textures with metallic gold corner studs, thick rounded borders, baked highlights and shadows — like little engraved plaques.

The top HUD shows lives (red heart in a stone frame) on the left, the wave label in glowing gold lettering in the center, and gold currency (coin icon in a stone frame) on the right. The bottom shop is a row of tower cards, each a small wooden plaque with the tower icon, name on a parchment-style band, and the cost shown next to a gold coin — turning grey when unaffordable rather than hiding, so the player always sees what is coming next.

Typography for big diegetic moments (title screen, PLAY button, wave numbers, victory/defeat) uses a heavy fantasy display style: thick blocky letters, fiery orange-to-gold gradient, dark outline, slight bevel. In-game numeric readouts (lives, gold) reuse the same warm gold tone in a simpler weight so they stay legible at small sizes.

Buttons are large, rectangular, framed in the same stone-and-gold style as the panels — generous tap targets, obvious affordance.

*Technical note:* all UI is built as **Custom UI in XAML** (MHS Custom UI panels), not as in-world 3D quads — so layout, text and reactive data binding (gold, lives, wave) all flow through the XAML viewmodels.

---

## Overall Mood

Sunny battlefield, gritty frame. The play area feels like a cheerful cartoon meadow you defend; the UI around it feels like the rough banner of a goblin warband. A game that looks instantly fun on a phone storefront screenshot, and immediately readable once you start playing.
