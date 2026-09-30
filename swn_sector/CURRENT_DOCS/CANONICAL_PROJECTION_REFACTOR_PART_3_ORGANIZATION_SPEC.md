> Historical implementation record: the paths in this document describe the architecture at the time of that migration. The later architecture cleanup renamed those active owners to `Application/` and `Shared/`, moved generated-sector checks under `Generator/`, and removed `Validation/`.

# SWN Sector: Project Organization

## Status and scope

This is sub-spec 3 of the [canonical projection refactor roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md). The structural migration is implemented. It organizes the existing planet and spatial projection slices by architectural category. It does not complete the politics, disclosure, or whole-application read-boundary work scheduled for sub-specs 4–6. A later [portrait index slice](CANONICAL_PROJECTION_PORTRAIT_INDEX_SPEC.md) changes the canonical portrait field within this structure.

The category root is `src/generators/swn_sector/`. Directory names make ownership visible:

```text
BaseDTO/                 canonical sector and culture contracts
Data/Raw/                generation inputs and constraints
Data/Projection/         deterministic presentation mappings and portrait catalog
Generator/              random selection and generation actions
Helpers/Domain/          deterministic rules shared by generation and projection
Projector/              derived read-model construction
DisplayDTO/             named display contracts
UI/                     views, interaction, and view state
Validation/             canonical-sector invariants
Composition/            in-memory application and initial-sector setup
portrait_review/         standalone asset-review tool
```

## File inventory and placement

| Category | Files or subtree | Reason |
| --- | --- | --- |
| BaseDTO | `merged_schema.ts`, `culture.ts` | Canonical contracts; culture types no longer depend on a generator implementation. |
| Data/Raw | `star_types.json`, `world_attributes_2.json`, `world_tag_constraints.json`, `world_tags.json`, `system_points_of_interest.json`, `generation_constraints.ts`, `polity_flag_colors.ts`, `tables.ts` | Generation source data and constraints. |
| Data/Projection | `star_presentation.ts`, `planet_presentation.ts`, `portrait_assets.ts`, `portrait_variants.json` | Deterministic mappings and asset resolution data. Public portrait source URLs remain unchanged. |
| Generator | `generate*.ts`, `generation_*.ts`, `culture.ts`, `politics.ts`, `planet_templates.ts`, `portrait_selection.ts`, and their colocated tests | Random selection, working generation records, and actions that update canonical state. |
| Helpers/Domain | `composition_interpretation.ts`, `planet_interpretation.ts`, `politics_interpretation.ts`, `poi_host_interpretation.ts`, `portrait_index.ts`, `spatial_interpretation.ts` | Shared deterministic rules; no Display DTO or UI imports. |
| Projector | `*_projection.ts`, `planet_presentation.ts`, `star_presentation.ts`, `culture_projection.ts`, and their colocated tests | Derivation and presentation logic. |
| DisplayDTO | `dto.ts` | Named planet, star, system-spatial, object-spatial, route, and portrait read-model types. |
| Validation | `invariants.ts` and its colocated test | Sector contract validation. |
| Composition | `prototypeApplication.ts`, `initialSectors.ts`, and the application test | In-memory commands and initial generation. |
| UI | `App.tsx`, `main.tsx`, `data.ts`, styles, formatters, `application/appState.ts`, `domain/`, `features/`, and colocated tests | View composition, interaction, rendering, and temporary legacy read helpers. |
| Supporting tool | `portrait_review/` | Separate portrait-review entry point, manifests, queue, catalog, styling, and tests. |

Tests follow the production module they cover. The mixed `culture.test.ts` remains beside the generator action and imports the projector it also exercises. Static art and public URLs stay under `public/swn_sector/`.

## Module splits and dependency direction

- `tables.ts` and `generation_rules.ts` no longer re-export shared interpretation functions. Callers import the rule from `Helpers/Domain/`.
- Portrait index selection is in `Generator/portrait_selection.ts`; deterministic asset lookup and category mappings are in `Data/Projection/portrait_assets.ts`.
- Planet and star presentation mappings are in `Data/Projection/`; presentation calculations are in `Projector/`. The cold-water composition rule used by both generation and projection is in `Helpers/Domain/`.
- HPOI and culture display calculations moved from the generation action to `Projector/culture_projection.ts`. Polity capability interpretation moved to `Helpers/Domain/`; flag colors and POI constraints moved to `Data/Raw/`.
- The canonical culture type moved from `swn_culture_impl.ts` to `BaseDTO/culture.ts`, removing a Base DTO type dependency on a generator implementation.
- The existing named Display DTO types moved out of projector modules into `DisplayDTO/dto.ts`.

No generated fields, version, random draw sequence, or display strings were intentionally changed.

## Known legacy dependencies for later sub-specs

The structural migration leaves existing application behavior in place. Sub-spec 4 owns the politics and culture projection cutover, unified disclosure is now deferred in [Part 5](DEFERRED_PART_5_DISCLOSURE_NAMES_ASSETS.md), and sub-spec 6 owns the shared Display Sector DTO boundary. In particular:

- `UI/features/culture/CultureScreen.tsx` still invokes the world-completion generator action and reads world-tag definitions from `Generator/generation_rules.ts`. Sub-spec 4 should route the action through the application boundary and project tag descriptions.
- `UI/domain/sector/validation.ts` still reads the raw polity flag-color set. Sub-spec 4 should place that check behind the domain validation boundary as politics moves to projection.
- UI components and UI domain helpers still read canonical `Sector` for uncovered data. The full read cutover remains sub-spec 6.
- `Generator/generation_rules.ts` still adapts the mixed world-tag source data for both generation and descriptions. Sub-spec 4 should separate those data roles when it specifies the world-tag projection contract.

These are existing boundaries retained to avoid changing behavior during a file-location migration; they are not a model for new code.

## Acceptance evidence

- `npx tsc --noEmit` passes.
- `npx vitest run src/generators/swn_sector src/generators/swn_culture` passes (28 files, 128 tests).
- `npx vite build` passes, including the SWN sector entry point.
- The moved raw JSON and portrait-variant data remain byte-for-byte the same; public portrait URLs retain their existing strings.
