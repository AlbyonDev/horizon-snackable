# Hooked on a Feeling — Game Design Summary (Implementation Reference)

## Overview
Hooked on a Feeling is a cozy mobile visual novel disguised as a fishing game. The player manipulates a fishing float in a pond, attracting fish characters who approach, talk, and form bonds. The player never speaks — they communicate through fishing actions (Twitch, Wait, Reel, Loosen, Tug).

## Technical Parameters
- **Platform:** Mobile, portrait format (480×800 canvas)
- **Engine:** Meta Horizon Engine (DrawingSurface 2D)
- **Session target:** 3–7 minutes per Cast
- **Save model:** AUTO_ONLY — saves after every Beat resolution
- **Cast size:** 6 fish characters (3 primary, 2 secondary, 1 hidden)

## Core Loop — The Cast
A Cast is one play session: fish approaches → dialogue exchange → fish departs.

### Phase 1 — Approach (~30s)
- Player equips a Lure before casting
- Lure determines which fish appears and their initial Drift state
- Fish approaches the float; name and affection tier shown in HUD

### Phase 2 — Exchange (3–5 min)
- 2–4 Beats per Cast
- Each Beat: fish speaks (1–3 bubbles) → Action Menu appears → player selects action → fish reacts
- Affection micro-delta applied after each action

### Phase 3 — Departure (~30s)
- Fish leaves; departure state becomes DRIFT flag for next Cast

## Action Menu (5 actions)
| Action | Fishing Meaning | Emotional Intent |
|--------|----------------|------------------|
| Twitch | Small jerk of line | Get Noticed / Flirt |
| Wait | Hold perfectly still | Be Patient / Listen |
| Slight Reel | Gentle tension | Invite Closer |
| Loosen Line | Slack in line | Give Space / Relax |
| Firm Tug | Strong pull | Assert / Challenge |

## Drift States (6 departure states)
- DRIFT_WARM — fish arrives open next time
- DRIFT_TROUBLED — fish arrives distracted
- DRIFT_WARY — first action must be Wait or Loosen
- DRIFT_CHARMED — fish arrives early, skips one Beat
- DRIFT_SCARED — fish doesn't appear next Cast (1 Cast cooldown)
- DRIFT_ANGRY — affection drops one sub-tier

## Affection System (5 tiers, TIER_ONLY visibility)
| Tier | Name | Threshold | Catch? |
|------|------|-----------|--------|
| 1 | Unaware | 0–14 | No |
| 2 | Curious | 15–34 | No |
| 3 | Familiar | 35–59 | No |
| 4 | Trusting | 60–84 | No |
| 5 | Bonded | 85–100 | Yes |

## Fish Roster (Milestone 1: Nereia only)
### Nereia — Koi
- Ancient, slightly imperious, secretly lonely
- Accent: purple/gold
- Voice: Long sentences, formal, no contractions in early tiers
- Lure affinity: Gold Teardrop, Shell Hook
- Drift default: CAUTIOUS

## Visual Style
- "Nocturnal Pond Illustration — Mobile Otome Premium"
- Dark dominant palette with warm lantern and cool moonlight
- Fish are chibi aquatic illustrations with large expressive eyes
- Emotions conveyed through eyes, fins, body posture (no human features)

## Canvas Layout (480×800)
- Background: Full-screen pond illustration
- Fish Portrait: Center, 35–65% vertical
- Float: Center, ~58% vertical (code-drawn, sine animation)
- Fishing Line: Top-right to float (code-drawn, tension curve)
- Dialogue Box: Left-center, semi-transparent dark card
- Action Menu: Bottom 28–52% of screen, full-width tap targets
- HUD Top-Left: Fish thumbnail + name + tier + mood icon

## Systems (Milestone 1)
- SYS-03-FLAGS: Centralized flag store with namespace prefixes
- SYS-10-SAVE: AUTO_ONLY, saves after every Beat resolution
- SYS-02-CHOICE: Action Menu with 5 actions + Effect schema
- SYS-09-SKIP: Per-Beat seen-tracking
- SYS-11-PACING: 80 char max, 1 line per bubble, 2–4 Beats per Cast
