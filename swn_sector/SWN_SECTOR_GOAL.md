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

## Implementation references

The canonical sector workspace is this `swn_sector/` directory.

- [Sector_Creation_Flow_V2.md](Sector_Creation_Flow_V2.md) records the constraint-aware world-generation rules.
- [Sector_Creation_Flow_V3.md](Sector_Creation_Flow_V3.md) records the star and physical-world extensions.
- [Sector_Creation_Flow_V4.md](Sector_Creation_Flow_V4.md) records orbital locations, points of interest, and the visualizer's data contract.
- `world_tag_constraints.json` is the machine-readable source for world-tag restrictions and ALIEN-state requirements.
- `src/generators/swn_sector/sector_v2.ts` implements constraint-aware world generation in the order Tag 1, Tag 2, atmosphere, temperature, biosphere, population, then tech level. Worlds default to `hasAliens: false`; `{ hasAliens: true }` enables ALIEN-dependent entries.
- `src/test/swn_sector_v2_constraints.test.ts` checks that every eligible first tag has a compatible second tag and a valid completion.
