# Milestone 0 — Cleanup and Read-Only Sector Views

## Purpose

Prepare the existing SWN Sector prototype for the seeded, read-only MVP described in [mega_spec.md](mega_spec.md). Milestone 0 removes the editing interface, provides a tested way to realize every generated system, and gives GM and player views separate URLs. It does not yet make global realization the default generation path; Milestone 1 does that.

## Current starting point

- One static page at `/swn_sector/` generates a sector from the URL seed. The React application starts in GM mode, and its GM/player switch is disabled.
- The inspector and GM sidebar still expose editing, visibility, ship movement, and deletion controls. The app keeps these changes only in memory.
- Sector generation already creates the mechanical systems, routes, worlds, politics, and starting-world visibility. It generates culture for inhabited worlds in the starting, neighboring, and related polity systems; other inhabited worlds retain `Culture: null`.
- Existing GM and player presentation rules already use each entity's four scan visibility flags. The shared display model may contain GM facts in either mode; this milestone concerns what the interface displays, not access control.

## 1. Remove the editing interface

Remove or disable all UI paths that change an existing sector: the GM lock and edit bar, editable names and intelligence/GM-note fields, visibility buttons, move-ship control, and delete control. The inspector, GM notes, culture screen, maps, and overlays remain readable where their current view rules allow them. A navigation action labeled as travel may remain if it only opens another system and does not move the player ship.

Remove UI draft and lock state that becomes unused. Application-layer edit commands may remain as internal code; Milestone 0 does not require deleting the canonical data fields or changing the sector schema. Whole-sector generation from a seed, including the GM reroll button, remains available in the GM view. Neither view offers a way to save campaign edits.

## 2. Implement and test global realization

Provide one explicit operation that takes a generated sector and completes every inhabited planet or inhabited moon whose culture is still absent. An uninhabited world has no culture work to perform. Reuse the existing per-world completion rules, generated culture records, dependent names, and habitable points of interest rather than defining a second culture model.

The operation must:

- Process worlds in a stable order and produce the same result for the same input sector and seed.
- Leave an already completed world intact; applying global realization again must not reroll or change the sector.
- Preserve stable entity IDs, the starting world and ship location, politics and routes, and all visibility flags. Completion alone reveals nothing to players.
- Return a complete, valid sector or fail without exposing a partially completed result.
- Project successfully into the existing GM and player displays. The GM culture screen should show generated culture for every inhabited world when given a globally realized sector.

Keep this operation separate from ordinary sector generation in Milestone 0. The existing starting-area completion behavior can remain the default until Milestone 1 invokes global realization during generation.

## 3. Create GM and player sector URLs

Expose two directly loadable static pages, `/swn_sector/gm/` and `/swn_sector/player/`, using the same sector UI and `?seed=` URL convention. Retire `/swn_sector/` and link both new pages from the top-level index. Both URLs must load correctly after a production Vite build, including a direct visit or reload. The selected role comes from the entry URL; remove the disabled preview switch.

- **GM URL:** show the complete generated sector, including systems outside player visibility and the GM-only culture and inspector information. Keep whole-sector reroll and seed display.
- **Player URL:** use the existing visibility rules for sector map, routes, system views, object selection, names, and inspector fields. Do not show the GM culture screen, GM-only inspector tab, or GM generation controls. A hidden object cannot be selected through normal UI navigation.
- For a given seed and build, both URLs refer to the same generated sector. Merely opening either URL does not modify the sector or its visibility.

These are view URLs in the existing static site. Authentication, authorization, and payload isolation are outside this milestone.

## Acceptance checks

Ask the human user.
