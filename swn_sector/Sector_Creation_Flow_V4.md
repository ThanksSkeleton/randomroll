# Sector Creation Flow — V4

## Scope

V4 extends the V3 star-and-inhabited-world result with a deterministic hierarchy of system locations and location-bound points of interest. The existing UI remains V3-only; V4 is a pure data-generation and validation layer.

## System hierarchy

Every generated system has one V3 primary star and a collection of locations. Every location has one `OrbitalPositionCategory`:

- `TooHot`
- `Goldilocks`
- `TooCold_1`
- `IngressEgress`
- `TooCold_3`

The location collection contains one or more primary-planet locations (one for each V3 inhabited world), exactly one required `EgressIngressRegion`, and a `1d6` extra-world roll (raised to two when it rolls one, to meet the two required extreme-orbit placements). Every point of interest has a `locationId` that refers to one of those locations.

## V4 generation order

1. Generate the V3 system, including its star and inhabited worlds.
2. Convert every inhabited world into a `PrimaryPlanet` location. Its orbital category is deterministically derived from its one V3 thermal-orbit value: Too Hot maps to `TooHot`, Too Cold maps to `TooCold_1`, and Hot, Temperate, or Cold map to `Goldilocks`.
   Inhabited worlds in `TooHot` are tidally locked, as are worlds orbiting an M-type primary star.
3. If the primary planet is marked as a gas-giant moon, add a new `ParentGasGiant` location and make it the primary planet location's parent. The parent shares the primary planet's orbital category, including `Goldilocks` when applicable.
4. Add the required `EgressIngressRegion` in `IngressEgress`.
5. Add one ingress point and one egress point to that required region. These meet the configured minimum of one each.
6. If one or more Goldilocks slots remain open after primary-world placement, there is a 50% chance to create one terrestrial or gas-giant extra world in a randomly selected open slot. Then roll `1d6` extra worlds, with a result of one raised to two. Place at least one in TooHot and at least one in TooCold_1; place no more than one in TooCold_3. Select eligible archetypes for the required placements. A terrestrial extra world with an existing gas giant rolls against the same d100 `gas_giant_moon` table as a primary planet; on its Yes result it becomes that giant's moon, otherwise it is placed in an allowed category.
7. Roll `1d4+1` other POIs. Each selected POI attaches to an eligible location. A Deep-space station instead creates a new `IndependentOrbit` location, which contains that station and no other POI.

The terrestrial-extra-world moon decision uses the existing d100 `gas_giant_moon` table, keeping it synchronized with the primary-planet moon probability.

## Numbered Goldilocks slots

Star `habitableSlots` are numbered locations **within Goldilocks only**. A TooHot or TooCold_1 primary planet does not consume one. Goldilocks primaries prefer slot 1 for Hot, slot 2 for Temperate, and slot 3 for Cold. When the preferred slot is unavailable, the nearest available Goldilocks slot is used; equal-temperature ties retain generation order. V4 star selection requires enough habitable slots for the number of Goldilocks primaries, rather than every primary planet in the system.

## Symbolic AU placement

Every location records one `au` value and a one-based `orbitalOrder` within its orbital region. For each region, locations remain in generation order; the region's AU span is divided into equal contiguous subdivisions, and each location is placed uniformly at random in its own subdivision. The IngressEgress region has zero width, so its location is exactly at the star type's warp-point AU. These values currently appear only in location mouseover details and do not alter the symbolic map layout.

## Extra-world placement rules

| Archetype group | Allowed orbital categories |
| --- | --- |
| `TerrestrialPlanet` | TooHot, TooCold_1, TooCold_3 |
| `GasGiant` | TooHot, TooCold_1, TooCold_3 |
| `AsteroidBelt` | TooHot, TooCold_1 |
| `GasCloud` | TooCold_1, TooCold_3 |
| `KupierBelt` | TooCold_3 |

The required EgressIngress region is not an extra-world archetype. IndependentOrbit is similarly created only by a Deep-space station, not selected as an extra world; it is placed in TooHot, TooCold_1, or TooCold_3. The only normally generated Goldilocks extra is the optional open-slot terrestrial or gas-giant world. A ParentGasGiant created to hold a primary planet marked as a gas-giant moon also shares that primary planet's Goldilocks position when applicable.

## Result invariants

- The V3 world results remain valid; V4 selects the star using its Goldilocks-primary count.
- Every POI references an existing location.
- Each system has at least one primary-planet location, one EgressIngress region, one ingress point, and one egress point.
- Each system has two through seven extra worlds, including at least one TooHot and one TooCold_1 world, no more than one TooCold_3 world, and two through five other POIs.
- Extra worlds are in a permitted orbital category unless they are moons of a gas giant.
- An IndependentOrbit contains exactly one Deep-space station.
- The same seed and options produce the same V4 result.

## Change verification and artifact handoff

Every V4 change to generation code, generation data, constraints, or tests must run the relevant automated test before handoff. The V4 generator test produces and validates a deterministic artifact at `/tmp/randomroll-swn-sector-v4.json`. Changes to TypeScript production code must also pass `npx tsc --noEmit`.
