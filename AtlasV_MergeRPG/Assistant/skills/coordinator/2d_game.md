---
name: 2d_game
summary: Creating a 2D game within the Meta Horizon Engine
include: always
agents: [global]
---

The user wants to create or remix a 2d game inside the Meta Horizon Engine.  2D games inside the Meta Horizon Engine are created exclusively by the scripting agent.  The scripting agent will have skills that tell it how to create 2D games using the drawing surface (including creating 2d sprites) for graphics and FocusedInteractionService for touch controls.

CRITICAL: For 2d games, sprites are creating by the scripting agent, NOT the mesh_gen agent.  If you need to generate sprites, ask the scripting agent to do it.

## MANDATORY: Welcome and Confirm Game Concept (New Games Only)

When a user asks to create a **new** 2D game (not a port or modification of an existing one), the orchestrator MUST do the following **before delegating to the scripting agent**:

1. **Welcome the user** to the beta MHE 2D game creation flow. Let them know this is a beta experience and that any feedback — no matter how big or small — is welcome.

2. **Summarize your understanding** of the game they want to build. Based on their prompt, present a concise description covering:
   - **Visual theme** — Art style, color palette, mood (e.g., "retro pixel art with a dark dungeon theme" or "bright, cartoon-style underwater world")
   - **Control style** — How the player will interact (e.g., "tap left/right to move", "drag to aim and release to shoot", "swipe to change direction")
   - **Major game mechanics** — Core gameplay loop, scoring, enemies, obstacles, power-ups, progression (e.g., "dodge falling obstacles, collect coins for points, speed increases over time")
   - **Content** — What screens and features the game will include (e.g., "title screen with start button, main gameplay, score HUD, game over screen with restart")

3. **Ask the user to confirm or suggest changes** before proceeding. The user may want to adjust the theme, change the controls, add or remove features, etc. Iterate on the concept until the user is happy, then delegate to the scripting agent.

**Example welcome:**

> Welcome to the beta MHE 2D game creation flow! Any feedback you have — no matter how big or small — is welcome as we continue to improve this experience.
>
> Based on your description, here's what I'm planning to build:
>
> **Visual theme:** Retro pixel-art space shooter with a dark starfield background and neon-colored enemies.
>
> **Controls:** Touch and drag to move the ship. The ship auto-fires upward continuously.
>
> **Game mechanics:** Waves of enemies descend from the top. Destroying enemies earns points. Getting hit loses a life (3 lives total). Every 5 waves, enemy speed and density increase. Occasional power-up drops (shield, rapid fire, spread shot).
>
> **Content:** Title screen with "START" button, main gameplay with score and lives HUD, game over screen showing final score with restart button.
>
> Does this sound right, or would you like to change anything before I start building?

Once the user confirms, delegate to the scripting agent with the confirmed game description.
