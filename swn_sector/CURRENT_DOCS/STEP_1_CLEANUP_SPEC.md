# Step 1 Specification: Cleanup, Bugs, and Simple Elaborations

## Status and intent

This specification defines the first implementation phase. Its purpose is to make the existing generated sector legible, internally consistent, and visually informative before adding portraits, starting-world logic, or politics.

The current canonical entities, visibility levels, IDs, names, intelligence fields, and GM/player preview behavior remain in place unless this specification explicitly changes them.

## Scope

1. Star and planet presentation.
2. Orbit spacing for physical validity and UI readability.
3. Belt and gas-cloud rendering.
4. Inhabited-world summary ratings.
5. Symbolic-view layout cleanup.
6. Moon rendering, description, and naming.
7. POI naming and generated details.
8. Temperature-sensitive display of water composition.

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

### Status

A modest physical-placement fix has been applied: direct-orbit AU values now
respect the star's forbidden inner and outer regions, inhabited planets retain
temperature-table placement, and other direct objects use their approved AU
ranges with temperature derived from the selected AU. Moon AU values continue
to inherit from their parent. The more difficult work of designing a robust
system for spacing AU values and angles for readability is intentionally
deferred. See [Step 1 Part 3: Deferred Orbital Spacing Work](STEP_1_PART_3_ORBITAL_SPACING_DEFERRED.md).

### 3.1 Stored AU spacing

This requires investigation.

### 3.2 Angular spacing

- Direct-orbit objects should receive angles that make a best-effort attempt to prevent overlapping markers and labels in the top-down view under normal desktop layout.
- Multiple moons around one parent should receive a best-effort readable angular placement.
- Route portal angles remain governed by route bearing and are not moved to satisfy planet spacing.
- Angular layout remains deterministic for a seed.

Readability is a best-effort heuristic, not a hard requirement.

## 4. Belts and gas clouds

### 4.1 POI angles

- Every POI has a persisted `AngleDegrees` field generated deterministically in `[0, 360)`.
- POI `ProceduralName` and `NiceName` use `{ParentObjName}:{Type}`, with each variant using its matching parent name variant.
- The angle places a gas-cloud or belt POI on a star-centered radial line at the host object's AU radius. It does not change the POI's parent relationship.
- The exact placement treatment is defined with each host type: belt POIs use the annulus in 4.2, and gas-cloud POIs use the treatment in 4.3.

### 4.2 Asteroid and Kuiper Belts

- In the top-down view, an `AsteroidBelt` and `KuiperBelt` are rendered as donut-shaped annular bands centered on the star, not as planet-like point markers.
- Each belt's visual and hit region use an outer circular boundary minus an inner circular cutout. The annulus centerline sits at that object's AU radius; belt width is cosmetic and does not alter AU or orbital calculations.
- The annulus body uses a repeating Swiss cross pattern. Asteroid belts use brown, and Kuiper belts use light blue; their appearances are configured independently.
- Baked top-down appearance: asteroid belts use a 15 px width, 6 px cross spacing, `#b98958`, and 50% opacity; Kuiper belts use a 24 px width, 33 px cross spacing, `#8fd8ed`, and 50% opacity.
- Belt rendering and cosmetic width apply only in the top-down view.
- No dotted orbit line is drawn for belts. The whole donut body is selectable with an accessible label, and a selected belt has inner and outer outlines.
- The symbolic representation is TBD.

### 4.3 Gas Clouds

- In the top-down view, a shell-sized rectangular pattern layer is masked by the central system hex, with the disk inside the gas cloud's stored AU radius cut out. The visual mask and hit region use the same geometry.
- The cloud uses dark purple Swiss crosses at 25% opacity on a transparent background. Its shell-sized overlay is clipped to the central system hex and the cloud’s AU radius, and renders beneath stars, planets, belts, and other selectable objects.
- Gas clouds do not show a dotted orbit line or a top-down pentagon glyph. The patterned region itself is the accessible selection target; there is no separate point hit target.
- The symbolic view represents a gas cloud with four purple Swiss crosses.

## 5. Inhabited-world summary

Every inhabited planet or moon shows habitability, population, and tech level in the symbolic view. Habitability is a solid circle: rating 0 is gray, 1 red, 2 yellow, and 3 green. Population is shown as one white bust-up human glyph per population tier (tiers 1–5); glyphs overlap with spacing narrower than the glyph width. Tech level remains numeric: ratings 0–3 are white, 4 and 4.1 are blue, and 5 is light purple. Uninhabited worlds show no inhabited-world summary row.

## 6. Symbolic-view layout

The symbolic track fits the object grid’s natural content height without adding extra minimum-height space.

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

## 8. POIs

### 8.1 Naming

Generated POI names use:

`<ParentObjectName><lowercase Roman numeral>:<Type>`

Rules:

- Numbering starts at `i` for each parent and increments across all of that parent's POIs, regardless of POI type.
- Numbering follows POI generation order. The specific order is arbitrary, but it is stable for a seed.
- The POI's `NiceName` is generated from the parent's `NiceName`.
- The POI's procedural name is generated from the parent's procedural name.
- The POI's `NiceName` remains independently editable.
- Before final naming, each POI receives a deterministic random four-digit temporary name in the form `<four digits>-TEMP`. Final generated output replaces this temporary name.

### 8.2 Generated details

Each POI rolls all random detail columns supplied by its POI table, currently including an occupant and a situation where defined.

- Each column uses an independent deterministic random stream.
- One detail roll cannot be reused for another column.
- Results are persisted in the POI's `Intelligence.GM` note.
- The GM note gives each result its own labeled line, for example `Occupants: <result>` and `Situation: <result>`.
- These details are not copied into `Intelligence.BasicScan` or automatically exposed to players by Basic Scan.

## 9. Water versus ice display

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
- Exact schema field names for POI details.
