> Historical implementation record: the paths in this document describe the architecture at the time of that migration. The later architecture cleanup renamed those active owners to `Application/` and `Shared/`, moved generated-sector checks under `Generator/`, and removed `Validation/`.

# Part 6: Application Cutover and Canonical Audit — Implemented

This is sub-spec 6 of the [canonical projection refactor roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md). It starts from the implemented `merged-v7` in-memory sector and the projection slices from parts 1–4. Part 5 remains deferred. The shared display graph now feeds the archive, reducer, inspector, hex map, and both system views. UI commands update canonical state through `PrototypeApplication` and receive detached projected values. No Base DTO types are imported by production UI files. The field inventory and final source audit below close this cutover; no canonical fields or schema version required changes.

## Boundary and scope

`PrototypeApplication` owns `Sector[]`. Its public read methods return a single shared `DisplaySectorDTO` (or archive summaries of it), and its commands accept a sector index, entity IDs, and explicit edit values. A successful command returns a fresh projected read result. No UI state, component prop, or UI helper holds a `Sector`, `StarSystem`, `SelectableEntity`, or another Base DTO type. The UI may choose what to show in GM or player preview, including existing scan and visible-name behavior. The shared DTO may contain GM-only fields and is not a player-safe payload.

Keep the prototype synchronous and in memory. Projection must be pure: it must not call a generator, mutate its input, or select random values. An invalid canonical reference must produce a clear projection failure; do not silently manufacture a valid-looking entity. Commands must validate an index and target before committing, then project the committed state. A failed command leaves stored state unchanged. A display object is a detached read value, never a writable alias into canonical state.

## Display contract

Add named types under `DisplayDTO/` and assemble them in `Projector/sector_projection.ts`. Preserve source ordering of systems, objects, routes, POIs, and archive entries. The read model needs:

| Display area | Values needed by current UI |
| --- | --- |
| Sector | Display name, stable sector identity/index for archive commands, starting-world reference and presentation status, player-ship ID and current location, ordered systems and routes, lookup by selectable ID. Schema version and seed are not needed by the views. |
| Selectable entity | ID, kind and kind label, containing system ID, procedural and nice names, authored intelligence, scan flags, portrait, and previously projected stock/summary text. Copy the fields needed by the deferred preview and naming rules; do not claim redaction. |
| System and star | Hex location, ordered contained entities, star recipe, spatial bands and summaries, political claims, route endpoints. UI keeps pixel geometry and interaction layout. |
| World and other object | Kind-specific canonical facts needed for GM details, parent relationship, effective AU and temperature, planet ratings/colors, POI count, claims, culture and HPOI display, and existing stock text. |
| Route and portal | Ordered portal/system references, angles, endpoint hexes, names, route distance and descriptions. |
| Polity and history | Flag, homeworld, projected capabilities, claims and conquest history needed by overlays and culture view. |
| Ship | ID, current location and copied selectable presentation fields. |

Reuse existing `PlanetDisplayDTO`, `SystemSpatialDisplayDTO`, `ObjectSpatialDisplayDTO`, `RouteDisplayDTO`, `PolityDisplayDTO`, `CultureScreenDisplayDTO`, and POI projections as fields of the shared graph. A single sector projection should resolve references once and expose stable ID lookups so components do not repeatedly invoke projectors. The culture screen receives the culture field of the same sector display read, not a separately projected Base sector. It is acceptable for the DTO to copy canonical values where the UI needs them; its types and construction must live outside `BaseDTO` and the UI must not import Base types, including through `UI/data.ts`.

The archive should receive summaries projected by the application, with sector index, name, generation mode if shown, counts and preview information actually used. Do not send full canonical sectors to build archive cards. The app reducer stores display values and UI-only state (view, preview, selection IDs, edit draft, overlays). `preview` remains a presentation choice. Switching it must not regenerate or persist sector state.

## Command contract

Move canonical operations out of `UI/domain/sector/operations.ts` into an application-owned module. `PrototypeApplication` exposes commands for generation, loading/listing, renaming and deleting sectors, completing a world, changing scan visibility, moving the ship, deleting a selectable object, and applying explicit sector/name/intelligence edits. For the scan choice buttons, the UI can send a desired four-flag value; the command enforces the same scan dependencies as the current operation. Use IDs and explicit values; no command accepts an entire `Sector` or arbitrary object patch from UI.

Each command result distinguishes invalid index, missing ID, prohibited operation, invalid edit/visibility, and projection failure as applicable. Keep the current all-or-nothing edit-save behavior: validate the proposed canonical sector and project it before replacing the stored entry. The command returns the updated shared display read or archive list and valid active index. The UI then updates reducer state from that result. World completion stays idempotent and generates culture only inside its application command.

Move canonical selectors and save-time validation now under `Composition/` or `Validation/`, with no dependency on `UI/`. Put display selectors that operate only on `DisplaySectorDTO` under `UI/` or `DisplayDTO/`. `areAdjacentHexes` can remain a pure UI interaction helper. Remove the `Sector` re-export from `UI/data.ts` after consumers are converted.

## UI cutover checklist

| Current owner | Remaining direct Base read or write | Cutover |
| --- | --- | --- |
| `UI/App.tsx`, `UI/application/appState.ts` | Converted: reducer stores `DisplaySectorDTO[]`; navigation, culture and views read projected data; successful commands replace the affected display. | Keep preview changes synchronized by reprojecting stored canonical sectors. |
| `UI/features/sector-archive/SectorArchive.tsx` | Converted: receives archive display summaries; archive commands return summaries and updated display values. | Preserve archive index behavior across generate, load, rename and delete. |
| `UI/features/sector-editor/GMEditBar.tsx` | Converted: receives `DisplaySectorDTO` and dispatches ID/value commands. | Keep this boundary while the parent reducer is converted. |
| `UI/features/object-inspector/DetailBar.tsx` | Converted: reads selected display entity, stock text, claims and portrait from the shared DTO. | Keep deferred preview and scan choices in UI. |
| `UI/features/sector-map/HexMap.tsx` | Converted: traverses projected systems/routes and reads projected claims, star presentation and ship location. | Retain pixel layout and preview visibility choices in UI. |
| `UI/features/system-viewer/SymbolicSystem.tsx` | Converted: traverses the display graph for worlds, objects, POIs, routes, ratings, claims and ship markers. | Keep preview and layout choices in UI. |
| `UI/features/system-viewer/TopDown.tsx` | Converted: traverses display systems, entities, routes and POIs and uses projected spatial, planet, star and polity data. | Keep pixel layout and preview visibility decisions in the UI. |
| `UI/features/politics/PolityFlag.tsx` | Converted: accepts projected polity/flag values. | Preserve visual flag geometry. |
| `UI/domain/sector/{selectors,operations,validation,visibility}.ts`, `UI/data.ts` | Converted: canonical operations/selectors/validation live under `Composition/`, `Helpers/Domain/` and `Validation/`; obsolete UI modules and `UI/data.ts` were removed. Preview presentation uses only the shared display DTO. | Keep the UI/domain dependency direction intact. |

The existing GM/player scan filtering, visible-name choice and portrait presentation remain behavior-preserving UI decisions. Their presence does not imply a secure player boundary. `PolityFlag` may keep purely visual flag geometry, while flag meaning and capabilities come from projection.

## Canonical field audit

Audit against **other Base fields plus deterministic projection data**, not against replaying `OriginalSeed` through the generator. A value selected by random generation or later edited is independent even when a seeded generator can reproduce it. The following disposition covers the current `merged-v7` schema; verify each family again against actual consumers before removing a field.

| Base field family | Disposition and reason |
| --- | --- |
| `SchemaVersion` | Keep as canonical schema metadata; it identifies how to validate a sector and is not display content. Do not expose it just to satisfy a UI read. |
| `OriginalSeed`, `StartingWorldMode` | Keep as generation provenance. The seed is used for later world completion, but is not a complete replay contract. The mode records the generation request and need not be inferred from the chosen world. Explicitly exclude both from the deterministic reconstruction test. |
| `StartingWorldId` | Keep the selected generated world reference; eligibility does not identify which eligible world was chosen. |
| `SectorName`, entity `NiceName`, `ProceduralName`, `Intelligence`, `Visibility`, `PortraitIndex` | Keep under deferred part 5. Names and authored text can be edited; scan state is independent; portrait index records a random choice. Any possible default-name reconstruction needs the separately authorized names audit. |
| Entity `Id`, ordered collection membership, `PlayerShip.CurrentLocationId`, `HexLocation`, `StarType`, object kind/subtype, direct-orbit AU and angle, parent IDs, route portal membership/system/angle, political claim IDs | Keep identity, placement, topology, chosen type and campaign state. Previously removed derived temperature, inherited moon AU and portal owner ID must stay absent. |
| Planet size, composition, water, atmosphere, native biosphere and `InhabitedInfo` tags/biosphere/population/tech | Keep generated outcomes. Ratings, colors, displayed composition, temperature, total habitability and tidal lock remain projected. |
| `Planet.Culture` | Keep selected culture strings and unresolved completion (`null`); completion status and derived tag/prompt source values stay projected. |
| Polity homeworld, name and flag colors; conquest event IDs, participants, target and attack/defense/route-distance snapshots | Keep chosen polity facts and historical snapshots. Current capabilities and event outcome remain projected; snapshots must not be recomputed from current world state. |
| POI/HPOI host, type, assignment and angle | Keep generated topology, type, assignment and placement. Some angles are produced by a seeded helper, but cannot be reconstructed from other Base fields plus projection data without replaying generation. Effective HPOI presence, reason, content and stock text remain projected. |

`Validation/invariants.ts` has explicit allowed-key lists and rejects unknown serialized properties; application edits call this canonical validator before commit. The field-family review found no field proven reconstructable from other canonical fields and deterministic projection data, so no Base field or schema version changed. Still required before closing: capture the actual runtime key paths from generated and completed sectors and compare them with the allowlists and table. A schema bump is required only if that audit removes or changes a Base field. The present prototype has no persisted-sector boundary, so do not add external migration machinery without persistence.

Runtime enumeration was run with Vite's SSR loader so the generator's `?raw` CSV import uses its normal transform. It walked a generated sector (`part6-runtime-audit`) and the result of completing one previously incomplete inhabited world, then unioned keys by object path. The inventory below records the observed path/key union; optional and variant-specific keys appear together. `validateSector` reported zero issues for both samples, and the observed keys match the validator allowlists:

| Object path | Accepted keys |
| --- | --- |
| `Sector` | `SchemaVersion`, `OriginalSeed`, `StartingWorldMode`, `StartingWorldId`, `SectorName`, `Systems`, `Routes`, `RoutePortals`, `Polities`, `ConquestEvents`, `PlayerShip` |
| Shared selectable entity | `Id`, `ProceduralName`, `NiceName`, `Visibility`, `Intelligence`, optional `PortraitIndex` |
| `Sector.PlayerShip` | Shared selectable keys plus `CurrentLocationId` |
| `Sector.Systems[]` | Shared selectable keys, `HexLocation`, `Star`, `Objects`, `PointsOfInterest`, `HabitablePointsOfInterest` |
| `System.HexLocation` / `System.Star` | `Column`, `Row` / shared selectable keys plus `StarType` |
| `System.Objects[]` | Shared selectable keys, `Orbit`, `Kind`, `ClaimedByPolityIds`; planets add `Size`, `BulkComposition`, `SurfaceWaterPresent`, `Atmosphere`, `NativeBiosphere`, `InhabitedInfo`, optional `Culture`; other objects add `ObjectType` |
| `Object.Orbit` | Direct: `AU`, `AngleDegrees`, `ParentObjectId`; moon: `AngleDegrees`, `ParentObjectId` |
| `Planet.InhabitedInfo` | `WorldTags`, `TerranBiosphere`, `Population`, `TechLevel` (or `false` on the planet) |
| `Planet.Culture` | `culturalTemplate`, `homeworld`, `adventureComponents`, `pcCaresAbout`, `biggestConflict`, `outsiderOpinion`, `lawEnforcement`, `majorStarport`, `planetaryDefenses`; adventure components and nested records have corresponding explicit allowlists |
| `System.PointsOfInterest[]` / `System.HabitablePointsOfInterest[]` | Shared selectable keys plus `ParentObjectId`, `POIType`, `AngleDegrees` / shared selectable keys plus `ParentWorldId`, `HPOIType`, `AssignedPolityId`, `AngleDegrees` |
| `Sector.Routes[]` / `Sector.RoutePortals[]` | Shared selectable keys plus `PortalIds` / shared selectable keys plus `SystemId`, `BoundaryAngleDegrees` |
| `Sector.Polities[]` / `Polity.Flag` | `Id`, `NiceName`, `HomeworldId`, `Flag` / `FieldColor`, `CircleColor` |
| `Sector.ConquestEvents[]` | `Id`, `AttackerPolityId`, `DefenderPolityId`, `TargetWorldId`, `RouteDistance`, `Attack`, `Defense` |
| Shared entity `Visibility` / `Intelligence` | Four scan flags / `InfoboxSummary`, four scan text fields, `GM` |

The validator rejects any additional key, including unknown properties in nested records, and separately checks required keys and references. Provenance, schema metadata, selected generation facts, placements, campaign state, and deferred names/disclosure fields are all represented in this inventory and the field-family table; there are no disputed exceptions. A schema bump is required only if a future audit removes or changes a Base field. The present prototype has no persisted-sector boundary, so external migration machinery remains unnecessary.

## Implementation sequence

1. Add the shared display contract and pure sector projector. Test equality across repeated projections, no Base mutation, preservation of collection order, and clear failure for dangling references. Keep `merged-v7` during this additive stage. **Started:** `DisplaySectorDTO`, `projectSector`, application read methods, and focused tests are in place. The graph will grow as UI consumers move to it.
2. Make application read methods return display data and convert archive and reducer state. **Implemented:** public application reads return sector projections or archive summaries; canonical load remains private. The reducer stores display DTOs, all visual surfaces use them, and command results update state without reloading canonical sectors into the UI.
3. Move operations, selectors and validation to their owning layers. Replace UI mutation callbacks with ID/value commands. **Implemented:** canonical operations live in `Composition/sector_operations.ts`, selectors and scan rules in `Helpers/Domain/`, and save validation in `Validation/`. Generation, rename, deletion, completion, explicit edits, visibility, movement and object deletion commit only after a projected result is available. Failed writes leave canonical storage untouched.
4. **Complete:** audit every canonical field family against other Base fields plus deterministic projection data. No field met the removal criterion; `merged-v7` remains valid, with strict nested-key validation and no disputed exceptions.
5. **Complete:** production UI contains no imports of Base DTOs, raw generation data, generators, projectors, or canonical operations. `areAdjacentHexes` is under UI interaction geometry. The reducer and command boundary use only display values and IDs/explicit edits. Test-only fixtures may import generator/projector/Base DTO modules to construct their inputs.

## Acceptance checks

- `rg` finds no production `UI/` import of `BaseDTO`, `Data/Raw`, `Generator`, or canonical operations through a re-export. UI render paths do not invoke `project*` with a Base sector.
- Application reads are detached `DisplaySectorDTO` values; commands take IDs/edits and return freshly projected values. Repeating projection of the same Base sector yields equal output without mutation or random calls.
- Fixed-seed generation, projection, archive, GM editing, world completion, and preview/scan workflows are covered by the existing SWN tests; those tests were not rerun during this documentation closeout.
- Validation accepts generated and command-updated sectors, rejects removed or unknown fields and invalid references, and checks the current schema version. No external migration is required while sectors remain in memory.
- The final audit records every Base field family and finds no disputed exception. Part 5's disclosure contract remains explicitly out of scope.
