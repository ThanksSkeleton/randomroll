# Phase 1 Step 2a — Existing and Obvious Invariants

Running inventory of invariants retained from the existing SWN generator and
its tests after review. Rejected items have been removed from this list. The
remaining items are either accepted, accepted with modifications, or need to
be split and elaborated before implementation.

This document is limited to rules recoverable from the old implementation and
output behavior. New or broader science-fiction domain rules belong in the
Phase 1 Step 2b list.

## Evidence and status

- **Accepted** — retain as a merged-generator invariant.
- **Modified** — retain the underlying rule, adapted to the merged schema.
- **Elaborated** — decomposed into an independently testable rule; exact
  lookup tables or test fixtures may still be needed during implementation.
- **Push to 2b** — no longer treated as an existing/obvious invariant; revisit
  as part of the broader domain pass.

Source references point to the old implementation and are evidence for the
rule, not requirements to preserve the old fields or representation.

## Sector-level invariants

| ID | Status | Invariant | Evidence |
| --- | --- | --- | --- |
| 2A-04 | Accepted | A generated sector contains 21 through 30 systems. | `starCount = rollDie(rng, 10) + 20` in `src/generators/swn_sector/sector.ts:836`; systems are created from that count at `sector.ts:838-888`. |
| 2A-05 | Accepted | The sector’s system count equals the count represented by its systems collection. | Both old values are derived from the same `plans` array at `sector.ts:836-888`; this should become an explicit merged-schema check. |
| 2A-07 | Accepted | System hexes are unique. | `randomEmptyHex` checks and updates the `occupied` set at `sector.ts:820-829`; each generated system receives one unique hex. |
| 2A-08 | Accepted | Hex coordinates are integer grid positions within the authoritative merged grid bounds. | The old generator rolls integer coordinates from `SECTOR_GRID` at `sector.ts:820-822`. The old bounds are column 1–8 and row 1–10; the merged schema proposes the intended 10×8 grid and must establish the final orientation. |
| 2A-09 | Accepted | The serialized sector contains no unknown properties outside the schema contract. | `additionalProperties: false` is used throughout `swn_sector/sector_v4.schema.json`; the merged contract should retain strict decoding/validation. |

## World-count, identity, and selection invariants

| ID | Status | Invariant | Evidence |
| --- | --- | --- | --- |
| 2A-10 | Accepted | Every system has one to three generated inhabited worlds. | `worldCountForSystem` returns 1, 2, or 3 at `sector.ts:566-575`; plans use that count at `sector.ts:838-846`; V3 validation requires a non-empty world list at `sector.ts:723-727`. |
| 2A-11 | Accepted | Each inhabited world has a unique identity within its system and a valid position in that system’s world collection. | World IDs are constructed from system identity and order at `sector.ts:850-865`; old output bounds `order` to 1–3 in `sector_v4.schema.json`. The merged implementation should express this without relying on the old ID string format. |
| 2A-13 | Accepted | Each inhabited world has exactly two different world tags. | `selectTags` returns a two-element tuple and excludes a second tag with the same roll at `sector.ts:529-539`; `isV2WorldValid` checks the two rolls differ at `sector.ts:770-772`. The merged form uses the `WorldTags` tuple, without preserving tag rolls. |
| 2A-16 | Accepted | The selected pair of world tags must have at least one valid completion of the constrained inhabited-world attributes. | `compatibleSecondTags` and `selectTags` call `hasValidCompletion` at `sector.ts:529-539`; each attribute is rolled through `rollConstrainedAttribute` at `sector.ts:541-556`. |

## Planet and inhabited-world invariants

| ID | Status | Invariant | Evidence / merged interpretation |
| --- | --- | --- | --- |
| 2A-17a | Modified | Every planet has complete uninhabited-planet data: identity, orbit, kind, size, bulk composition, surface-water state, tidal-lock state, atmosphere, temperature, and native biosphere. | The old world/planet output contains physical data in `buildWorld` at `sector.ts:620-719`. The merged generator must populate the universal `Planet` fields for both inhabited and uninhabited planets. |
| 2A-17b | Modified | Every inhabited planet has complete inhabited-world data, and every uninhabited planet has `InhabitedInfo: false` rather than partial or fabricated inhabited data. | The merged schema makes `InhabitedInfo` a discriminated `InhabitedInfo | false` branch. The old generator has no uninhabited branch, so this is the explicit structural change required during translation. |
| 2A-19a | Elaborated | If a selected world tag has a maximum-atmosphere rank requirement, the inhabited planet’s atmosphere rank must be at or below that inclusive maximum rank. | The old `allowsAtmosphere` check used an inclusive cutoff at `sector.ts:377-381`; the merged rule uses a defined rank for each categorical atmosphere value. The merged test must use the categorical atmosphere value and must not require an output roll. |
| 2A-19b | Elaborated | If a selected world tag has a minimum-native-biosphere rank requirement, the inhabited planet’s native-biosphere rank must be at or above that inclusive minimum rank. | The old `allowsNativeBiosphere` check used a cutoff at `sector.ts:382-386`; the merged rule uses a defined rank for each categorical `NativeBiosphere` value and a static lookup. |
| 2A-19c | Elaborated | If selected world tags specify population rank bounds, the inhabited planet’s population category must satisfy every inclusive minimum and maximum rank requirement. | The old `allowsPopulation` check applied both inclusive bounds at `sector.ts:387-399`; the merged rule uses defined ranks for population categories. Alien-specific branches are removed because alien scenarios are no longer part of the generator. |
| 2A-19d | Elaborated | If a selected world tag specifies a minimum technology level, the inhabited planet’s tech category must meet or exceed it. | `allowsTech` compares the source tech value at `sector.ts:400-402`; the merged test should map the categorical `TechLevel` to the static numeric requirement without serializing TL values. |
| 2A-19e | Elaborated | Both tags’ constraints apply. | All tag rules are collected by `rulesForTags` at `sector.ts:370-375` and checked with `.every(...)` in the individual `allows*` functions. The expanded tests should include combined-tag cases for each constraint family. |
| 2A-21a | Modified | An inhabited planet’s `TotalHab` is derived from all relevant habitability-providing facts, including the system star and the planet’s physical facts. | The old planet calculation takes the minimum of atmosphere, temperature, Terran biosphere, terrestrial size, and bulk composition at `sector.ts:692-697`; star habitability is checked separately at `sector.ts:723-736`. The merged design must decide and document the complete `HabProvided` set from the schema addendum, including the star contribution. |
| 2A-21b | Modified | `TotalHab` is a valid result of the selected categorical values; it is not an independently invented value. | The old generator derives habitability from table data and validates the recomputed value at `sector.ts:800-812`. The merged test should use static maps from star type and planet categories, not source rolls, sub-hab fields, or serialized rows. |
| 2A-22a | Elaborated | An inhabited planet’s `TotalHab` must meet the population habitability requirement implied by its `Population` category. | `allowsHab` compares calculated habitability with the population row’s `habRequired` at `sector.ts:404-425`; the merged test should compare categorical population and `TotalHab`. |
| 2A-22b | Elaborated | An inhabited planet’s `TotalHab` must meet the technology habitability requirement implied by its `TechLevel` category. | `allowsHab` compares calculated habitability with the tech row’s `habRequired` at `sector.ts:404-425`; the merged test should compare categorical tech level and `TotalHab`. |
| 2A-22c | Elaborated | An inhabited planet’s `TotalHab` must meet the Terran-biosphere requirement implied by its `TerranBiosphere` category. | `allowsHab` checks the Terran-biosphere requirement at `sector.ts:413-421`; the merged test should use the categorical biosphere value and its static requirement. |
| 2A-22d | Elaborated | The selected physical planet categories must provide enough habitability for all inhabited-world requirements; no compatible planet may be emitted with an insufficient physical combination. | The old compatible terrestrial-size and bulk-composition loops use `allowsHab` at `sector.ts:426-465`. The merged test should verify the category combination directly; removed sub-hab fields are not output requirements. |
| 2A-28a | Accepted | Cryogenic or volcanic temperature forces `SurfaceWaterPresent` to `false`. | `surfaceWaterOverride` at `sector.ts:309-317`; generation and validation apply the override at `sector.ts:330-353,683-688`. |
| 2A-28b | Accepted | Vacuum atmosphere forces `SurfaceWaterPresent` to `false`. | `surfaceWaterOverride` at `sector.ts:318-320`; the merged field is a boolean with no retained override metadata. |
| 2A-28c | Accepted | Water bulk composition forces `SurfaceWaterPresent` to `true`. | `surfaceWaterOverride` at `sector.ts:321-323`. |
| 2A-28d | Accepted | The Oceanic World or Seagoing Cities tag forces `SurfaceWaterPresent` to `true`. | `surfaceWaterOverride` at `sector.ts:324-326`. |
| 2A-28e | Accepted | When no override applies, `SurfaceWaterPresent` must be a valid result for the selected atmosphere/temperature/bulk/tag combination. | The old fallback rolls the surface-water table at `sector.ts:683-688` and validates the result at `sector.ts:345-353`; the merged implementation should use the retained categorical lookup without serializing its roll. |
| 2A-30a | Accepted | All planets around an M-type star are tidally locked. | V3 generation and validation use the M-type relationship at `sector.ts:763-767,875-882`. |

## Star-selection invariants

| ID | Status | Invariant | Evidence / merged interpretation |
| --- | --- | --- | --- |
| 2A-31 | Modified | A system star's habitability contributes to each inhabited planet's derived `TotalHab`; it is not a separate requirement that must meet the planet's physical environmental Hab. | The old generator filters stars against physical environmental Hab at `sector.ts:598-617` and validates that gate at `sector.ts:723-736`. This is a legacy bug in the merged contract: calculate `TotalHab` as the minimum of star and physical Hab providers, then apply the ordinary population, technology, and Terran-biosphere requirements to that result. |

## Merged orbital, location, and POI invariants

| ID | Status | Invariant | Evidence / merged interpretation |
| --- | --- | --- | --- |
| 2A-35 | Accepted | Each system has between two and seven extra locations/objects corresponding to the old secondary planets, gas giants, and other objects. | The old generator creates `Math.max(2, die(rng, 6))` extras at `sector.ts:947-948`; V4 validation and the existing test enforce 2–7 at `sector.ts:955` and `src/test/swn_sector_v4.test.ts:20-23`. The merged implementation must map these to complete `Planet` or `OtherCelestialObject` values. |
| 2A-36 | Accepted | Each system has between two and five non-transit “Other” points of interest. | The old generator creates `die(rng, 4) + 1` point iterations at `sector.ts:949`; validation and the test enforce 2–5 at `sector.ts:955` and `src/test/swn_sector_v4.test.ts:35`. In the merged schema, POIs are attached through `ParentObjectId`; ingress/egress POIs are not retained. |
| 2A-38a | Modified | Every direct-orbit system object has a valid, nonnegative AU value. | Old AU assignment and validation are at `sector.ts:950-955`; satellite AU may be `null` in the merged schema when no satellite-distance model exists. |
| 2A-38b | Modified | A direct-orbit object’s AU falls within the distance range permitted by its selected star and orbital category/template. | AU ranges are derived from star orbital-zone data at `sector.ts:928-950`. The merged generator must retain the range calculation while expressing the result directly on the object, without slot wrappers. |
| 2A-38c | Modified | When system objects are serialized in orbital order, their AU values are nondecreasing. | The old implementation sorts locations by AU at `sector.ts:950-951`; validation and the test check ordering at `sector.ts:955` and `src/test/swn_sector_v4.test.ts:29-31`. |
| 2A-42 | Modified | An inhabited planet cannot host a point of interest. | The old `addPoi` rejects primary planets at `sector.ts:941`, and V4 validation/test enforce that primary planets have no POIs at `sector.ts:955` and `src/test/swn_sector_v4.test.ts:42`. The merged rule applies to any `Planet` with inhabited data, not to an obsolete `PrimaryPlanet` kind. |
| 2A-43 | Modified | A gas giant containing an inhabited-planet satellite cannot host points of interest. | The old candidate filter excludes gas giants with a primary-planet satellite at `sector.ts:935`; the test checks the resulting condition at `src/test/swn_sector_v4.test.ts:24-26`. The merged rule applies to a `Planet` representing a gas giant with an inhabited planet whose `Orbit.ParentObjectId` references it. |

## Notes for Step 3

- Roll values, source rows, sub-habitability values, color, civilization tier,
  alien flags, and other implementation-only values are not merged output
  fields. Their old behavior should only be retained when it produces a rule
  represented by the new schema.
- Atmosphere, native biosphere, and population constraints use explicit
  categorical rank requirements, with documented inclusive comparisons and
  static rank lookups.
- The elaborated variants should become named, independently failing checks
  in `checkAllInvariants(sector)`.
- The merged schema’s uninhabited/inhabited planet split must be resolved
  before writing planet-level invariant tests.
