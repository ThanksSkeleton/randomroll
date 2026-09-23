# Step 1 Specification: Cleanup, Bugs, and Simple Elaborations

## Status and intent

This specification defines the first implementation phase. Its purpose is to make the existing generated sector legible, internally consistent, and visually informative before adding portraits, starting-world logic, or politics.

The current canonical entities, visibility levels, IDs, names, intelligence fields, and GM/player preview behavior remain in place unless this specification explicitly changes them.

## Scope

1. Star and planet presentation.
2. Orbit spacing for physical validity and UI readability.
3. Belt and gas-cloud rendering.
4. Inhabited-world summary icons.
5. Symbolic-view layout cleanup.
6. Moon rendering, description, and naming.
7. Route endpoint navigation.
8. POI naming and generated details.
9. Temperature-sensitive display of water composition.

Portrait artwork is Step 2. Starting-world visibility is Step 3. Political data is Step 4.

## 1. Planet presentation

Planet color is determined by habitation and bulk composition, not by visual type:

`if uninhabited { colors[BulkComposition] } else { green }`

This rule applies consistently wherever a planet or moon is displayed. The canonical `BulkComposition` and inhabited state remain the source values; no persisted visual classification is required.

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

The mapping supplies a color and relative display size. Color is used consistently in:

- The sector hex map.
- The symbolic system view.
- The top-down system view.

Display size is visual only and does not alter orbital calculations. It applies to the symbolic view and, to a lesser extent, the sector map; it does not affect the top-down view. Each star remains selectable and retains an accessible label independent of color.

The exact color and size table must be approved during this step and must live in one shared source rather than in three components.

## 3. Orbital spacing

Physical placement and screen layout are separate requirements.

### 3.1 Stored AU spacing

This requires investigation.

### 3.2 Angular spacing

- Direct-orbit objects should receive angles that make a best-effort attempt to prevent overlapping markers and labels in the top-down view under normal desktop layout.
- Multiple moons around one parent should receive a best-effort readable angular placement.
- Route portal angles remain governed by route bearing and are not moved to satisfy planet spacing.
- Angular layout remains deterministic for a seed.

Readability is a best-effort heuristic, not a hard requirement.

## 4. Belts and gas clouds

### 4.1 Asteroid and Kuiper belts

- In the top-down view, an `AsteroidBelt` and `KuiperBelt` are rendered as annular bands centered on the star, not as planet-like point markers.
- Asteroid and Kuiper belts have distinct textures or colors.
- The belt remains selectable through a clear hit target and accessible label.
- The symbolic representation is TBD.

Add an angle field to all POIs. It is relevant only for belt-hosted POIs, where it places the POI at a specific point on the annulus. The angle is deterministic, lies in `[0, 360)`, and does not change the POI's parent relationship.

### 4.2 Gas clouds

TBD.

## 5. Inhabited-world summary

Every inhabited planet or moon shows population, habitability (`TotalHab`), and tech level in the symbolic view. Whether these use text, symbols, or a combination is TBD, but content-less placeholders should be removed. Uninhabited worlds show no inhabited-world summary row.

## 6. Symbolic-view layout

The symbolic object grid and its track occupy the same vertical extent.

## 7. Moons

### 7.1 Naming

Direct-orbit objects retain single-letter suffixes in orbital order: `A`, `B`, `C`, and so on.

Moons do not consume the next direct-orbit letter. They are named from their parent suffix followed by a lowercase moon suffix:

- First moon of `A`: `Aa`
- Second moon of `A`: `Ab`
- First moon of `B`: `Ba`

Moon order is arbitrary but stable; use generation order consistently. Nice names and procedural names follow the same hierarchy. Naming is based on parent identity and this moon order, not array position across unrelated objects.

### 7.2 Symbolic view

- A moon remains grouped immediately with its parent planet.
- Its relationship to the parent is shown by a visually distinct moon-orbit/ecliptic treatment.

### 7.3 Top-down view

- Each visible moon has its own visible label.
- The moon label uses the moon's display name and procedural name according to the existing preview/visibility rules.
- The host planet's label is not displayed.

### 7.4 BasicSignal

The generated BasicSignal facts for a moon explicitly state that it is a moon and identify its host planet. A direct-orbit planet is not described as a moon or "nonmoon", just not mentioned.

## 8. Route endpoint navigation

Route inspection must provide navigation to both endpoint systems, including routes whose endpoints are more than one hex apart.

- A selected route exposes two endpoint controls.
- Each control displays the endpoint system name appropriate to the active GM/player preview.
- Activating a control selects or opens that endpoint system.
- Endpoint navigation is derived through `Route.PortalIds` and `RoutePortal.SystemId`; it must not assume hex adjacency.
- The current contextual “To [other system]” control may remain in a system view, but the route detail UI must expose both endpoints.
- Styling previously removed in git history will be revived. Where or when that styling is applied is TBD.

## 9. POIs

### 9.1 Naming

Generated POI names use:

`<Type>-<lowercase roman numeral>-<ParentObjectName>`

Rules:

- Numbering starts at `i` for each `(parent, POI type)` pair.
- Numbering follows stable generation order.
- The POI's `NiceName` is generated from the parent's `NiceName`.
- The POI's procedural name is generated from the parent's procedural name.
- The POI's `NiceName` remains independently editable.

### 9.2 Generated details

Each POI rolls all random detail columns supplied by its POI table, currently including an occupant and a situation where defined.

- Each column uses an independent deterministic random stream.
- One detail roll cannot be reused for another column.
- Results are persisted in, or rendered into, the POI's GM-only note.
- The GMNote clearly labels each result, for example `Occupants:` and `Situation:`.
- These details are not automatically exposed to players by Basic Scan.

## 10. Water versus ice display

When `BulkComposition` is stored as `Water`, presentation uses:

- `Ice` for `Cryogenic`, `Deepfrozen`, `Polar`, and `Subarctic` worlds.
- `Water` for all warmer temperature categories.

This is display-only. The serialized `BulkComposition` remains `Water`, and generation/habitability rules continue to use that canonical value.

## Acceptance criteria

Step 1 is complete after visual inspection by human dev.

## Drill-down decisions remaining

- Exact star palette and relative sizes.
- Orbital-spacing investigation and readability heuristic.
- Final top-down gas-cloud treatment.
- Exact schema field names for POI placement/details.
