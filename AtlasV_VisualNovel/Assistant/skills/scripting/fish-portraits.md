---
name: fish-portraits
summary: How to generate visually consistent fish-character portraits for a fishing visual novel.
include: always
agents: [global]
---

# Fish Character Portraits — Visual Novel / Fishing Game

This skill generates **romance-compatible chibi fish-character portraits** for a mobile visual novel / fishing game. Use it any time a new character needs to be drawn or when adding additional sprites for an existing character — every portrait must feel like it came from the same illustrator's hand.

This skill **wraps** the standard `sprites` skill — read it too. Everything in `sprites` (image generation, background removal, cropping, premultiply alpha, file naming) still applies. This document only adds the **art-direction constraints**.

## ⚠️ READ THIS FIRST — How to use this skill

This skill works through three locked mechanisms. All three are required. Skipping any one breaks the cast's visual coherence.

1. **A locked prompt template** to concatenate byte-for-byte (only one slot to fill per character).
2. **A character-description register** — specific words to use, specific words banned. Detailed below.
3. **Mandatory visual reference comparison** via `understand_image`, with the reference Nereia image attached. **You must use `understand_image`, and Nereia must be in the attachments.** Past runs failed because the agent paraphrased the locked sections AND skipped the visual comparison entirely — both at once. The pre-flight and post-flight checks below catch both failures.

If you find yourself wanting to "improve" the wording or skip a step — stop. The current shape exists because past attempts produced inconsistent sprites that did not match the reference at all.

The character you fill into the slot is **always a chibi**. Even a "regal" or "ancient" or "elegant" character must have baby-like proportions — that is the visual language of this visual novel. Real-fish anatomy is the failure mode this skill prevents.

## The reference

The reference character is **Nereia**, located at `sprites/nereia_neutral.png`. Every portrait must feel like it was drawn by the same illustrator on the same day as Nereia.

## ⚠️ Step 0 — Mandatory before any generation: study the reference

Before writing any prompt, before calling `generate_image_bulk`, **do both of these**:

**0a.** View the reference yourself with the `view` tool: `sprites/nereia_neutral.png`. Actually look at it. Note the head-to-body ratio (the head is roughly half the body). Note the eye size (about a third of the face, two bright highlights each). Note that the body is round and stubby, not slim. Note the soft painterly rendering with no hard cel-shading lines. Note that Nereia fills most of the canvas. Note the pale blue-white water line that touches the body only.

**0b.** Call `understand_image` with **only the reference** as the attachment, and ask the model to describe the visual properties that any new character in the same cast must reproduce. Use this exact prompt:

> *"This is the reference character Nereia for a chibi visual novel cast. Describe in detail: (1) head-to-body ratio, (2) eye size relative to face and number of highlights per eye, (3) body shape and proportions, (4) rendering style — painterly versus cel-shaded versus other, (5) how the water line is drawn (color, where it touches the body, how the lower half is rendered), (6) how much of the canvas the character occupies, (7) overall vibe. I will use your description as a constraint when generating new characters."*

Read the response. The descriptions you build later for new characters must echo these properties.

This step is **not** optional. Past runs skipped it and produced cast members that looked nothing like Nereia.

## The locked prompt template

When generating a fish character portrait, the **full prompt** sent to `generate_image_bulk` must follow this exact structure:

```
{CHARACTER_DESCRIPTION}, illustrated visual novel character portrait, soft painterly digital illustration with subtle gradient shading, NOT cel-shaded, NOT comic book style, NOT pixel art, chibi super-deformed proportions with an oversized round head taking up about half the body, tiny short stubby body, baby-like proportions, huge round glossy eyes occupying about one third of the face with two bright specular highlights per eye, cute and lovable design suitable for a romance visual novel, the character fills approximately 80% of the frame, 3/4 view facing toward the right side of the frame with eyes angled slightly toward the viewer, fully fish anatomy with no human features whatsoever — no human face, no human limbs, no human hair, no human ears, no human nose, no human lips, only fish features (fins instead of arms, tail and caudal fin instead of legs, fish nose and mouth), centered composition with a small margin, on a solid pure white #FFFFFF background, completely flat white background with no gradient, no scenery, no ground shadow, no underwater scene, no caustic light, no painted water beyond the character body, no text, no logo, no border, no frame, no signature, horizontally bisected by a calm pale blue-white water line with a few tiny bubbles where it meets the body, the water line touches only the character's body and does not extend across the canvas, the lower half of the character is shown underwater with a soft cool blue tint, slightly softened edges, and reduced contrast as if seen through clear water, the upper half is sharp and crisply rendered above the surface, NOT a realistic fish, NOT a nature illustration, NOT in motion, calm static frontal-ish pose
```

**Only `{CHARACTER_DESCRIPTION}` changes between characters.** Everything from `illustrated visual novel character portrait,` to the end is **identical for every character**. Copy it literally each time.

## Writing the `{CHARACTER_DESCRIPTION}`

This is where past skill runs failed even when the locked tail was correct. The character description must speak the language of chibi mascots, not the language of fish biology.

### Required structure

Always begin with:

> `A small round chibi fish-person inspired by the {SPECIES}, with a {COLOR PALETTE} body, {DECORATIVE MARKINGS}, {EXPRESSION CUE}, huge round glossy eyes,`

Then concatenate the locked tail.

### Mandatory wording rules

- **Always include the words `chibi` and `fish-person`** in the description. "Fish-person" matters because it nudges toward the cute/anthropomorphic vibe; "fish" alone produces nature illustrations.
- **Always say `inspired by the {SPECIES}`**, never just `{SPECIES}`. Saying "a perch" makes the model draw a real perch. Saying "inspired by the perch" lets it stay in chibi land.
- **Always include the words `huge round glossy eyes`** in the description, even though the locked tail also mentions them. Per-character redundancy makes it stick.

### Banned words

These words cause the model to drop chibi proportions and produce realistic-fish illustrations. **Never use them in the character description**:

- `slim`, `athletic`, `streamlined`, `elongated`, `elegant`, `sleek`
- `realistic`, `natural`, `accurate`
- `large bulky build`, `enormous`, `massive` (use `chubby`, `round`, `dumpling-shaped` instead)
- `flowing`, `dramatic` (when describing fins — use `fluffy`, `frilly`, `puffy` for fin shape)
- `posture`, `pose`, `swimming`, `darting`, `in motion` (the character is static)
- Any anatomy term that implies "real fish" — `dorsal fin spines`, `caudal peduncle`, `lateral line`, etc. Use plain words like `top fin`, `tail fin`, `side fins`.

### Required adjectives

Every character description must include **at least one** word from this list to lock chibi:

- `round`, `chubby`, `dumpling-shaped`, `puffy`, `pudgy`, `tiny`, `little`

Even for "big" or "ancient" characters, use `big chubby` or `large round`, never `bulky` or `massive` alone.

### Naturally-long species

If the species is naturally elongated (eel, shark, seahorse, ribbon fish), force shortness explicitly:

> `A small round chibi fish-person inspired by the eel, shortened to a stubby chibi sausage shape, NOT elongated...`

Let the model know the natural shape is being deliberately suppressed.

## Worked example — Nereia (the gold standard)

This is the prompt that, conceptually, produced Nereia. Use it as the gold standard for what a finalized prompt looks like:

```
A small round chibi fish-person inspired by the koi, with a deep midnight-blue and violet upper body, cream-peach belly and face, ornate gold swirling filigree across the head and top fin like a delicate crown, huge round glossy amber eyes, calm composed neutral expression with a small soft frown, illustrated visual novel character portrait, soft painterly digital illustration with subtle gradient shading, NOT cel-shaded, NOT comic book style, NOT pixel art, chibi super-deformed proportions with an oversized round head taking up about half the body, tiny short stubby body, baby-like proportions, huge round glossy eyes occupying about one third of the face with two bright specular highlights per eye, cute and lovable design suitable for a romance visual novel, the character fills approximately 80% of the frame, 3/4 view facing toward the right side of the frame with eyes angled slightly toward the viewer, fully fish anatomy with no human features whatsoever — no human face, no human limbs, no human hair, no human ears, no human nose, no human lips, only fish features (fins instead of arms, tail and caudal fin instead of legs, fish nose and mouth), centered composition with a small margin, on a solid pure white #FFFFFF background, completely flat white background with no gradient, no scenery, no ground shadow, no underwater scene, no caustic light, no painted water beyond the character body, no text, no logo, no border, no frame, no signature, horizontally bisected by a calm pale blue-white water line with a few tiny bubbles where it meets the body, the water line touches only the character's body and does not extend across the canvas, the lower half of the character is shown underwater with a soft cool blue tint, slightly softened edges, and reduced contrast as if seen through clear water, the upper half is sharp and crisply rendered above the surface, NOT a realistic fish, NOT a nature illustration, NOT in motion, calm static frontal-ish pose
```

Notice that everything after `, illustrated visual novel character portrait,` is byte-identical to the locked template. That is the requirement.

## Examples — translating personas into chibi descriptions

To anchor the wording register, here are six character briefs and how each `{CHARACTER_DESCRIPTION}` should be written. Use these as templates rather than past attempts.

| Persona | ❌ Wrong (past failure) | ✅ Right |
|---|---|---|
| Athletic young perch | "A slim athletic perch with spiny dorsal fin, striped pattern, excellent posture" | "A small round chibi fish-person inspired by the perch, with a chubby coral-orange body and grey-blue vertical stripes, a small puffy top fin, alert focused expression, huge round glossy golden eyes" |
| Ancient wise carp | "An ancient patient carp with a round massive build, long flowing fins" | "A big chubby chibi fish-person inspired by the koi-carp, with an olive-green and amber-gold round body, heavy painted scale patterns, droopy whisker-like barbels, wise gentle smile, huge round glossy dark amber eyes" |
| Enormous gentle catfish | "An enormous gentle catfish with a large bulky build, long barbels" | "A round dumpling-shaped chibi fish-person inspired by the catfish, with a teal-and-brown chubby body, four soft little whisker-like barbels around the mouth, kind sleepy expression, huge round glossy amber eyes" |
| Tiny energetic gudgeon | "A very small slim gudgeon with large fins for its body size, enthusiastic posture" | "A tiny round chibi fish-person inspired by the gudgeon, with a bright orange chubby body and a white belly, two short barbels, excited eager expression with a tiny open smile, huge round glossy orange eyes" |
| Mysterious deep-water fish | "An elegant elongated mysterious fish with flowing translucent fins, ethereal quality" | "A small round chibi fish-person inspired by deep-sea fish, with a midnight-blue chubby body, glowing cyan-blue bioluminescent spots, soft puffy fins, mysterious gentle expression, huge round glossy pale-blue eyes" |
| Regal betta fighter | "A dramatic flowing betta with elaborate fins, proud regal bearing" | "A small round chibi fish-person inspired by the betta, with a deep crimson chubby body, frilly puffy fins in indigo and red, proud lifted-chin expression, huge round glossy amber eyes" |

Read the right column carefully. Notice the words: `chibi`, `chubby`, `round`, `dumpling-shaped`, `tiny`, `puffy`, `frilly`. Notice what is absent: `slim`, `athletic`, `elegant`, `flowing`, `bulky`, `posture`. **This is the register you write in.**

## Hard rules — never break these

These exist because past generations broke them. Each rule corrects a real failure mode.

1. **Chibi proportions, always.** If the output looks like a real fish from a nature documentary, the description was wrong (too biological) or the locked tail was paraphrased.
2. **White background, not underwater scene.** The `sprites` skill requires a flat white background for `remove_image_background` to work.
3. **Water line touches the body only.** Past failures: a horizontal "water band" stretching across the canvas, leaving blue smears that survive background removal.
4. **Fish anatomy only.** No human faces, hair, ears, lips, hands.
5. **Soft painterly, not cel-shaded.** The negations `NOT cel-shaded, NOT comic book style, NOT pixel art` are doing real work.
6. **Static, frontal-ish pose.** Past failures: dynamic S-curve poses with the body twisted in mid-swim.
7. **Frame fill ~80%.** Past failures: tiny character in a mostly-empty canvas.

## Pipeline

1. **Step 0 (above)** — view `sprites/nereia_neutral.png` and run `understand_image` on it with the description prompt.
2. **Build prompts** — for each character, write the `{CHARACTER_DESCRIPTION}` following the rules above, then concatenate the locked template tail.
3. **Run the pre-flight checklist** (below) on each prompt before sending.
4. **Generate** — call `generate_image_bulk`. Generate **2–4 candidates per character**.
5. **Run the post-flight visual comparison** (below) using `understand_image` with Nereia as the first attachment.
6. **Pick the best candidate, re-roll the rest** — only proceed to processing if at least one candidate clearly matches Nereia. If none do, regenerate with stronger chibi wording.
7. **Background removal, crop, copy, premultiply alpha** — exactly as in the `sprites` skill.

## ⚠️ Pre-flight checklist — run this on every prompt before calling `generate_image_bulk`

Before sending any prompt, **read your prompt back** and verify each of these substrings is present, character-for-character:

In the character description part:
- [ ] `chibi`
- [ ] `fish-person`
- [ ] `inspired by the` (or `inspired by deep-sea fish`, etc.)
- [ ] At least one of: `round`, `chubby`, `dumpling-shaped`, `puffy`, `pudgy`, `tiny`, `little`
- [ ] `huge round glossy` (eyes)
- [ ] None of the banned words: `slim`, `athletic`, `streamlined`, `elongated`, `elegant`, `sleek`, `flowing`, `dramatic`, `posture`, `swimming`, `darting`, `in motion`, `realistic`, `natural`, `bulky`, `massive`, `enormous`

In the locked tail:
- [ ] `chibi super-deformed proportions with an oversized round head`
- [ ] `huge round glossy eyes occupying about one third of the face`
- [ ] `the character fills approximately 80% of the frame`
- [ ] `3/4 view facing toward the right side of the frame`
- [ ] `solid pure white #FFFFFF background`
- [ ] `no underwater scene, no caustic light, no painted water beyond the character body`
- [ ] `the water line touches only the character's body and does not extend across the canvas`
- [ ] `NOT a realistic fish, NOT a nature illustration, NOT in motion, calm static frontal-ish pose`

**If any required substring is missing, or any banned word is present, your prompt is wrong.** Fix it before generating.

## ⚠️ Post-flight visual comparison — required after every batch

After `generate_image_bulk` returns candidates, you **must** call `understand_image` to compare them against Nereia. **The reference image must be in the attachments**, listed first. Without it, the analysis is meaningless — the model cannot compare to a reference it cannot see.

Past failure: an agent called `understand_image` with three candidate images and a prompt asking "which best matches Nereia?" — but Nereia was not in the attachments. The model fabricated a ranking based on guessed criteria. The result was useless. **Do not repeat this failure.**

### Required call shape

```
understand_image:
  attachments:
    [0] sprites/nereia_neutral.png        ← REFERENCE, MUST BE FIRST AND PRESENT
    [1] generatedImages/<candidate_1>.png
    [2] generatedImages/<candidate_2>.png
    [3] generatedImages/<candidate_3>.png
    ...
  prompt: <use the locked comparison prompt below>
```

### Locked comparison prompt — copy literally

```
Image 1 is the reference character "Nereia" for a chibi visual novel cast. Images 2 and onward are candidate generations meant to belong to the same cast. For each candidate, compare it to Image 1 specifically on these properties:

(a) Head-to-body ratio — Image 1's head is roughly half the body. Pass/fail.
(b) Eye size relative to face — Image 1's eyes occupy about a third of the face, with two bright highlights each. Pass/fail.
(c) Eye style — round, glossy, anime-ish, multiple highlights (vs small realistic fish eye). Pass/fail.
(d) Rendering style — soft painterly with subtle gradient shading (vs cel-shaded, comic-book inked, photorealistic, pixel art). Pass/fail.
(e) Frame fill — character occupies ~80% of canvas (vs small character in a mostly empty frame). Pass/fail.
(f) Water line — pale blue-white, touching only the character body, with a few bubbles (vs missing, vs full underwater scene, vs water band stretching across the whole canvas). Pass/fail.
(g) Pose — static and frontal-ish (vs dynamic S-curve, mid-swim, side profile). Pass/fail.
(h) Anatomy — purely fish, no human features. Pass/fail.

For each candidate, list the pass/fail outcome on each property, then give an overall verdict: ACCEPT (matches the cast), REJECT (does not match), or BORDERLINE.

Reject any candidate that fails on (a), (b), or (d) — these are non-negotiable. Among the candidates marked ACCEPT, rank from closest to Image 1 to furthest.

Be strict. The cast must look like one illustrator drew all of them on the same day.
```

### What to do with the result

- If at least one candidate is ACCEPT → pick the top-ranked one, proceed to processing.
- If all are REJECT or BORDERLINE → regenerate with stronger chibi wording in the description (more `tiny`, `chubby`, `dumpling`, `baby-like`). Do not silently ship a BORDERLINE.
- If the same property fails across 3+ regeneration attempts → escalate to the user; the species or color combination may be fighting the chibi constraints, and a brief from the user can break the deadlock.

## Per-character consistency (multiple sprites of the same character)

When generating a **second sprite of an existing character** (e.g., adding `nereia_happy.png` after `nereia_neutral.png`):

1. **View the existing sprite** with the `view` tool.
2. **Reuse the original `{CHARACTER_DESCRIPTION}` byte-for-byte**, only swapping the expression cue.
3. **Keep the locked template tail byte-identical.**
4. Generate **3–5 candidates** — matching is harder than designing.
5. For the post-flight comparison, attach **both** Nereia AND the existing sprite of this character as references (Nereia for cast consistency, the existing sprite for character consistency). Adapt the comparison prompt: *"Image 1 is Nereia (cast reference). Image 2 is the existing neutral sprite of this character (character reference). Images 3+ are candidates for the same character in a different expression. Reject candidates that drift from Image 2's body shape, color palette, or markings, OR that drift from Image 1's overall cast style."*
6. Maintain a `characters.md` file in the project recording each character's `{CHARACTER_DESCRIPTION}`. If it doesn't exist, create it.

## Optional extension — expression sets

When a full expression set is needed, append one of these cues to the `{CHARACTER_DESCRIPTION}` (replace any existing expression phrase):

- **neutral** — "calm composed expression with a small soft frown"
- **happy** — "warm cheerful expression with a soft smile, eyes brightened"
- **sad** — "downcast expression, mouth slightly turned down, eyes glistening"
- **surprised** — "wide-open eyes, large highlights, small round mouth"
- **angry** — "narrowed eyes, mouth set firm, fins tense"
- **blushing** — "soft warm flush across the face, eyes averted slightly, small shy smile"
- **shy** — "eyes glancing away, mouth tightly closed"

## ⚠️ Critical — when `generate_image_bulk` takes a `variations` array

The user's tool is invoked as JSON with a `variations` array, where each entry has its own `prompt` field, plus an optional `sharedSystemPrompt`. **The locked template tail MUST be present in every single entry's `prompt` field.** Do **not** factor it into `sharedSystemPrompt`. Past evidence: constraints placed in `sharedSystemPrompt` drifted heavily — the model treated them as soft suggestions while treating per-prompt text as hard requirements. The locked tail must be repeated in every prompt, even though it feels wasteful. The redundancy is the point.

The `sharedSystemPrompt` field, if used at all, should contain only project-level metadata (e.g., "These are character portraits for a visual novel"). It must **not** contain any of the visual constraints from the locked template.

## Common dérive patterns to actively resist

These are paraphrases the model is tempted to make. **Do not make them.** Each row is a real past failure.

| Tempting paraphrase | Why you must not |
|---|---|
| "slim athletic perch with spiny dorsal fin" | "Slim athletic" produces a real perch, not a chibi. Use "small round chibi fish-person inspired by the perch, with a chubby body and a small puffy top fin." |
| "elegant elongated mysterious fish with flowing translucent fins" | "Elegant elongated flowing" all push toward realistic. Use "small round chibi, chubby body, soft puffy fins." |
| "an enormous gentle catfish with a large bulky build" | "Enormous bulky" drops the chibi. Use "round dumpling-shaped chibi, chubby body." |
| "soft cel-shading with defined shadow areas" | Wrong style. The locked tail says soft painterly, NOT cel-shaded. |
| "deep blue-black underwater background with caustic light ripples" | Destroys white background, breaks `remove_image_background`. |
| "water line at approximately 65% from top of square frame" | Geometric phrasing — model ignores it. |
| "emerging from dark pond water" | Model interprets as full underwater scene. |
| Calling `understand_image` without Nereia in attachments | Comparison is meaningless without the reference visible to the model. Always attach `sprites/nereia_neutral.png` first. |
| Describing the comparison criteria in your own words | The locked comparison prompt above is calibrated. Paraphrasing loses the strict pass/fail structure. |
| Removing any of the "NOT X" negations | The negations are doing work — they suppress styles the model defaults to. |
| Moving the locked tail into `sharedSystemPrompt` | System prompt constraints drift more than per-prompt constraints. |
| Skipping Step 0 because "I already know what Nereia looks like" | Past evidence: agents who skipped Step 0 produced wildly inconsistent casts. The step exists because internal "I know" is unreliable. |

## Quick checklist before delivering a portrait

- [ ] Step 0 done (viewed Nereia + ran `understand_image` on it)
- [ ] Pre-flight substring check passed (required strings present, banned words absent)
- [ ] Generated 2–4 candidates
- [ ] Post-flight `understand_image` comparison done with Nereia as first attachment, using the locked comparison prompt
- [ ] At least one candidate marked ACCEPT (not BORDERLINE, not REJECT)
- [ ] Selected candidate is clearly chibi, 3/4 right-ish facing, white background, water line bisection limited to the body, soft painterly style
- [ ] Background removed, cropped, copied to project assets, premultiplyAlpha set to true
- [ ] `characters.md` updated with the prompt used (for future variants)