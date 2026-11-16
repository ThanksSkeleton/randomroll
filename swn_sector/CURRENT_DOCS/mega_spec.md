# SWN Sector Milestone Summary

This is the current high-level milestone proposal for the SWN Sector tool. Detailed requirements and decisions belong in milestone-specific specs. Previous plans and specifications are retained in [`ARCHIVE/`](../ARCHIVE/) as design history.

## Milestone 0 — Cleanup

- Remove or neutralize the remaining editing controls in the app.
- Implement and test global realization so every system can be fully generated.
- Create separate player and GM sector view endpoints using the existing visibility rules.

## Milestone 1 — MVP: Seeded sector and external Obsidian lore

- Realize every system during sector generation. Keep the app free of a persistent campaign layer.
- Provide player endpoints for choosing a manually created character's homeworld (P1a) and for choosing a premade character (P1b). The starting world and inhabited worlds one jump away can be PC homeworlds. The app does not display inhabited-world images or lore at this milestone.
- Provide the player hard-data sector and system views (P2a/P3a). Player visibility uses the existing rules, with visible worlds and systems set in code; changing them requires a code change and deployment. With global realization, P2a and P3a are one viewing workflow.
- Support GM mass rolling and selection of starting sectors (GM1), sector study (GM2), hard-data inputs for candidate first adventures (GM3a), and collateral lists such as rolled names and tables (GM4).
- Provide a one-time, one-way transfer of sector data from Randomroll to Obsidian. Define an Obsidian note format for hard data, player-facing lore, and GM notes. Lore is edited and presented outside the app.

## Milestone 1.5 — Optional world imagery

- Build an offline image-generation pipeline for selected inhabited worlds: map additional world traits into a fixed prompt, then manually incorporate lore-specific details.
- Display the resulting world images in the player picker and sector map.

## Milestone 2 — Speculative Obsidian integration

- Use Obsidian to browse and edit GM notes and lore.
- Keep Randomroll as the player and GM hard-data display, and add player lore display sourced from Obsidian.
- Consider faction work here or in a later milestone.

## Milestone 3 and later — Undecided

- Reassess whether the app needs persistence or other campaign features.
