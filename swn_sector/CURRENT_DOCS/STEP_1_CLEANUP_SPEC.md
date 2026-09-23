# Step 1 Specification: Cleanup, Bugs, and Simple Elaborations

## Status and intent

This specification defines the first implementation phase. Its purpose is to make the existing generated sector legible, internally consistent, and visually informative before adding portraits, starting-world logic, or politics.

The current canonical entities, visibility levels, IDs, names, intelligence fields, and GM/player preview behavior remain in place unless this specification explicitly changes them.

## Scope

1. Type-based star and planet presentation.
2. Orbit spacing for physical validity and UI readability.
3. Belt and gas-cloud rendering.
4. Inhabited-world summary icons.
5. Symbolic-view layout cleanup.
6. Moon rendering, description, and naming.
7. Route endpoint navigation.
8. POI naming and generated details.
9. Temperature-sensitive display of water composition.

Portrait artwork is Step 2. Starting-world visibility is Step 3. Political data is Step 4.

## 1. Shared visual classification

Stars already expose `StarType`. Other celestial objects expose `ObjectType`. Uninhabited planets are generated from a planet template, but the canonical `Planet` record currently does not retain that template.

Step 1 must establish a stable visual classification for every planet. The preferred contract is an explicit generated planet visual type with these categories:

- `Mercurian`
- `Europan / Plutonic`
- `Lunar`
- `Ioan`
- `Titanian`
- `Martian`
- `Venusian`
- `Jovian`
- `Neptunian`
- `Inhabited`

The value is generated once and persisted. UI code must not reconstruct it from an editable name. Step 2 will reuse this classification for portrait selection.

The exact serialized field name and schema-version change are implementation decisions, but all views must consume one shared classification rather than maintaining separate ad hoc mappings.

## 2. Stars

Provide one centralized presentation mapping for every `StarType`:

- `A-type`
- `F-type`
- `G-type`
- `K-type`
- `M-type`
- `Giant`
- `White dwarf`
- `Neutron star`
- `Stellar-mass black hole`

The mapping supplies a color and relative display size. It is used consistently in:

- The sector hex map.
- The symbolic system view.
- The top-down system view.

Size is visual only and does not alter orbital calculations. Each star remains selectable and retains an accessible label independent of color.

The exact color and size table must be approved during this step; it must live in one shared source rather than in three components.

## 3. Planets

Provide one centralized presentation mapping for every planet visual type from Section 1. The mapping supplies:

- A color for the top-down system view.
- A color and relative size for the symbolic system view.

The top-down view may continue to use a constrained marker size for readability, but planet type must remain distinguishable without relying only on the label. Moons may be displayed smaller than direct-orbit planets while retaining the type color.

The exact palette and size ratios must be approved during this step. Existing canonical physical `Size` remains a factual field and must not be overwritten by visual sizing.

## 4. Orbital spacing

Physical placement and screen layout are separate requirements.

### 4.1 Stored AU spacing

- Direct-orbit objects remain within the valid temperature band for their star type.
- Their stored AU values remain strictly ordered and distinct.
- Generation must enforce a minimum clearance between adjacent direct-orbit objects rather than accepting values that merely differ numerically.
- Moon `Orbit.AU` continues to represent the parent world's star-relative AU; moon-to-parent distance is a display concern and is not introduced here as a physical simulation field.
- If the requested contents cannot fit while preserving temperature bands and minimum clearance, generation must fail through its existing bounded retry behavior rather than silently moving an object into an invalid band.

The physical clearance formula is a required drill-down decision. It must be defined in AU/domain terms and covered by generation invariants.

### 4.2 Angular spacing

- Direct-orbit objects receive angles that prevent overlapping markers and labels in the top-down view under normal desktop layout.
- Multiple moons around one parent receive mutually readable angular placement.
- Route portal angles remain governed by route bearing and are not moved to satisfy planet spacing.
- Angular layout remains deterministic for a seed.

The minimum angular separation may vary with marker size. Its exact value is a required drill-down decision.

### 4.3 Rendered radial spacing

- The top-down view continues to communicate true relative AU order.
- The view may apply a monotonic display transform or a minimum pixel gap so adjacent objects remain readable.
- Such a transform changes screen position only. Displayed AU text continues to show the stored value.
- The outer system boundary and route portals remain visually distinct from orbit tracks.

## 5. Belts and gas clouds

### 5.1 Asteroid and Kuiper belts

- In the top-down view, an `AsteroidBelt` and `KuiperBelt` are rendered as annular bands centered on the star, not as planet-like point markers.
- Asteroid and Kuiper belts have distinct textures or colors.
- The belt remains selectable through a clear hit target and accessible label.
- In the symbolic view, each belt retains a compact symbolic glyph rather than consuming an entire literal ring.

POIs hosted by a belt need an angular location so they can be placed at a specific point on the annulus. Add a persisted angle for belt-hosted POIs. The angle is deterministic, lies in `[0, 360)`, and does not change the POI's parent relationship.

### 5.2 Gas clouds

- In the symbolic view, a gas cloud is shown as a soft-edged blob rather than a conventional planet.
- In the top-down view, a gas cloud is shown as a diffuse region associated with its generated AU.
- It must remain selectable and visually distinct from belts, orbit lines, and the system boundary.

Whether top-down gas clouds use a localized blob, an annular cloud, or a diffuse region extending beyond the system boundary is still a focused art-direction decision for Step 1.

## 6. Inhabited-world summary

Every inhabited planet or moon shows three meaningful summary indicators in the symbolic view:

- Population.
- Habitability (`TotalHab`).
- Tech level.

The indicators must expose their actual values through visible text, a tooltip, or an accessible label. Decorative glyphs without the values do not satisfy this requirement. Uninhabited worlds show no inhabited-world summary row.

This replaces the current atmosphere/population/technology placeholder combination with population/habitability/technology.

## 7. Symbolic-view layout

- The symbolic object grid and its track occupy the same vertical extent.
- No unexplained dead space appears beneath the track when the optional information grid is closed.
- Star, planet-family, other-object, and route columns remain aligned on the symbolic axis.
- Horizontal overflow is allowed for large systems, but it must not create vertical dead space.
- Existing selection and GM/player visibility behavior remains unchanged.

## 8. Moons

### 8.1 Naming

Direct-orbit objects retain single-letter suffixes in orbital order: `A`, `B`, `C`, and so on.

Moons do not consume the next direct-orbit letter. They are named from their parent suffix followed by a lowercase moon suffix:

- First moon of `A`: `Aa`
- Second moon of `A`: `Ab`
- First moon of `B`: `Ba`

Nice names and procedural names follow the same hierarchy. Naming is based on parent identity and orbital order, not array position across unrelated objects.

### 8.2 Symbolic view

- A moon remains grouped immediately with its parent planet.
- Its relationship to the parent is shown by a visually distinct moon-orbit/ecliptic treatment.
- The relationship cannot depend on color alone; layout or another marker must also convey it.

### 8.3 Top-down view

- Each visible moon has its own visible label.
- The moon label uses the moon's display name and procedural name according to the existing preview/visibility rules.
- The host planet's label is not repeated in place of the moon label.
- The moon marker and label remain associated with the correct host planet.

### 8.4 BasicSignal

The generated BasicSignal facts for a moon explicitly state that it is a moon and identify its host planet. A direct-orbit planet is not described as a moon.

## 9. Route endpoint navigation

Route inspection must provide navigation to both endpoint systems, including routes whose endpoints are more than one hex apart.

- A selected route exposes two endpoint controls.
- Each control displays the endpoint system name appropriate to the active GM/player preview.
- Activating a control selects or opens that endpoint system.
- Endpoint navigation is derived through `Route.PortalIds` and `RoutePortal.SystemId`; it must not assume hex adjacency.
- The current contextual “To [other system]” control may remain in a system view, but the route detail UI must expose both endpoints.

## 10. POIs

### 10.1 Naming

Generated POI names use:

`<Type>-<RomanNumeral>-<ParentObjectName>`

Rules:

- Numbering starts at `I` for each `(parent, POI type)` pair.
- Numbering follows stable generation order.
- The generated name uses the parent's procedural name so later edits to `NiceName` do not silently rename the POI.
- The POI's `NiceName` initially matches the generated name and remains independently editable.

### 10.2 Generated details

Each POI rolls all random detail columns supplied by its POI table, currently including an occupant and a situation where defined.

- Each column uses an independent deterministic random stream.
- One detail roll cannot be reused for another column.
- Results are persisted in, or rendered into, the POI's GM-only note.
- The GMNote clearly labels each result, for example `Occupants:` and `Situation:`.
- These details are not automatically exposed to players by Basic Scan.

## 11. Water versus ice display

When `BulkComposition` is stored as `Water`, presentation uses:

- `Ice` for `Cryogenic`, `Deepfrozen`, `Polar`, and `Subarctic` worlds.
- `Water` for all warmer temperature categories.

This is display-only. The serialized `BulkComposition` remains `Water`, and generation/habitability rules continue to use that canonical value.

## Data-model impact

Expected additions or changes:

- Persisted planet visual classification.
- Persisted angle for a belt-hosted POI, either as an optional POI field or a narrowly typed location structure.
- Persisted or structured POI detail results, unless the selected implementation writes the labeled results directly into `Intelligence.GM` at generation time.

No reroll metadata or APIs are added.

## Acceptance criteria

Step 1 is complete when automated tests and targeted UI inspection demonstrate that:

1. Every star type uses the same semantic color/size mapping in all three views.
2. Every planet visual type has the required top-down and symbolic treatment.
3. Generated direct-orbit AU values satisfy temperature bands, ordering, uniqueness, and the approved clearance rule.
4. Top-down objects and moons meet the approved angular/readability rules.
5. Belts render as annuli and belt POIs occupy deterministic angular positions.
6. Gas clouds use the approved blob/cloud treatment.
7. Inhabited worlds expose population, habitability, and tech level in their summary.
8. The symbolic track has no closed-state dead space.
9. Moon names, labels, orbit treatment, and BasicSignal descriptions identify them correctly.
10. Both endpoints of every route are navigable, including multi-hex routes.
11. POI names follow the specified format and their independent detail rolls appear in GMNote.
12. Cold water-composition worlds display `Ice` without changing serialized composition.
13. Existing selection, editing, and player-visibility behavior still passes its tests.

## Drill-down decisions remaining

- Exact star palette and relative sizes.
- Exact planet palette and symbolic size ratios.
- Physical AU clearance formula.
- Angular minimum-separation rule.
- Top-down radial display transform or pixel-gap rule.
- Final top-down gas-cloud treatment.
- Exact schema field names for visual type and POI placement/details.
