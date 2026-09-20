# Part 5 — Merged Generator Implementation Specification

This document expands Part 5 of [MERGE_GAMEPLAN.md](MERGE_GAMEPLAN.md). It
specifies only the implementation of the canonical merged generator; Parts 1–4
establish its schema, invariants, and stochastic validation harness.

## Objective and constraints

Add this public API:

```ts
export function generate(seed: string): Sector
```

The returned value must be a complete `merged-v1` `Sector`, not `SectorV3`,
`SectorV4`, or a lossy wrapper around either one. Generation must be pure and
deterministic: the same code and seed produce a deeply equal sector. The old
`generateSector()` and V4 visualizer remain operational during Phase 1; replacing
their consumers belongs to the UI track.

`checkAllInvariants` is a test oracle, not part of generation. In particular,
the implementation must not:

- call `checkAllInvariants` from production generation and retry or alter the
  sector until it passes;
- generate a legacy V4 sector and add arbitrary defaults merely to satisfy the
  merged shape;
- catch a failed completed sector and silently regenerate it;
- special-case Stochastic Success seeds or weaken an invariant to admit output;
- repair references, cardinalities, or physical facts in a final cleanup pass.

Bounded sampling within a rule table is acceptable, but whenever constraints
can make outcomes unavailable, select from a prefiltered set of feasible
candidates. An empty candidate set is an implementation error containing the
seed and entity path, not a reason to loop indefinitely.

## Implementation layout

Keep the new generator separate from the 955-line legacy `sector.ts`. Use these
modules, or equivalently narrow modules with the same responsibilities:

| Module | Responsibility |
| --- | --- |
| `generation_rules.ts` | Runtime categorical maps shared by generation and validation: habitability, ranks, tag constraints, POI host compatibility, star/temperature AU bands, and canonical adapters for reviewed JSON data. |
| `generation_random.ts` | Namespaced seeded PRNG creation, dice and weighted-table selection, shuffling, angle generation, and deterministic ID creation. |
| `generate_inhabited_planet.ts` | Constraint-aware tag and inhabited-profile selection; returns a complete canonical terrestrial `Planet`. |
| `planet_templates.ts` | Typed internal templates that expand legacy extra-world archetypes into complete uninhabited canonical planets. Templates never appear in serialized output. |
| `generate_system.ts` | Star, inhabited planets, moons/parents, extra objects, POIs, and final AU placement for one system. |
| `generate_routes.ts` | Route graph, paired route portals, portal angles, and initial player-ship placement. |
| `generate.ts` | Public orchestration only; assembles and returns the canonical `Sector`. |

Move duplicated rule constants out of `invariants.ts` into
`generation_rules.ts` rather than copying them. Both the validator and generator
may consume the same authoritative tables, while their control flow remains
independent. Keep validator-only traversal and error reporting in
`invariants.ts`.

Use a namespaced random stream for each stable entity path, such as
`<seed>:system:07:pois`. This prevents a new roll in one system from changing
every later system and makes a failure reproducible at a smaller scope. IDs must
also be deterministic and globally unique. They should be created from the seed
plus a semantic entity path, in a UUID-shaped or equally opaque stable form;
array position alone must not be used as a cross-type global ID.

## Canonicalize the reviewed source data first

Before building sectors, add typed adapters and tests for the differences
between the reviewed legacy data and the merged contract:

- Map the three consecutive legacy `Temperate` rows to
  `Temperate (chilly)`, `Temperate`, and `Temperate (warm)` in increasing heat
  order. Do not collapse them back to one value.
- Map the misspelled legacy `KupierBelt` archetype to canonical
  `KuiperBelt`; never serialize the misspelling.
- Map star-table `result` and `hab` to `StarType` and
  `HabitabilityRating`; generation rolls and `habitableSlots` are not output.
- Remove alien-dependent tags from the candidate set because the canonical
  generator does not generate a sapient-alien branch.
- Treat roll spans as weights. If constraints remove rows, renormalize across
  the remaining rows rather than giving each remaining row equal probability.
- Use the AU intervals consumed by `checkAllInvariants` as the authoritative
  star/temperature bands. Do not independently reinterpret the old symbolic
  V4 zones in the generator.

Add a table-integrity test proving that every runtime category emitted by an
adapter belongs to the corresponding union in `merged_schema.ts`, every d100
table covers 1–100 exactly once, and every canonical star/temperature pair used
for a direct orbit has a nonempty open AU interval. Compact-remnant stars have
zero-width normal-temperature bands, so their direct objects must be limited to
temperatures with usable bands rather than placed at a forbidden boundary.

## Construction order

Generation proceeds in the following order. Later stages may consume facts
from earlier stages, but they may not rewrite those facts to make them valid.

1. **Sector scaffold**
   - Roll `1d10 + 20` systems.
   - Shuffle the 80 cells of the authoritative 10-column by 8-row grid and
     take the required number. This guarantees unique, in-bounds hexes without
     an open-ended collision loop.
   - Create the sector, system, and star identities and initial selectable
     metadata.
2. **Stars and inhabited planets**
   - Select each star from the reviewed weighted star table before completing
     its planets. The removed habitable-slot mechanic must not influence the
     result.
   - Roll one through three inhabited planets with the existing 85% / 10% / 5%
     distribution.
   - Construct each inhabited planet with the constraint solver below. Decide
     whether it is a gas-giant moon using the reviewed moon table; if so, create
     its complete uninhabited gas-planet parent immediately.
3. **Extra objects and points of interest**
   - Roll the POI target (`1d4 + 1`) and the legacy extra-object target
     (`max(2, 1d6)`) before filling either collection.
   - Gas-planet parents already created for inhabited moons count as extra
     objects. Raise the target, when necessary, to leave enough legal POI-host
     capacity; never exceed seven total non-inhabited objects.
   - Expand extra-world templates into complete planets or other celestial
     objects. Ensure at least two ordinary POI-capable hosts when the POI count
     requires them. Existing gas giants with inhabited moons do not provide
     POI capacity.
   - Generate each POI only from the currently feasible `(POI type, host)`
     pairs. Enforce the three-POI-per-object cap during selection. A
     `Deep-space station` instead creates one direct-orbit
     `IndependentStation`, consumes one remaining extra-object slot, and is its
     sole POI. If no object slot remains, that POI row is not a feasible choice.
4. **Orbits**
   - Choose direct-object temperatures only from values allowed for that object
     class and having a nonempty AU band for the selected star.
   - Group direct objects by detailed temperature. Split each temperature's
     open AU band into one subinterval per object, shuffle objects within the
     group, and sample once inside each subinterval. This preserves randomness,
     keeps values strictly inside the band, makes equal-temperature AUs
     distinct, and guarantees hotter direct objects are closer than colder
     ones.
   - A moon inherits its parent's `Temperature` and star-relative `AU`, keeps
     its own angle, is smaller than its parent, and cannot receive children.
     Direct-orbit objects receive angles in `[0, 360)`.
   - Set `TidallyLocked` to true exactly for planets directly orbiting an
     M-type star. A moon is false under the present canonical rule.
   - Serialize `Objects` in nondecreasing star-relative AU, with a stable
     parent-before-child tie break.
5. **Routes and portals**
   - Build a connected route backbone over all systems, favoring short hex-map
     distances with a seeded tie-breaker. Add a modest number of unique extra
     short links (default: `ceil(systemCount / 4)`) so the result is not only a
     minimally passing tree.
   - Create exactly two top-level portals per route. Each portal reciprocally
     names its route and one endpoint system; no route connects a system to
     itself and no system pair is repeated.
   - Derive an initial portal bearing from the direction to the other endpoint,
     add a small seeded offset, normalize it to `[0, 360)`, and use a
     deterministic probe if that system already has the angle. Portal boundary
     AU is derived by the future UI and is not serialized.
6. **Player ship and root assembly**
   - Create one player ship and initially place it at the first system's star.
     This is a valid system-contained selectable location and avoids inventing
     campaign progress.
   - Return `SchemaVersion: "merged-v1"`, the unchanged `OriginalSeed`, a
     deterministic sector name, and the completed collections. Do not serialize
     rolls, legacy slots/zones, archetype names, descriptions, or helper state.

## Inhabited-planet constraint solver

Do not port the legacy sequence of repeated 10,000-attempt loops. Implement a
forward-checking builder that selects only values for which at least one full
completion remains.

1. Build all distinct, non-alien tag pairs and discard pairs whose combined
   atmosphere, environmental-Hab, biosphere, population, technology, water, or
   special semantic requirements have no intersection.
2. Choose a viable pair with the original tag weights.
3. Select atmosphere, detailed temperature, native biosphere, Terran
   biosphere, terrestrial size, and rocky bulk composition from weighted source
   rows, filtering after every selection for at least one valid completion.
4. Calculate `TotalHab` as the minimum of star, atmosphere, temperature,
   Terran-biosphere, size, and bulk-composition Hab contributions.
5. Select population and technology only from categories whose requirements
   are at most `TotalHab` and which satisfy both tags. Enforce the explicit
   Desert World, industry, Outpost World, Tomb World, and Abandoned Colony
   semantics as part of candidate feasibility, not afterward.
6. Resolve surface water in this precedence order: cryogenic/volcanic or vacuum
   forces false; otherwise water composition or an Oceanic/Seagoing tag forces
   true; otherwise roll the reviewed surface-water table. A tag pair or physical
   profile that demands both true and false is not feasible.
7. Emit only canonical categorical values and `InhabitedInfo`; rolls, row Hab
   values, civilization tier, special states, and completion-cache data remain
   internal.

Memoize feasibility by star Hab, allowed-temperature set, tag pair, and partial
profile. Unit-test this solver directly with difficult fixed cases: Hab-0
compact remnants, low-tech worlds, Tomb/Abandoned population, industry tags,
Oceanic versus vacuum, Desert versus water composition, and both tags applying
simultaneously.

## Complete uninhabited objects

Legacy archetypes are internal templates, not output kinds. Encode each as a
typed set of allowed canonical facts and then make a weighted choice within the
set. At minimum, the mapping must preserve these anchors:

| Legacy template | Canonical expansion anchor |
| --- | --- |
| Mercurian | Luna/Mars-sized, metal-rich, airless terrestrial planet |
| Europan / Plutonic | Luna/Mars-sized, water-rich cold planet |
| Lunar | Luna-sized rocky, airless planet |
| Ioan | Luna/Mars-sized sulfur-rich volcanic planet |
| Titanian | Small carbon/volatile-rich cold planet with non-breathable atmosphere |
| Martian | Mars-sized rocky planet with vacuum or thin/thick atmosphere |
| Venusian | Earth/Super-Earth rocky hot planet with hostile atmosphere |
| Jovian | Jupiter size plus Jovian Gas composition |
| Neptunian | Neptune size plus Neptunian Gas composition |
| AsteroidBelt | `OtherCelestialObject` with `ObjectType: "AsteroidBelt"` |
| KupierBelt | `OtherCelestialObject` with `ObjectType: "KuiperBelt"` |
| GasCloud | `OtherCelestialObject` with `ObjectType: "GasCloud"` |

Every planet template must populate size, composition, surface water,
atmosphere, detailed temperature, native biosphere, tidal lock, orbit, and
`InhabitedInfo: false`. Jupiter and Neptune sizes always receive their matching
gas composition and no surface water. Other-object temperature domains must
match F12. An uninhabited terrestrial extra may become a gas-planet moon only
when it is smaller than the parent, the parent has fewer than two moons, and it
can inherit the parent's temperature.

## Selectable metadata

All systems, stars, system objects, POIs, routes, portals, and the player ship
must be created through one selectable-entity factory so none omit shared
fields. During Phase 1:

- use deterministic, nonblank procedural names and initialize `NiceName` to the
  same value;
- default `VisibilityLevel` to `NONE`;
- populate `InfoboxSummary` and `BasicScan` with concise factual text derived
  from structured fields;
- use the selected world-tag descriptions/prompts for inhabited-world culture
  and GM text where applicable;
- leave a tier empty only when there is genuinely no source fact for it.

This is baseline data, not a second lore generator. Rich naming and editorial
presentation can be improved in the UI phase without changing physical facts.

## Incremental implementation and tests

Implement in reviewable slices; do not write the whole generator before running
it:

1. shared rules, canonical data adapters, deterministic RNG/ID helpers, and
   their unit tests;
2. the inhabited-planet solver and adversarial fixed tests;
3. one-system object/parent/AU generation and focused orbital tests;
4. extra-object/POI construction and station/host-capacity tests;
5. sector grid, route/portal graph, selectable metadata, and player ship;
6. public `generate(seed)`, deterministic snapshots/fixtures, and Stochastic
   Success.

Add a small permanent regression-seed corpus whenever a random failure exposes
a real bug. A regression test should assert the relevant rule and retain the
seed; it should not snapshot an entire large sector unless the whole serialized
shape is the behavior under test.

At minimum, automated coverage must prove:

- same seed produces deep-equal output and different seeds affect generated
  facts;
- IDs are stable and globally unique;
- 10×8 hex bounds and cardinalities are correct;
- the three Temperate variants survive generation;
- compact-remnant systems never use a zero-width direct-orbit band;
- equal-temperature direct objects get distinct in-band AUs, while moons inherit
  parent AU and temperature;
- every uninhabited template emits a complete canonical record;
- POI host compatibility, per-host capacity, and independent-station ownership
  are constructive guarantees;
- the route graph is connected, route/portal references are reciprocal, and
  per-system portal angles are distinct;
- the generated player-ship location resolves;
- `checkAllInvariants(generate(seed))` returns no violations.

## Review decisions before coding

The schema and invariants do not completely determine three product choices.
This specification uses the following defaults so implementation can start, but
they should be confirmed at the Part 5 review gate:

1. Routes form one connected, distance-favoring backbone plus
   `ceil(systemCount / 4)` extra links. The current contract only requires every
   system to have a route; it does not define topology or density.
2. The uninhabited-planet template anchors above are the approved physical
   interpretation of the old descriptive archetypes. The old data does not
   provide complete canonical planet facts.
3. Phase 1 names and intelligence text are deterministic and factual. A richer
   naming or lore-generation system is deferred to Phase 2.

## Verification and completion gate

Run, in order:

```sh
npx vitest run src/generators/swn_sector/generate*.test.ts
npx vitest run src/generators/swn_sector/invariants.meta.test.ts
npx vitest run src/generators/swn_sector/stochastic_success.test.ts
STOCHASTIC_SUCCESS_SECTOR_COUNT=100 npx vitest run src/generators/swn_sector/stochastic_success.test.ts
npx tsc --noEmit
npm run build
```

Part 5 is complete only when these pass without production calls to the
invariant checker, the legacy generator still passes its existing tests, and a
saved generated sector contains no legacy-only fields or unknown canonical
properties. Every Stochastic Success failure must print its seed and complete
violation list; diagnose and fix the producing stage, then retain the seed when
it represents a useful regression case.
