# SWN Sector: First Canonical Projection Refactor

## Status and intent

This is a small first slice of the architecture in
`temp/canonical-generation-projection-architecture.md` and its toy example.
It covers planet facts shown in the symbolic system view and object inspector.
It does not claim that the whole sector UI has moved to a Display DTO.

The target flow for this slice is:

```text
raw generation data -> generator -> canonical Sector
                                      |
                                      v
                         pure planet projector + projection data
                                      |
                                      v
                           planet Display DTO -> UI
```

Generation may happen when the sector is first created or later in response to
an action. In either case, the action updates canonical state through generation,
and the projector then creates a new display value. Chronology is not the rule;
the direction of data flow is.

## Scope

Two steps, each independently reviewable:

1. Introduce a pure planet projection and use it for the symbolic world's
   summary and the inspector's generated planet facts.
2. Remove the canonical values that this slice proves can be reconstructed,
   then update generation and validation accordingly.

The sector's IDs, names, editable intelligence text, scan visibility, generated
world tags, population, technology, orbital placement, and random portrait
selection remain canonical facts. The first step does not change the sector
schema. The second step changes it only for the fields named below.

## Step 1: Establish the projection boundary for planet facts

### Base and display contracts

Keep the current `Sector` as the base input during this step. Define an explicit
`PlanetDisplayDTO` (or equivalent named read model) for the covered UI content.
It should hold copied facts needed by the views and projected facts such as:

- displayed composition (`Water` or `Ice`);
- planet color or class;
- numeric technology rating and population tier;
- habitability rating and its presentation color;
- generated planet stock text for Basic, Detailed, Politics, Deep Politics,
  and GM views, including moon-host and polity-claim wording where applicable.

The projector accepts the canonical sector, planet ID, and any explicit
projection context needed for names or preview. It returns a value without
mutating its inputs, generating IDs, selecting random outcomes, reading app
state, or changing visibility. Projection mappings needed for these results
must be deterministic and must not import weighted generation tables into UI
components.

Move the covered domain and content derivations out of `SymbolicSystem.tsx` and
`DetailBar.tsx`. Those components should render the projected fields for this
slice. They may still receive canonical sector data for unrelated behavior
until later slices migrate it. Keep markup, interaction, sizing, and CSS in UI.

### Acceptance criteria

1. The same canonical input and projection data produce deeply equal display
   output across repeated calls, with no mutation of the input.
2. Symbolic world ratings and generated planet inspector text match the current
   visible behavior for inhabited worlds, uninhabited worlds, and moons, in GM
   and player preview at the relevant scan levels.
3. The covered UI code does not calculate habitability, population tier,
   technology rating, displayed composition, or planet stock content itself.
4. No random selection occurs in the projector or UI rendering path.

## Step 2: Slim the canonical planet and star model

Once Step 1 uses the projector, remove these fields from generated and held
canonical sectors:

- `Planet.InhabitedInfo.TotalHab`: derive it from star habitability and the
  planet's atmosphere, temperature, Terran biosphere, size, and composition;
- `Planet.TidallyLocked`: derive it from the parent orbit and star type;
- `Star.HabitabilityRating`: derive it from `StarType` and a deterministic
  star-type interpretation mapping.

Generation may still calculate these values locally to validate or constrain
its choices. They must not be emitted into the Base DTO. Put the reusable
interpretation mappings and calculations on the projection side, with a
generation-side use of the same deterministic domain rule where needed; do not
make the generator depend on a UI read model. Keep raw weights and probability
tables on the generation side.

Update sector validation so it checks the underlying canonical inputs and
constraints without requiring the removed fields. Update all runtime reads,
types, and fixtures. The current prototype keeps sectors in memory and has no
disk persistence boundary; this step does not add one. Update `SchemaVersion`
if it is intended to identify this changed contract.

### Acceptance criteria

1. Newly generated canonical sectors contain none of the three removed fields.
2. The projector still returns the same habitability and tidal-locking values
   for the same canonical star and planet facts.
3. Generator constraints and validation produce the same valid sector outcomes
   for fixed seeds, apart from the removed fields and any documented schema
   version change.
4. A sector can be generated, projected, displayed, edited through existing
   supported controls, and projected again without storing derived fields.

## Boundary for later slices

This feature does not move routes, politics, culture, portraits, or the entire
sector UI to Display DTOs. A later slice should apply the same pattern to
those areas and remove direct canonical-model consumption from the remaining
UI. A button-triggered action such as world completion is allowed: the action
must update canonical state through generation, followed by projection before
the UI consumes the new result.
