# SWN Sector Habitability Data Cleanup

## Goal

Give each habitability rating one source of truth while preserving generated sectors, validation results, and projected ratings for the same inputs. Keep this cleanup limited to ratings; `habRequired` is a separate prerequisite rule and retains its current values and behavior.

## Current duplication

| Rating | Raw source | Maintained TypeScript copy | Current production use of raw `hab` |
| --- | --- | --- | --- |
| Star type | `Data/Raw/Details/star_types.json` | `Shared/planet_interpretation.ts` (`STAR_HABITABILITY`) | Copied to `STAR_TABLE.Hab`; otherwise unused. |
| Temperature | `Data/Raw/Details/world_attributes.json` | `Shared/planet_interpretation.ts` (`TEMPERATURE_HAB`) | Copied to roll rows; otherwise unused. |
| Terran biosphere | `Data/Raw/Details/world_attributes.json` | `Shared/planet_interpretation.ts` (`TERRAN_BIOSPHERE_HAB`) | Copied to roll rows; otherwise unused. |
| Size | `Data/Raw/Details/world_attributes.json` | `Shared/planet_interpretation.ts` (`SIZE_HAB`) | `SIZE_TABLE.Hab` excludes zero-rated sizes from inhabited-planet rolls. |
| Bulk composition | `Data/Raw/Details/world_attributes.json` | `Shared/planet_interpretation.ts` (`BULK_COMPOSITION_HAB`) | Copied to roll rows; otherwise unused. JSON currently lacks the two gas compositions, which exist only in TypeScript. |

`Generator/generation_rules.ts` merges detail records into weighted roll rows and preserves `hab` as `Hab`. Generation, `planetHabitability`, generated-sector validation, and planet projection otherwise read the TypeScript maps. Existing tests compare the star and size copies, but do not make either copy authoritative.

## Change

1. Treat the raw detail JSON files as authoritative for all five ratings. Add `Jovian Gas` and `Neptunian Gas` with `hab: 0` to the bulk-composition details; do not add them to the inhabited-world d100 roll table.
2. Derive typed, read-only `STAR_HABITABILITY`, `TEMPERATURE_HAB`, `TERRAN_BIOSPHERE_HAB`, `SIZE_HAB`, and `BULK_COMPOSITION_HAB` from those detail records in the shared interpretation layer. Preserve their current names and consumers. Ensure every canonical enum value has a numeric rating and fail clearly if data is missing; a TypeScript cast alone is insufficient validation.
3. Make the inhabited-size eligibility filter use `SIZE_HAB[row.Value]` rather than `row.Hab`. Stop copying `hab` into weighted roll-row `Hab` once the star and size parity tests are replaced; no production consumer needs that row field afterward. Keep d100 weights and outcomes in `Data/Raw/Tables/`; keep `habRequired` lookups in `Generator/data_tables.ts`.
4. Keep Generator, Projector, and validation dependent on shared interpretation, without introducing a Generator-to-Projector dependency. Do not move derived ratings into the canonical Base DTO.