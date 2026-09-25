# Step 2 Specification: Portrait System

We are generating standard images that will be used as portraits of lesser celestial objects in a randomly generated star sector and points of interest within a star system. "Hero" objects will have an alternate generation system and will be out of scope

Global Guideline:
Standard shell - All
- Black Space background with no nebulae, and no other stellar objects other than small background stars. No host star except the star images themselves

## Coverage inventory

### Stars: one bank per `StarType`

1. `A-type` - Emphasize Danger, "Flare Star"
2. `F-type` - Slightly whiter than the Sun
3. `G-type` - Sun-like
4. `K-type` - Slightly orange-r than the Sun
5. `M-type` - Emphasize Small Size, Somewhat Dim
6. `Giant` Emphasize Danger, Larger in Frame
7. `White dwarf` - "Whitish Blue", Emphasize Small Size
8. `Neutron star` - "Cinematic" Bright purple 
9. `Stellar-mass black hole` - "Cinematic" depiction - deep dark red infalling matter, gravitational lensing effects

### Uninhabited planets: one bank per visual type

These should be straightforward as these are just visual reproductions of real world planet types. Ensure that each image is isolated despite many of these worlds being moons irl. 

1. `Mercurian`
2a. `Europan / Plutonic` - Ice
2b. `Europan / Plutonic` - Water World
3. `Lunar`
4. `Ioan`
5. `Titanian`
6. `Martian`
7. `Venusian`
8. `Jovian`
9. `Neptunian`


### Other celestial objects: one bank per `ObjectType`

1. `AsteroidBelt` - From within a dense field of rocky bodies - "Cinematic" not realistic density
2. `KuiperBelt` - From within a dense field of icy bodies - "Cinematic" not realistic density
3. `GasCloud` - More of a shot from within a Nebula of swirling gas - "Cinematic" not realistic density
4. `IndependentStation` - Free floating structure entered in frame, somewhat small (contrast with POI)

 [IndependentStation / Base POI] - No nearby Spaceships or other objects unless specifically directed , no writing

### Points of interest: one bank per `POIType`

General Guidelines for POI images
- POI - POV: Very close in. As if we are doing a spacewalk from the structure and snapped a photo. Structure takes up large fraction of frame. Some of these have implicit stellar objects (ex: asteroid base- asteroid), which is fine.
- POI Human structure "Chroma / Saturation Variation" - In service of these being hueshifted, try to stay to have regions with high chroma and a single hue, and have other areas desaturated. Colored lights are good for this.
- [IndependentStation / Base POI] - No nearby Spaceships or other objects unless specifically directed , no writing

1. `Deep-space station` - Symmetric, cylindrical with spokes
2. `Asteroid base` - Embedded in an asteroid, with docking ports and mining equipment visible
3. `Remote moon base` - Solar Panels and antennae visible - Nondescript lunar surface
4. `Ancient orbital ruin` - Obvious damage, alien or exotic shape
5. `Research base` - landing pads, smokestacks or exhaust pipes, multiple structures in a complex - Nondescript lunar surface 
6. `Asteroid belt` - 1-3 small mining ships interacting with asteroids
7. `Comet base` - Embedded in a comet, with docking ports and mining equipment visible
8. `Comet belt` - 1-3 small mining ships interacting with comets
9. `Gas Mine` - Diamond shaped and blocky human made structure floating in green glass cloud (ambiguous if in a gas cloud or gas giant)
10. `Refueling station` Cube-shaped shaped with cylindrical protrusions (docking ports) and huge gas tanks, free floating in space

POI portraits should emphasize the POI itself 

### Routes

All routes use a route-specific bank. A route portrait is an abstract representation of spike travel or a navigational connection, not a literal view containing endpoint systems.

Route portals reuse the parent route portrait and do not receive a separate bank.


## Bank size and variation workflow

The production target is three accepted base images per standard category. Each accepted base image yields six mandatory runtime variants: base, horizontal flip, color A, color A plus flip, color B, and color B plus flip. Thus a completed three-source bank has 18 variants. A skipped source contributes nothing to the current manifest and can be revisited. There is no selection among variants of an accepted source.

Color A and B are tuned separately for each source with hue, saturation, and value controls. The jig previews CSS hue-rotate, saturate, and brightness approximations. The flip requires no tuning or preview. Downstream code translates each accepted source and its two HSV triplets into the six display variants.

Base images use a 300:170 aspect ratio, currently stored as 1500 × 850 PNGs. The inspector art frame and jig preview are 300 × 170 pixels.

## Local review jig

The local jig is a stateful queue over all source images. It shows one source at a time with base, color A, and color B previews. The reviewer can:

- Tune separate hue, saturation, and value controls for A and B.
- Accept the current source and advance, skip it without accepting, or go back without changing its decision.
- Loop from the last source to the first and back again, revisiting prior decisions and tuning.
- Get a total manifest mapping accepted source paths to their two HSV triplets.

Queue position, decisions, and dial settings persist locally. A skipped or pending source is omitted from the total manifest. The jig checks that source images load at the expected dimensions. It is an asset-production tool, not part of the player-facing application.

## Asset storage and manifest

- Base assets are hosted with the site as static project assets.
- The jig's total manifest contains only accepted source paths and their A/B HSV values; it contains no duplicated image files or derived CSS blocks.
- Downstream translation produces stable variant IDs and styles for app consumption. Every accepted source contributes all six variants.
- Asset filenames are stable and do not contain editable object names.
- Once production is complete, the application validates that every required category has a nonempty bank and that every referenced variant resolves.
- Placeholder assets are listed explicitly rather than masquerading as ordinary random banks.

## Assignment and persistence

Every portrait-bearing entity stores a stable portrait asset ID or manifest key.

- Selection occurs once during generation using the sector's deterministic random source.
- The selected asset belongs to the correct category bank.
- Saving and loading a sector preserves the selection.
- Editing `NiceName`, intelligence text, visibility, or location does not change the portrait.
- The UI does not recompute selection from the object's name or current array position.
- Reroll controls and portrait-reroll operations do not exist.

If a future manual portrait override is added, it is an ordinary edit and not a reroll. That editing workflow is not required by this step.

## UI integration

- The object inspector replaces its current generic art glyph with the assigned portrait.
- Placeholder entities display their explicit placeholder.
- Portraits include useful alt text derived from the entity kind and displayed name; decorative backgrounds remain hidden from assistive technology.
- Missing or corrupt assets fall back to a stable generic category placeholder without changing stored data.
- Portrait loading must not reveal objects that are hidden by existing player visibility behavior.

Portraits do not replace the compact symbolic markers in the sector map, top-down view, or symbolic system track during this step.

## Data-model impact

Add one stable portrait reference to portrait-bearing selectable entities, or define an equivalent typed portrait-assignment map keyed by stable entity ID. The chosen representation must:

- Serialize with the sector.
- Validate that references resolve to known manifest entries.
- Support shared placeholder references.
- Avoid copying image binary data into sector JSON.

No reroll history or generation provenance beyond the selected asset reference is required.

## Acceptance criteria

1. Every listed standard category eventually has three accepted base images and 18 derived variants.
2. Every generated star, uninhabited planet, other celestial object, POI, and route receives a valid stable portrait reference.
3. Inhabited worlds and the player ship always receive their explicit placeholders.
4. Route portals display the parent route portrait when inspected.
5. The same seed and inputs produce the same initial portrait assignments.
6. Save/load and ordinary edits preserve assignments.
7. There is no portrait-reroll action.
8. Inspector portraits obey player visibility and provide appropriate fallback and accessibility behavior.
9. The local review jig verifies source dimensions and exports only accepted sources with two HSV triplets each.
10. Automated validation fails clearly when a required manifest category or referenced asset is missing.

## Drill-down decisions remaining

- Final image compression target.
- Final directory and manifest format.
- Whether manual portrait replacement belongs in this phase or a later editing phase.
