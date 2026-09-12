Hi. We are going to try to recreate the structured sector creation section from pages 133-175 (pdf pages, not page numbers) of the Stars without number manual at temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf

We will proceed in the following general phases, under human supervision quality gates between each step. 

1. Overview and data gathering - review and come up with a more detailed plan
2. Extraction - extract the relevant tables and information from the PDF
3. Flowcharting - come up and review the with the precise flow 
4. Table Review - Ensure the tables are well structured
5. Initial Work and Testing - Implement the sector creation process and test it
6. Cleaning - Identify impossible or contradictory sector-generation states and explicitly forbid them
7. Fine Tuning of any issues in the table creation
8. UI Design 
9. Frontend Implementation - Design the user interface and implement it

## Current V2 handoff

The canonical sector workspace is now this `swn_sector/` directory. V2 is the current working implementation of the phase 5–6 generation/cleaning work.

- [Sector_Creation_Flow_V2.md](Sector_Creation_Flow_V2.md) is the current flow specification.
- `world_attributes.json` stores per-result `hab` metadata. Calculated environmental Hab is the minimum of atmosphere, temperature, and biosphere. It must be at least both Population Hab and Tech Level Hab.
- `world_tag_constraints.json` is the machine-readable source for the accepted world-tag restrictions and ALIEN-state requirements.
- `src/generators/swn_sector/sector_v2.ts` performs constraint-aware generation in the established order: Tag 1, Tag 2, atmosphere, temperature, biosphere, population, then tech level.
- `src/test/swn_sector_v2_constraints.test.ts` verifies that every eligible first tag has a compatible second tag and a complete valid continuation. `src/test/swn_sector_v2.test.ts` writes the deterministic V2 artifact to `/tmp/randomroll-swn-sector-v2.json`.
- Worlds default to `hasAliens: false`; this excludes ALIEN-dependent tags and Population roll 12. The generator accepts `{ hasAliens: true }` to enable them.
