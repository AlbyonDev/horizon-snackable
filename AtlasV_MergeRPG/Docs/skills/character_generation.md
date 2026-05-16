# Character Generation Skill — Crystal Vanguard

This skill defines the process and prompt structure for generating hero and enemy character sprites for Crystal Vanguard.

## Art Style Requirements

All characters follow the **2D Anime JRPG with chibi proportions** art direction:

- **Proportions:** Chibi style with head-to-body ratio of 1:2.5
- **Lineart:** Clean black outlines (2px equivalent), solid and uniform
- **Shading:** Flat colors with one-step cel-shading highlights, no gradients on characters
- **Eyes:** Large anime-style eyes (1/3 of head height) with highlight dots
- **Limbs:** Stubby and rounded
- **Expression:** Always visible and readable at small sizes
- **Background:** Transparent background with no drop shadows
- **Size:** Characters should be designed to work at 160×200px final size

## Character Types

### Heroes (Player Characters)

**Facing Direction:** Heroes face **RIGHT** (looking toward the right side of the screen)

**Attack Stance:**
- Dynamic action pose showing readiness to attack
- Weapon or magic effect visible and prominent
- Slight forward lean or wind-up motion
- Confident, heroic expression
- Energy/magic effects appropriate to their element

**Common Hero Archetypes:**
- Warrior (sword, shield, armor)
- Mage (staff, robes, magic aura)
- Archer (bow, light armor)
- Cleric (holy symbol, healing light)
- Rogue (daggers, dark clothing)

### Enemies (Monsters/Opponents)

**Facing Direction:** Enemies face **LEFT** (looking toward the left side of the screen)

**Attack Stance:**
- Aggressive, threatening pose
- Claws, weapons, or natural attacks visible
- Menacing expression or features
- Element-appropriate effects (fire, poison, etc.)

**Common Enemy Types:**
- Slimes (blob creatures with eyes)
- Goblins (small humanoid monsters)
- Skeletons (undead warriors)
- Elementals (fire/ice/lightning beings)
- Beasts (wolves, bears, fantasy creatures)

## Generation Workflow

### Step 1: Define Character Concept

Before generating, specify:
1. **Type:** Hero or Enemy
2. **Name:** Character name (e.g., "Warrior", "Fire Mage", "Slime", "Goblin Archer")
3. **Element/Color:** Which gem color they're associated with (RED, BLUE, GREEN, YELLOW, PURPLE)
4. **Description:** Brief description of appearance, weapon, and personality

### Step 2: Generate Sprite

Use `generate_image_bulk` with the following prompt structure:

**For Heroes:**
```
A chibi anime JRPG character sprite of a [CHARACTER_NAME], facing right in an attack stance. [DETAILED_DESCRIPTION]. The character has large anime eyes, stubby limbs, and a head-to-body ratio of 1:2.5. Clean black outlines, flat cel-shaded colors, no gradients. [WEAPON/MAGIC_DESCRIPTION] is prominently displayed. Dynamic action pose showing readiness to attack. White background, full body visible, isolated character.
```

**For Enemies:**
```
A chibi anime JRPG enemy sprite of a [ENEMY_NAME], facing left in an attack stance. [DETAILED_DESCRIPTION]. The creature has large expressive features, stubby limbs, and a head-to-body ratio of 1:2.5. Clean black outlines, flat cel-shaded colors, no gradients. [ATTACK/FEATURE_DESCRIPTION] is prominently displayed. Aggressive, menacing pose. White background, full body visible, isolated character.
```

### Step 3: Process Sprite

1. **Remove background:** Use `remove_image_background` to create transparent PNG
2. **Crop to content:** Use `crop_image_to_content` to trim excess space
3. **Copy to assets:** Move to `sprites/` folder with naming convention:
   - Heroes: `hero_[name]_attack.png` (e.g., `hero_warrior_attack.png`)
   - Enemies: `enemy_[name]_attack.png` (e.g., `enemy_slime_attack.png`)
4. **Set Premultiply Alpha:** Modify `.assetmeta` file to set `"premultiplyAlpha": true`

### Step 4: Add to Assets.ts

```typescript
// In scripts/Assets.ts
export const hero[Name]AttackTexture: TextureAsset = new TextureAsset("@sprites/hero_[name]_attack.png");
export const enemy[Name]AttackTexture: TextureAsset = new TextureAsset("@sprites/enemy_[name]_attack.png");
```

## Example Prompts

### Example 1: Fire Mage Hero (RED)

```
A chibi anime JRPG character sprite of a Fire Mage, facing right in an attack stance. A young adult mage with flowing red robes and a pointed wizard hat. She holds a wooden staff with a glowing red crystal orb at the top, flames swirling around it. Her eyes are large and determined, with bright orange highlights. Her hair is long and red, flowing dramatically. The character has large anime eyes, stubby limbs, and a head-to-body ratio of 1:2.5. Clean black outlines, flat cel-shaded colors, no gradients. The staff and flames are prominently displayed. Dynamic action pose showing readiness to cast a fire spell. White background, full body visible, isolated character.
```

### Example 2: Goblin Archer Enemy (GREEN)

```
A chibi anime JRPG enemy sprite of a Goblin Archer, facing left in an attack stance. A small green-skinned goblin with pointed ears and sharp teeth. He wears tattered brown leather armor and holds a crude wooden bow with an arrow nocked. His eyes are large and mischievous, with a wicked grin. The creature has large expressive features, stubby limbs, and a head-to-body ratio of 1:2.5. Clean black outlines, flat cel-shaded colors, no gradients. The bow and arrow are prominently displayed, aimed toward the left. Aggressive, menacing pose. White background, full body visible, isolated character.
```

### Example 3: Ice Slime Enemy (BLUE)

```
A chibi anime JRPG enemy sprite of an Ice Slime, facing left in an attack stance. A translucent blue blob creature with a rounded body and large cute eyes. Icicles protrude from its top like a crown, and frost particles float around it. Its expression is menacing despite the cute appearance, with narrowed eyes and a determined look. The creature has large expressive features and a head-to-body ratio of 1:2.5. Clean black outlines, flat cel-shaded colors with slight transparency effect on the body. The icicles and frost are prominently displayed. Aggressive, bouncing pose ready to attack. White background, full body visible, isolated character.
```

## Color Associations

When designing characters, consider their gem color affinity:

- **RED (Crimson):** Fire, passion, warriors, physical damage
- **BLUE (Azure):** Water, ice, magic, intelligence
- **GREEN (Emerald):** Nature, poison, healing, growth
- **YELLOW (Aureate):** Light, holy, lightning, speed
- **PURPLE (Void):** Dark, shadow, chaos, debuffs

## Quality Checklist

Before finalizing a character sprite, verify:

- [ ] Character faces correct direction (heroes right, enemies left)
- [ ] Attack stance is clear and dynamic
- [ ] Weapon/attack feature is prominently visible
- [ ] Proportions match chibi style (1:2.5 head-to-body)
- [ ] Clean black outlines, no gradients
- [ ] Large anime eyes with highlights
- [ ] Background is transparent
- [ ] Image is cropped to content
- [ ] Premultiply alpha is enabled in .assetmeta
- [ ] File is named correctly in sprites/ folder
- [ ] Asset is declared in Assets.ts

## Integration with Game

Once a character sprite is generated and processed:

1. Add to `TeamState.ts` character definitions
2. Assign gem color affinity values
3. Set HP and attack stats
4. Test in-game at 160×200px size
5. Verify visibility against dungeon background
6. Check that facing direction works with team layout (allies left, enemies right)

## Tips for Consistency

- Use the same base prompt structure for all characters
- Keep weapon/attack features at similar prominence levels
- Maintain consistent line weight and shading style
- Test multiple generations and pick the best match
- If a character doesn't match the style, regenerate with adjusted prompt
- Always specify "chibi anime JRPG" and "1:2.5 head-to-body ratio" in prompts
