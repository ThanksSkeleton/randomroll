# Phase 1 Follow-ups

These items were identified during the Step 6 Sol High inspection and are
deliberately outside the current fix pass. They do not block Phase 1 unless a
later review changes their disposition.

## Station extra-object accounting

**Status:** Deferred

Independent stations are currently appended after ordinary extras have already
filled the rolled extra-object target. The final count remains within the hard
two-through-seven invariant, but each station increases it above the original
roll rather than consuming a reserved slot.

Changing this cleanly would require planning the POI target and station demand
before filling extras. The current bounded result is acceptable for now.

## Uninhabited terrestrial moons

**Status:** Low priority

The merged generator creates inhabited gas-giant moons but does not make an
uninhabited terrestrial extra into a gas-giant moon. All uninhabited extras
currently orbit the star directly.

A future implementation may apply the reviewed 10% moon roll when a smaller
terrestrial extra has a compatible direct-orbit gas-planet parent with fewer
than two moons. This is additional variety, not required for the current phase.

## Habitability distributions

**Status:** Consider later; leave current rules unchanged

The reviewed tables produce a strong setting flavor: many inhabited planets
have `TotalHab: 0`, while low-Hab worlds disproportionately use modern postech
because primitive technology requires greater natural habitability. Compact
remnants can also contain small postech populations on Cryogenic or Volcanic
worlds.

These outcomes are extreme but permissible under the current rules. A future
design pass may revisit the Hab requirements or generation weights if a less
hostile sector distribution is desired. This should be treated as a product
balance change, not a correctness fix.
