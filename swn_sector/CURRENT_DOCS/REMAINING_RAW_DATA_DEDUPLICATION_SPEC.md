# SWN Sector: Remaining Raw Data Duplication Cleanup

## Goal

Remove the six remaining rule and lookup overlaps found between `Data/Raw` JSON and TypeScript. Keep one authoritative value for each rule. Preserve the current generated Base DTOs, projected values, and validation results for the same inputs unless a behavior change is explicitly reviewed.

The six items below group the two unused probability tables together. Roll-table results and their separate detail records are intentional joins, not duplicates to remove.

## 1. Use the two existing probability tables

`Data/Raw/Tables/world_attributes.json` defines `surface_water_present` as 25% No / 75% Yes and `gas_giant_moon` as 10% Yes / 90% No. Generation instead uses `SURFACE_WATER_PRESENT_MINIMUM_ROLL = 0.25` in `Generator/generate_inhabited_planet.ts` and `GAS_GIANT_MOON_MAX_ROLL = 10` in `Generator/generate_system.ts`.

Adapt the JSON rows into named weighted choices and use them at the two roll sites. Remove the constants. Preserve the existing random stream paths, one draw per decision, and forced-water precedence. Verify that fixed seeds produce the same results; both current comparisons place the lower range first, so the weighted adapter must retain row order.

## 2. Derive atmosphere gas lists from gas details

The `flammableGas`, `corrosiveGas`, `poison`, and `inertGas` lists in the atmosphere entry of `Data/Raw/Tables/world_attributes.json` repeat the `category` of each gas in `Data/Raw/Details/atmosphere.json`. Both generation and `Shared/atmosphere_interpretation.ts` consume those lists.

Use the gas details as the source of truth for category membership and derive the selectable lists in their current order. Keep `breathableBackgroundGas` as an explicit weighted roll rule: its weights are independent data, even though its gas IDs currently match the inert list. Validate that every selected gas ID exists and that all derived lists and fixed-seed atmosphere outcomes match the baseline before removing the duplicated category lists.

## 3. Derive gas-template composition from planet values

`Data/Raw/Details/planet_values.json` maps Neptune and Jupiter sizes to `Neptunian Gas` and `Jovian Gas`. `Generator/planet_templates.ts` repeats those size-to-composition pairings in the Neptunian and Jovian template facts.

Use the JSON `gasComposition` for the two template compositions. Keep each template's size and its other distinct facts in the template definition. Reject a missing gas composition rather than generating an undefined value. The existing invariant and both template outputs must continue to agree.

## 4. Consolidate world-tag constraints

`Data/Raw/Details/world_tags.json` already supplies constraints through `Generator/generation_constraints.ts`, but `Generator/generate_inhabited_planet.ts` repeats some of them in special checks and tag-pair feasibility filtering. Tomb World's environmental and population caps, Outpost World's population cap, and the technology floors for Heavy Industry, Major Spaceyard, and Post-Scarcity are examples. Some hardcoded checks are weaker than the corresponding JSON constraint; the generic JSON check currently supplies the stronger rule.

Read the existing JSON constraints in both early feasibility checks and final profile checks. Remove special checks that the generic constraint path fully covers. Retain genuinely separate behavior, such as forced water, Abandoned Colony's population rule, and Tomb World's generation-specific technology selection, unless it is deliberately represented in data. Compare forced-tag and fixed-seed outcomes before changing any numeric threshold or validator rule.

## 5. Use one temperature ordering

`Data/Raw/Details/world_attributes.json` has `temperature.orbitalOrder`; `Shared/spatial_interpretation.ts` separately maintains `TEMPERATURE_RANK` and `NORMAL_TEMPERATURES_HOT_TO_COLD`. The JSON sequence is one-based with values 2–16, while the TypeScript rank uses 1–15. The JSON field is currently unused.

Derive the ordered temperature names from `orbitalOrder` and use that sequence for direct-orbit enumeration and the reversed normal-temperature AU bands. Remove the maintained TypeScript order and rank map if no numeric-rank consumer remains. Preserve the current handling of Cryogenic and Furance as extreme bands and verify every star/temperature AU interval and its fixed-seed placements.

## 6. Make POI host rules executable data

`Data/Raw/Details/points_of_interest.json` records `otherPoints[*].locationType`, while `Shared/poi_host_interpretation.ts` owns a separate host-compatibility switch. The JSON uses descriptions such as “Any NonPrimary Planet,” but the switch currently allows any planet for those POIs. Treat this as a behavior discrepancy, not an interchangeable label.

Record structured host predicates in the POI details and make `isPoiHostCompatible` interpret them. Keep the existing predicate behavior as the migration baseline; update or clarify the descriptive `locationType` strings where they disagree. Cover every POI type and representative compatible and incompatible hosts, including primary planets, gas planets, belts, gas clouds, and independent stations. Keep generation and generated-sector validation on the same predicate.

## Acceptance checks

1. Each item has one maintained source for its rule values or membership; no parallel constants, arrays, or switches remain for the migrated data.
2. Compare representative fixed-seed Base DTOs and projections with a pre-change baseline. Check atmosphere choices, water state, moon placement, temperature bands, and POI hosts directly.
3. Run `npx tsc --noEmit` and `npx vitest run src/generators/swn_sector`; report any intentional behavior difference separately before accepting it.

Out of scope: descriptive star `orbitalZones`, the unused `world_relationship.json` table, and mere repetition of lookup keys between roll tables and detail records. Those need separate decisions about whether they are active data.
