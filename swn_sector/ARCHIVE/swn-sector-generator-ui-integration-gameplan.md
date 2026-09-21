# SWN Sector Generator/UI Integration Gameplan

## Objective

Change `src/generators/swn_sector/ui` so sector generation uses
`src/generators/swn_sector/generate.ts`, while preserving the current UI
workflow and retaining the generator's richer `merged-v1` data. The first
integration is concerned with the data boundary and existing behavior; it does
not need to expose every generated field visually.

## Current state

The UI is built around a prototype-only sector model and a placeholder
generation path:

- `ui/data.ts` creates flattened fixtures with `Worlds`, `POIs`,
  `DetailsAndVisibility`, `HexLocation.X/Y`, and two-ended routes.
- `PrototypeApplication.generateSector()` clones a fixture and assigns fresh
  IDs; it does not run the SWN generator.
- The real generator returns `merged_schema.Sector` from `generate(seed)`.
- The real schema stores selectable identity and intelligence on each entity,
  uses `System.Objects` and `PointsOfInterest`, represents moons through
  `Orbit.ParentObjectId`, and represents routes through `RoutePortals`.
- The real generator produces 20–30 systems, 1–7 system objects per system,
  richer planets/inhabited-world data, portals, and deterministic IDs. These
  fields must not be discarded merely because the current UI does not render
  them.

The migration should therefore change the domain/application contract first,
then update feature selectors and rendering against that contract. A broad
schema conversion layer would preserve the old assumptions and lose the point
of the integration, so it should not be introduced as the primary design.

## Target boundary

Use the canonical types from `src/generators/swn_sector/merged_schema.ts` as
the sector data model, or re-export those exact types from the UI domain if a
UI-facing import boundary is useful. Do not maintain a second, flattened
`Sector` representation.

The target model has these important consequences:

| Existing UI assumption | Target integration rule |
| --- | --- |
| `system.Worlds` | Read planet objects from `system.Objects` where `Kind === 'Planet'`. Keep `OtherCelestialObject` values in the sector even when they are not rendered. |
| `system.POIs` | Read `system.PointsOfInterest`. Their identity/name/intelligence lives on the POI itself. |
| `DetailsAndVisibility` records | Read/write `ProceduralName`, `NiceName`, `VisibilityLevel`, and `Intelligence` directly on each selectable entity. |
| `HexLocation.X/Y` | Use `HexLocation.Column/Row`; preserve the existing odd-column map geometry after renaming the coordinate access. |
| `Route.SystemId1/SystemId2` | Resolve each route's two `PortalIds`, then resolve each portal's `SystemId`. Route rendering may derive the two endpoint systems without mutating the canonical route. |
| `PlayerShip.CurrentSystemId` | Derive the containing system from `CurrentLocationId`; the canonical location may be an object, portal, or route. |
| `World.MoonOf`, `World.Angle`, `World.AU` | Read `Planet.Orbit.ParentObjectId`, `Planet.Orbit.AngleDegrees`, and `Planet.Orbit.AU`. A moon retains the parent's AU in the generator output. |
| `WorldType`/`inhabitedWorld` | Use `Planet.Size`/`Kind` for basic rendering and `InhabitedInfo !== false` for inhabited indicators. Do not invent a lossy one-to-one world type mapping unless a visual class requires it. |
| UI-created fresh IDs | Preserve generator IDs for generated sectors. Any clone/edit operation must remap every canonical selectable reference, including route portals and `CurrentLocationId`, if cloning remains needed. |

Selectable traversal must include systems, stars, all system objects,
all POIs, routes, route portals, and the player ship. The traversal should be
centralized in domain selectors so visibility, selection, deletion, and
validation use the same complete object graph.

## Implementation phases

### 1. Replace the UI domain model with the canonical model

Update `ui/domain/sector/model.ts` and its exports to use the merged schema.
Remove the prototype-only fields rather than making both shapes optional.
Update `ui/types.ts` and `ui/data.ts` imports accordingly.

Refactor selectors first:

- Build a complete `objectEntries()` over canonical entities.
- Add helpers for `systemObjects`, `planets`, `moons`, `objectContainingSystem`,
  and route endpoint resolution.
- Make `findDetails()` return the entity's canonical identity/intelligence
  data, or replace it with a clearly named canonical entity lookup.
- Make visibility checks use the entity's `VisibilityLevel`.
- Resolve a ship's current system from its location ID, including portal and
  route locations.

Refactor validation and operations against those selectors. Preserve the
current typed failure behavior for prohibited deletion, movement, and invalid
visibility changes, but update cascade rules for:

- deleting a system and all objects/POIs/portals/routes belonging to it;
- deleting an object and its child moons and hosted POIs;
- deleting a route and its portals, unless the product later decides portals
  should be independently retained;
- editing canonical `NiceName` and intelligence text fields in place on the
  selected entity.

Do not add compatibility properties such as `Worlds` or `DetailsAndVisibility`
to the canonical object solely to reduce compiler errors.

### 2. Make the application generation boundary real

In `ui/application/prototypeApplication.ts`:

- import `generate` from `../generate` (or the correct relative path from the
  UI directory);
- implement `generateSector(seed)` as `generate(seed)` followed by a deep copy
  when returning/storing values;
- remove the template clone from the generation path;
- retain synchronous in-memory archive behavior for this integration;
- decide whether the two initial archive entries should be generated from two
  fixed seeds. Prefer this so startup exercises the same canonical shape as
  user-requested generation. If existing fixture-based tests still need
  narrow cases, keep test-only builders separate from production generation.

The generated sector name comes from the generator (`Sector ${seed}`), so
archive naming assertions and any rename behavior should be updated without
rewriting the generator's result after generation.

### 3. Preserve the current UI with the smallest canonical projection

Update the feature components to use canonical fields while intentionally
leaving richer data unrendered:

- `HexMap`: use `Column/Row`; draw routes from resolved portal endpoints.
- `SymbolicSystem` and `TopDown`: render planet objects, group moons by
  `Orbit.ParentObjectId`, use orbit angle/AU, and treat other celestial objects
  as selectable-but-not-required for the first pass.
- Render POIs from `PointsOfInterest` and attach them to their parent object.
- `DetailBar`/`GMEditBar`: show canonical names and intelligence text, and keep
  visibility/edit behavior intact.
- `App.tsx` and movement logic: replace direct `CurrentSystemId` assumptions
  with the containing-system selector. Keep the current UI behavior when the
  player ship is at a star/object; route/portal locations may remain selectable
  without needing a new visual treatment.
- Keep existing labels, CSS classes, accessibility names, preview semantics,
  and navigation transitions unless a field rename makes a change unavoidable.

For data that is not representable in the current UI—planet composition,
temperature, atmosphere, biosphere, world tags, route portal angles, and
other celestial-object types—retain it in the sector object and do not map it
to fake legacy values. Add display support later as a separate feature.

### 4. Update tests by responsibility

Replace placeholder-shape assertions with canonical integration assertions.
Maintain unit coverage for the existing workflows:

- generator determinism and canonical shape;
- `PrototypeApplication.generateSector()` uses the requested seed and stores
  the generator output without losing nested fields;
- returned/stored sectors remain deep-copy isolated;
- complete selectable lookup and visibility behavior, including portals and
  other celestial objects;
- route endpoint resolution through portals;
- ship movement and current-system derivation;
- system/object/POI/route deletion cascades and reference cleanup;
- archive load, rename, delete, and generated-sector replacement;
- sector map, system viewer, detail inspector, and preview-mode rendering
  against a real generated sector.

Retain small hand-built fixtures only where they make an operation edge case
clear, but type them as the canonical schema. Add at least one generated
sector to component tests so the UI cannot silently regress to fixture-only
assumptions.

### 5. Verify in layers

Run the repository's normal checks after each migration slice:

```text
npm test
npm run build
git diff --check
```

Then use the managed Playwright browser to verify:

1. the app starts with generated sectors;
2. entering the archive seed creates a real generated sector;
3. the hex map displays systems and routes;
4. opening a system displays planets, moons, and POIs where visible;
5. GM/player preview and visibility edits still work;
6. selecting and moving the player ship still works;
7. browser console errors are absent.

## Acceptance criteria

- `PrototypeApplication.generateSector(seed)` calls the real generator and no
  longer clones a placeholder template.
- Generated sectors remain full `merged-v1` values after storage, loading,
  editing, and archive operations; no adapter drops generator-only fields.
- The UI domain has one canonical sector shape and no required legacy fields
  such as `Worlds`, `POIs`, `DetailsAndVisibility`, `X/Y`, or two-ended route
  IDs.
- Existing sector/archive/system/inspector/preview workflows continue to work
  with generated data.
- All canonical selectable entities can participate in ID lookup and
  visibility, even if some are not yet visually represented.
- Tests cover route portals, canonical ship location semantics, richer object
  preservation, and generator-backed application generation.
- Any unsupported visual data is explicitly deferred, not discarded or
  represented with fabricated legacy values.

## Risks and decisions to revisit later

- The UI currently assumes every visible system has a legacy-style world
  presentation. Decide later how to style asteroid belts, gas clouds, Kuiper
  belts, and independent stations.
- Portal visibility and route visibility may need separate product semantics;
  the first pass should follow the canonical entity visibility values and keep
  route rendering conservative when an endpoint is not visible.
- Canonical routes are not necessarily equivalent to adjacent-hex routes. The
  UI should render the generator's routes, not recompute or filter them using
  prototype adjacency rules.
- The current archive is in-memory and index-based. Persistence, stable sector
  identity, authentication, and asynchronous generation remain out of scope
  for this integration.
- If a later API requires a transport schema different from `merged-v1`, add a
  boundary adapter at that external boundary; do not reintroduce a lossy model
  inside the UI.
