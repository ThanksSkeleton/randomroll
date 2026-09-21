# Exhaustive Feasibility Performance Investigation

## Symptom

`STOCHASTIC_SUCCESS_SECTOR_COUNT=1 npx vitest run
src/generators/swn_sector/stochastic_success.test.ts` can exceed Vitest's
default five-second timeout. One observed run completed after approximately
twenty-one seconds and was reported as timed out.

The issue appeared after making low-Hab world-tag selection prove that a tag
pair has a full completable inhabited-world profile before it is selected.

## Current implementation

`generate_inhabited_planet.ts` now rolls complete profiles and validates them
directly. It does not enumerate a cross-product. The Terran-biosphere and
population rolls are filtered by the habitability accumulated from prior
environmental choices, because habitability can only decrease as a profile is
constructed.

Previously, stars with Habitability below 2 called an exhaustive completion
check while filtering tag pairs. There are roughly 100 × 99 ordered tag pairs,
and an infeasible pair could exhaust a substantial cross-product before
returning false.

Ordinary tag-pair selection now uses the inexpensive intersection checks only.
If profile rolling exhausts its bounded attempt budget, `generateSystem()` logs
the failure and retries the whole system with a fresh, deterministic attempt
seed. It makes at most five retries (six attempts total), then throws.

## Theories

1. The primary cost was repeated full cross-product enumeration for infeasible
   low-Hab tag pairs. The existing memoization only helped after a given pair,
   star Hab rating, allowed-temperature set, and partial profile had already
   been queried.

2. Compact remnants amplify the problem. They have only Cryogenic and Volcanic
   usable direct-orbit temperature bands and Hab 0, so many tag combinations
   that look compatible as simple rule intersections have no physical/profile
   completion.

3. The solver performs pair filtering separately for every inhabited planet.
   Feasible-pair results should be reusable for systems sharing a star Hab
   rating and allowed-temperature set.

4. The current implementation uses ordered pairs. If tag order has no product
   meaning, evaluating an unordered pair once would almost halve the pair work.

## Follow-up options

- Instrument retry counts and elapsed time by star type. If retries become
  common, revisit a compact constraint-intersection solver.
- Tune the bounded profile-roll budget if real failure logs show it is needed.

## WONTFIX: POI host exhaustion

POI placement can occasionally exhaust its legal hosts. This occurs when the
system has reached its seven-extra-object cap (so it cannot add another
independent station), while all compatible existing hosts are either inhabited,
reserved as inhabited-moon parents, incompatible object types, or already at
their three-POI capacity. The whole-system retry currently recovers this case.
This is accepted as WONTFIX for now.

## Non-goals

Do not solve this by increasing Vitest's timeout, weakening invariants, or
special-casing Stochastic Success seeds. The generator validates each final
profile before returning it and uses bounded retries when random rolls cannot
produce one.
