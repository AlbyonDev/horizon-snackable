# Art Direction — TIME STOP

## Vue d'ensemble

Le jeu se déroule dans une **forêt de bambous**, esprit nature/cartoon japonisant. Les objets qui tombent sont des **tronçons de bambou** — cylindriques, verts, avec des nœuds caractéristiques et des extrémités tranchées. L'ambiance est légère et colorée, contrastant avec la tension du gameplay.

L'objectif visuel : **lecture instantanée de la forme, de la rotation et de la proximité au sol**. Le joueur doit percevoir en une fraction de seconde où est le bord inférieur de l'objet pour décider quand tapper.

### Références visuelles

- Background : forêt de bambous verts, lumière diffuse, feuillage en arrière-plan
- Objets : tronçons de bambou cylindriques avec texture bois vert, nœuds annulaires, extrémités biseautées/tranchées
- Style général : cartoon 2D stylisé, couleurs saturées, ombres douces
- UI : panneaux bois façon arcade, typographie pixel/rétro, orangé/brun pour les accents

---

## Plan de jeu et caméra

Tout le gameplay se passe dans le **plan XY**, vu de face le long de l'axe **-Z**.

| Axe | Rôle | Valeur Z |
|---|---|---|
| X | horizontal (gauche/droite) | Z = 0 (fixe) |
| Y | vertical (haut/bas, Y-up) | Z = 0 (fixe) |
| Z | profondeur visuelle uniquement | jamais utilisé pour la physique |

La caméra est fixe, orthogonale ou légèrement perspective. Les objets sont des entités 3D mais **seule leur face avant est visible**. Profondeur et épaisseur (axe Z) sont libres — elles ne participent pas au gameplay.

### Zone de jeu

```
 9 wu large × 16 wu haute, centrée à l'origine

 Y =  8.0  ─────────────── bord haut de la zone
 Y =  6.68 ─ START_Y       ligne de spawn / ghost preview
 Y =  5.49 ─ PLAY_TOP      début de la zone de scoring
             [zone active]
 Y = -6.47 ─ FLOOR_Y       ligne game-over (ne pas franchir)
 Y = -8.0  ─────────────── bord bas de la zone
```

---

## Contraintes des objets tombants

### Rendu — Assemblage 3 sprites 2D (bamboo log)

Les bambous sont rendus dans `FallingObjCanvas.ts` comme **3 items 2D canvas côte à côte** (Left cap, Center body, Right cap), positionnés et animés entièrement en espace canvas (pixels). Il n'y a pas de planes 3D — le rendu est purement 2D via `CustomUiComponent`.

**Dimensions natives des textures :**

| Sprite | Fichier | Largeur native | Fraction du total |
|--------|---------|----------------|-------------------|
| Left | `bambooLeft.png` | 172 px | 172 / 621 ≈ 27.7 % |
| Center | `bambooCenter.png` | 192 px | 192 / 621 ≈ 30.9 % |
| Right | `bambooRight.png` | 257 px | 257 / 621 ≈ 41.4 % |
| **Total** | — | **621 px** | 100 % |

Hauteur commune des 3 sprites : **128 px**.

**Loi de scaling — toutes les pièces scalent proportionnellement :**

```
totalW  = scaleX × PX_PER_WU_X
leftW   = (172/621) × totalW   ← fraction native, pas fixe
centerW = (192/621) × totalW
rightW  = (257/621) × totalW
h       = scaleY × PX_PER_WU_Y
```

Les fractions sont figées par les dimensions natives — si le log est plus large, les 3 pièces grossissent proportionnellement. Aucune pièce n'a de taille fixe.

**Décalage d'assemblage (`assemblyShiftX`) :** le cap droit (257 px) est plus large que le cap gauche (172 px), donc le centre de masse visuel n'est pas au centre géométrique. Pour centrer l'assemblage sur le pivot du log :

```typescript
assemblyShiftX = (rightW - leftW) / 2
leftOffX   = -assemblyShiftX - (centerW/2 + leftW/2  - 2)  // -2 px overlap
centerOffX = -assemblyShiftX
rightOffX  = -assemblyShiftX + (centerW/2 + rightW/2 - 2)  // -2 px overlap
```

Les offsets sont ensuite projetés dans l'espace canvas avec la rotation du log (`cos θ`, `sin θ`). Les 2 px d'overlap masquent les jointures.

> **⚠ Si les sprites bamboo doivent être refaits :** utiliser **un seul sprite** (bambou complet) scalé uniformément est beaucoup plus simple. L'assemblage 3 pièces est une contrainte des assets actuels, pas une exigence technique — dans l'implémentation courante, les 3 pièces scalent toutes proportionnellement de toute façon. Un sprite unique élimine le décalage d'assemblage, les overlaps, et les artefacts de jointure.

### Echelle et bounding volume

La physique (`FallingObjService`) travaille en logique pure (cx, cy, logW, LOG_H). La collision est calculée sur les 4 coins du rectangle `logW × LOG_H` après rotation — indépendamment du rendu.

### Objets bambou (type Log — actuel)

- Sprite Center : texture bambou corps (répétable horizontalement)
- Sprite Left cap : extrémité gauche biseautée, largeur fixe
- Sprite Right cap : extrémité droite biseautée (miroir du left via UV ou asset séparé)
- La forme doit rester **reconnaissable à tout angle de rotation** (0–360°)

### Objets non-rectangulaires (types futurs)

Si un nouveau type a une forme non-rectangulaire (cercle, triangle, étoile…), le `FallingObj` doit implémenter un `getLowestY()` et un bounding volume adaptés à cette forme. Voici les recommandations par forme :

#### Cercle / Boule

- Template : sphère de diamètre 1 (rayon 0.5), centrée à l'origine
- Le code peut calculer `lowestY = cy - radius` (pas besoin de rotation des coins)
- `localScale = (diameter, diameter, diameter)` ou `(diameter, diameter, Z_depth)`
- Avantage : `lowestY` trivial, look indépendant de la rotation

#### Triangle / Forme pointue

- Template : mesh triangulaire inscrit dans le cube 1×1×1
- Le code calculera les coins du triangle transformé (3 points)
- `getLowestY` = minimum Y des 3 coins après rotation
- ⚠ La pointe vers le bas crée une lecture ambiguë au joueur — préférer pointe vers le haut ou côté

#### Losange / Diamant

- Template : quad ou mesh losange dans le cube 1×1×1
- 4 coins calculés comme le Log — suffit d'adapter `_getCorners()`
- Bonne lecture visuelle : le coin inférieur est clairement le point "danger"

#### Forme irrégulière / asymétrique

- Approcher par un **bounding rectangle** ou un **bounding circle** au choix
- Documenter clairement le choix dans le `case` correspondant de `getLowestY()`
- La hitbox approximative est acceptable si elle est légèrement conservative (plus petite que le mesh)

---

## Lisibilité en mouvement

Les objets bougent, tournent et rebondissent rapidement. Critères de lisibilité prioritaires :

| Critère | Recommandation |
|---|---|
| **Silhouette bambou** | Le nœud annulaire et les extrémités biseautées identifient instantanément la forme |
| **Bord inférieur lisible** | L'extrémité coupée (cap) doit avoir une couleur légèrement plus sombre/saturée que le corps |
| **Contraste avec le fond** | Ombre portée légère ou outline sombre (1–2px) pour se détacher du fond forêt |
| **Asymétrie haut/bas** | Les caps gauche/droit sont identiques par symétrie — c'est intentionnel pour le bambou |
| **Épaisseur Z** | Non pertinent pour le rendu 2D canvas — aucun paramètre exposé |

---

## Ghost (pré-visualisation)

Avant que les objets commencent à tomber, ils apparaissent en mode ghost à `START_Y ≈ 6.68 wu`. Le champ `launched = false` dans `FallingObjRenderState` indique au renderer que l'objet est en ghost.

Pour que le ghost soit lisible sans être trop présent :
- Alpha ghost recommandé : ~30–40 %
- Les sprites bambou ghost peuvent utiliser une teinte légèrement désaturée/bleutée
- Le renderer 2D (`ScreenSpaceOverlayViewModel`) peut appliquer l'alpha via `scaleX`/`scaleY` ou une propriété dédiée selon les capacités XAML

---

## Freeze et fade-out

À la freeze, l'objet joue un fondu :
- **240 ms** à pleine opacité (temps d'appréciation du score)
- **460 ms** de fondu de `alpha 1 → 0` via `ColorComponent`
- Puis `entity.destroy()`

Les effets de freeze (flash, particules, distorsion) peuvent être ajoutés en s'abonnant à `Events.FallingObjFrozen` dans un composant VFX dédié. Le payload fournit `lowestY` (position Y du bas de l'objet) pour positionner les effets.

---

## Enregistrement des assets

Tout template `.hstf` créé dans Horizon Studio **doit être enregistré dans `Scripts/Assets.ts`** dans `FallingObjTemplates` :

```typescript
// Scripts/Assets.ts
import { FallingObjType } from './Types';

export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
  [FallingObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
  [FallingObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'), // exemple
};
```

**Règles :**
- Chemin relatif depuis `Assets.ts` : `../Templates/…`
- La clé est la valeur de l'enum `FallingObjType`
- Jamais de `TemplateAsset` hardcodé directement dans un composant

---

## Checklist pour un nouvel asset

Avant d'intégrer un nouveau template dans le jeu :

- [ ] Le mesh tient dans un cube **1 × 1 × 1** centré à l'origine
- [ ] La silhouette est **reconnaissable à tout angle** (0–360°)
- [ ] Le **bord inférieur** est visuellement distinct
- [ ] Le mesh a **bon contraste** sur le fond de jeu (outline ou rim)
- [ ] L'asset n'a **pas de symétrie parfaite haut/bas** (ou c'est intentionnel)
- [ ] Le template est enregistré dans `FallingObjTemplates`
- [ ] `FallingObjType` a une nouvelle valeur correspondante
- [ ] `FallingObj._initTypePhysics`, `_tickTypePhysics`, `_applyTypeTransform`, `getLowestY` ont un `case` pour ce type
- [ ] `SpawnManager._buildObjConfig` a un `case` pour ce type
