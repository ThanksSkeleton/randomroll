# Step 2 Specification: Portrait System

## Status and intent

This specification defines a stable, hosted portrait system for generated sector entities. Portraits provide consistent symbolic flavor. They are not canonical illustrations of specific campaign locations.

Portrait assignment occurs during sector generation, is persisted, and is not rerolled.

## Visual direction

All image-bank artwork must:

- Use one coherent symbolic or stylized visual language.
- Center the target object in the frame.
- Include enough color to support useful hue variants.
- Avoid text, labels, logos, or interface chrome.
- Avoid unrelated stars, planets, ships, structures, or other objects that might contradict the generated sector.
- Avoid unique landmarks or implied civilizations unless the category itself requires a structure.
- Remain readable at the final inspector-card size.

Portraits are category illustrations. A `Martian` portrait communicates the class of world, not the exact appearance of a particular named planet.

## Coverage inventory

### Stars: one bank per `StarType`

1. `A-type`
2. `F-type`
3. `G-type`
4. `K-type`
5. `M-type`
6. `Giant`
7. `White dwarf`
8. `Neutron star`
9. `Stellar-mass black hole`

### Uninhabited planets: one bank per visual type

1. `Mercurian`
2. `Europan / Plutonic`
3. `Lunar`
4. `Ioan`
5. `Titanian`
6. `Martian`
7. `Venusian`
8. `Jovian`
9. `Neptunian`

The persisted planet visual classification introduced in Step 1 is authoritative for bank selection.

### Other celestial objects: one bank per `ObjectType`

1. `AsteroidBelt`
2. `KuiperBelt`
3. `GasCloud`
4. `IndependentStation`

### Points of interest: one bank per `POIType`

1. `Deep-space station`
2. `Asteroid base`
3. `Remote moon base`
4. `Ancient orbital ruin`
5. `Research base`
6. `Asteroid belt`
7. `Comet base`
8. `Comet belt`
9. `Gas Mine`
10. `Refueling station`

POI portraits should emphasize the POI itself rather than repeat the host world's portrait.

### Routes

All routes use a route-specific bank. A route portrait is an abstract representation of spike travel or a navigational connection, not a literal view containing endpoint systems.

Route portals reuse the parent route portrait and do not receive a separate bank.

### Explicit placeholders

- Every inhabited planet or moon uses the inhabited-world placeholder until a human-created image is supplied out of band.
- The player ship uses the ship placeholder until a human-created image is supplied out of band.
- A star system uses its star's portrait rather than a separate system bank.

## Bank size and variation workflow

The target is 12 approved images per standard category.

The current source plan also calls for three AI-generated bases, horizontal flips, and two human-tuned hue shifts. Taken literally, retaining every original and every variation would produce 18 images, not 12. Before asset production, choose and document a precise 12-image recipe.

Candidate recipe that preserves all stated techniques:

1. Generate three base images.
2. Create one horizontal flip of each, producing six compositions.
3. For each composition, retain the original plus one selected human-tuned hue shift, producing 12 approved images.

The second proposed hue angle can be reviewed in the local jig but would not enter the final bank under this recipe. This recipe is a proposal, not yet a settled decision.

## Local review jig

Create a local HTML review tool for semi-manual asset preparation. It must allow a human reviewer to:

- Select an object category.
- View each source image and its flipped version.
- Preview the candidate hue shifts.
- Compare variants at the application's actual portrait size.
- Mark exactly the variants accepted into the final bank.
- Detect duplicate filenames, missing variants, incorrect dimensions, and an incorrect final bank count.

The jig is an asset-production tool, not part of the player-facing application.

## Asset storage and manifest

- Final assets are hosted with the site as static project assets.
- Each bank has a manifest containing its category key and ordered portrait asset IDs or paths.
- Asset filenames are stable and do not contain editable object names.
- The application validates that every required category has a nonempty bank and, once production is complete, exactly 12 approved images.
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

1. Every listed standard category has a manifest entry and approved image bank.
2. Every generated star, uninhabited planet, other celestial object, POI, and route receives a valid stable portrait reference.
3. Inhabited worlds and the player ship always receive their explicit placeholders.
4. Route portals display the parent route portrait when inspected.
5. The same seed and inputs produce the same initial portrait assignments.
6. Save/load and ordinary edits preserve assignments.
7. There is no portrait-reroll action.
8. Inspector portraits obey player visibility and provide appropriate fallback and accessibility behavior.
9. The local review jig verifies the final count and integrity of each bank.
10. Automated validation fails clearly when a required manifest category or referenced asset is missing.

## Drill-down decisions remaining

- Approve the exact 12-image variation recipe.
- Image dimensions, aspect ratio, format, and compression target.
- Final directory and manifest format.
- Whether manual portrait replacement belongs in this phase or a later editing phase.
