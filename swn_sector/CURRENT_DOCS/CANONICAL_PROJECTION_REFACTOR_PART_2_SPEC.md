# SWN Sector: Stars, Systems, Spatial Facts, and Routes

## Status and intent

This is sub-spec 2 of the [canonical projection refactor roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md). It follows the planet slice and started from the in-memory `merged-v4` sector contract. Implementation now emits `merged-v5`. It covers star presentation, system geometry and summaries, orbital temperature interpretation, route geometry and descriptions, and object-kind labels. It covers the hex map, top-down and symbolic system views, the object inspector, and shared labels used by the app and GM editor.

The slice has two reviewable stages. First, introduce pure read models and move covered derivations out of UI code. Then remove fields proven reconstructable from the canonical sector. Keep layout calculations and interaction in UI. The whole-app Display Sector DTO and unified disclosure policy belong to later sub-specs.

## Current ownership audit

| Current fact or calculation | Decision | Reason |
| --- | --- | --- |
| `Star.StarType` and `StarSystem.HexLocation` | Keep in Base | Rolled star outcome and random grid placement. |
| Star colors, size, recipe, CSS tokens | Project | Deterministic mapping from `StarType`; currently in `star_presentation.ts`. |
| System edge, direct-orbit AU range, normal temperature band, detailed temperature bands | Project using shared deterministic spatial rules | Determined by `StarType` and `STAR_AU_WIDTHS`; `TopDown` currently imports `generation_rules.ts` for two of these. |
| Direct object's `Orbit.AU` and `Orbit.AngleDegrees` | Keep in Base | AU is randomly placed inside a valid band; angle is a random placement. |
| Direct object's `Temperature` | Remove from Base after projection cutover | For a valid direct orbit, `StarType` and AU identify one nonempty, open temperature band. The generator may still hold its rolled temperature while choosing AU. |
| Moon's `Orbit.ParentObjectId` and `Orbit.AngleDegrees` | Keep in Base | Generated parent relationship and angular placement. |
| Moon's `Orbit.AU` and `Temperature` | Remove from Base | Both are copied from its canonical parent. The display orbit inherits parent AU, then interprets temperature from the system star. |
| `Route.PortalIds` and `RoutePortal.SystemId` | Keep in Base | They define the generated connection and each endpoint's system. |
| `RoutePortal.BoundaryAngleDegrees` | Keep in Base | It includes random bearing jitter and collision resolution. Star type supplies the derived boundary radius. |
| `RoutePortal.RouteId` | Remove from Base | A portal's owning route is uniquely determined by membership in `Route.PortalIds`. Keep that single ownership direction. |
| Route endpoint systems, hex distance, destination labels, route inspector text | Project | Derived by resolving portal and system IDs and applying the current hex-distance and name rules. |
| `OtherCelestialObject.ObjectType`, planet `Kind`, POI type and parent IDs | Keep in Base | Generated kinds and relationships. Human-readable kind labels and glyph classes are projected. |
| `PointOfInterest.AngleDegrees` | Keep in Base | Generated angle. Rendering coordinates remain layout calculations. |
| `ConquestEvent.RouteDistance` | Defer to sub-spec 3 | It records a historical political outcome; decide its historical semantics alongside conquest events. Do not equate it silently with the present route graph. |

An entity's `NiceName`, `ProceduralName`, `Visibility`, `Intelligence`, and `PortraitAssetId` remain as defined in `merged-v4` during this slice. Part 4 owns their final disclosure and asset contract. A generated portal's initial name may be reconstructed from other names, but an independently edited name must remain canonical until the names audit in part 4.

## Projection contracts

Use named, pure read models or equivalent types for the covered content. A projector takes `Sector`, an entity ID, and an explicit preview context when text depends on GM/player presentation. It never reads application state, mutates input, creates IDs, or selects random outcomes. It returns a clear missing-reference result for an invalid ID or broken link; it must not silently invent an endpoint or a zero-length route.

### Star and system display

`StarDisplayDTO` exposes the copied `starId` and `starType`, the existing star color, relative size, recipe, class, and style tokens. `StarGlyph` receives the projected recipe while continuing to render its markup. The shared star presentation mapping is projection data; it has no React dependency. Pixel dimensions, responsive scale, SVG markup, and DOM measurement stay in the views.

`SystemSpatialDisplayDTO` exposes copied `systemId` and `HexLocation`, the derived system edge AU, direct-orbit AU interval, normal-temperature inner and outer AU, whether the normal band is empty, and the detailed nonempty temperature bands. The UI converts AU to pixels using its measured viewport. It must not call `normalTemperatureAuBand`, `systemEdgeAu`, or raw generation tables itself.

`SystemSummaryDisplayDTO` supplies the existing inspector Basic stock line (`<StarType> Type`) and the star facts needed by map and system views. Any route and object counts shown later must be calculated here. The current Politics stock claim list is owned by sub-spec 3; keep its present behavior during this slice.

### Objects and orbit interpretation

`ObjectSpatialDisplayDTO` exposes the copied ID, kind, parent ID and canonical angle, plus **effective** AU and temperature. For a direct object, effective AU is the stored AU and temperature is the unique temperature band for that AU and system star. For a moon, effective AU is its parent's direct AU and temperature is its parent's effective temperature. Reject missing parents, non-planet parents, cycles, boundary AU values, and AU values with no unique band through validation; projection reports a missing/invalid result rather than guessing.

It also supplies existing generated labels for world versus moon and for `OtherCelestialObject` subtypes, plus the existing Basic inspector AU/type text for non-planet objects. Planet display projection from part 1 must consume effective temperature and AU without rebuilding a synthetic canonical `Planet` or making the generator depend on a UI read model. Existing planet color and composition behavior must remain the same.

`ObjectKindDisplayDTO` (or a shared field on the entity read model) replaces `objectKindLabel` for the covered inspector header, app selection label, and GM edit header. Preserve the current uppercase labels, including `WORLD`, `MOON`, `ROUTE PORTAL`, `POINT OF INTEREST`, and HPOI subtype. The eventual full label and visibility contract remains part 4.

### Routes

`RouteDisplayDTO` exposes route ID, the two ordered portal IDs, resolved endpoint system IDs, current endpoint hexes, integer hex distance, and the existing Basic inspector text. The hex-distance function must reproduce the current odd-column offset coordinate calculation in `DetailBar.tsx`; do not substitute the Euclidean distance used only to choose candidate route edges during generation. Resolve the owning route of a portal by `Route.PortalIds` membership after `RoutePortal.RouteId` is removed.

For labels, preserve each view's present rule until part 4: the route inspector and top-down destination use the **route's** Politics scan to choose nice versus procedural endpoint names; symbolic route labels use their current fallback; map labels use the system's visible-name rule. The projector receives the preview explicitly and returns the relevant strings. It does not grant or revoke scan visibility. The map and views still filter visible items with their current checks during this slice.

Project route endpoint relationships for the hex map, top-down route markers, and symbolic destinations. The UI still computes line endpoints, rotation, and spacing from projected coordinates and its own layout constants. Projection provides a star-type-derived portal boundary AU; the stored portal angle remains the directional input.

## Data and dependency placement

- `star_types.json`, world-attribute tables, route tie rolls, temperature rolls, and random AU/angle sampling remain generation inputs.
- `STAR_AU_WIDTHS` from `tables.ts`, the pure band functions now in `generation_rules.ts`, and star presentation mappings become deterministic projection/domain data. Generator and validation may import shared pure spatial rules; they must not import a Display DTO or React code. UI components import only projectors/read models for covered facts.
- The AU band interpreter has one implementation shared by generation constraints, validation, and projection. It retains current open-interval semantics and the current spelling of `Furance`; renaming that category is outside this slice.
- Do not save any Display DTO. Use the current in-memory application state and re-project after an existing edit or sector generation action.

## Implementation sequence

### Stage 1: Establish the read boundary

1. Add pure star, system-spatial, object-spatial/kind, and route projectors with explicit DTO types. Move deterministic star and AU-width mappings to projection-side modules without importing weighted tables into UI.
2. Update `HexMap`, `TopDown`, `SymbolicSystem`, `StarGlyph`, and the relevant `DetailBar` branches to render projected fields. Update `App` and `GMEditBar` to use the projected kind label.
3. Keep `merged-v4` unchanged in this stage. Compare the projected result with the current behavior for every star type, direct and moon orbits, empty normal bands, routes, and GM/player scan states.

### Stage 2: Remove reconstructable canonical fields

1. Remove `SystemObjectBase.Temperature`. Make orbit shape express a direct orbit with AU and `ParentObjectId: null`, or a moon orbit with parent ID and no AU. Generator working records may still carry temporary temperature and inherited AU while choosing and validating placements; emitted Base objects may not.
2. Remove `RoutePortal.RouteId`. Keep `Route.PortalIds` as the authoritative route-to-portal relationship. Update portal portrait lookup, deletion and validation to find ownership from that relationship.
3. Update planet projection from part 1, portrait category selection during generation, system naming/ordering, generator types, validators, and test fixtures to consume the new effective spatial facts. Validate direct AU against exactly one nonempty open band; validate moon parent and inherited facts without demanding removed fields; validate every portal is owned by exactly one route.
4. Bump the in-memory schema contract from `merged-v4` to `merged-v5`. The prototype has no persisted sector boundary. Do not add migration machinery unless persistence appears before implementation.

## Acceptance tests

1. Repeated projection of the same sector and preview is deeply equal and leaves the Base sector unchanged. Projection uses no random source.
2. All nine star types retain their current glyph recipe, colors, relative size, and class/style tokens in the hex, top-down, and symbolic views.
3. System edge and normal-temperature radii match current behavior for ordinary stars and compact remnants. Layout responds to viewport resizing while AU values remain fixed.
4. Direct-orbit temperature projection matches the previous stored value across fixed seeds; moons inherit their parent's effective AU and temperature. Boundary, missing-parent, non-planet-parent, and cycle inputs fail clearly.
5. The route inspector's endpoint names and spike length, symbolic destination labels, top-down route destinations, and hex-map connections match current GM and player output at relevant scan levels. The route length uses hex steps, not generation's Euclidean edge score.
6. Newly generated `merged-v5` sectors omit `Temperature`, moon AU, and `RoutePortal.RouteId`. Route topology, angles, direct AU placements, selected star types, and randomly selected portrait IDs match fixed-seed `merged-v4` output after removing only the specified fields and version.
7. Sector validation rejects unowned or multiply owned portals, invalid endpoint systems, invalid direct AU, and invalid moon parent relationships without requiring removed fields. Existing delete/edit controls continue to produce valid sectors and re-project correctly.
8. Covered UI files do not import `generation_rules.ts`, `tables.ts`, or raw generation data for display calculations. They do not calculate route length, temperature band, system edge, star class, or object-kind text.

## Direct Base reads left for later slices

This slice permits direct UI reads for scan filtering, names and authored intelligence, polity overlays and claims, POIs/HPOIs and culture, portrait resolution, player-ship state, and edit commands. List any further direct reads found during implementation in the part 5 cutover checklist. Part 4 will unify visibility and naming rules; part 3 will own political summaries. This slice must not change either behavior accidentally.
