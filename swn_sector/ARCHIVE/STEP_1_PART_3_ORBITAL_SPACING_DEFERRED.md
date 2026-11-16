# Step 1 Part 3: Deferred Orbital Spacing Work

## Status

Deferred. A modest physical-placement fix is complete, but robust AU and angle
spacing remains future work.

## Completed interim fix

- Direct objects stay outside the forbidden region close to the star and the
  forbidden region close to the system edge.
- Inhabited direct planets continue to use the temperature table and its
  temperature-band placement rules.
- Non-inhabited planets and asteroid belts use the full usable direct-orbit AU
  range.
- Kuiper belts and gas clouds use the Cryogenic AU range.
- Independent stations use the full usable direct-orbit AU range.
- Non-inhabited direct-object temperatures are derived from their selected AU.
- Moons inherit their parent planet's star-relative AU and temperature.
- Direct-object angles remain deterministic and lie in `[0, 360)`.

## Deferred work

The following work is deliberately not part of the current cleanup pass:

- A robust algorithm for spacing direct-object AU values for both physical
  plausibility and visual readability.
- A robust angular-layout algorithm that avoids overlapping planets, belts,
  stations, moons, markers, and labels.
- Readable placement of multiple moons around one parent under varying map
  sizes and object counts.
- Joint optimization of AU and angle placement rather than treating them as
  independent values.
- Collision handling that accounts for marker dimensions, label dimensions,
  belt annuli, and neighboring system or route graphics.
- A deterministic layout strategy that remains stable across seeds while
  degrading gracefully in crowded systems.

## Current limitations

- Direct-object angles are deterministic random values, not collision-free
  layout positions.
- Multiple labels or markers may overlap in crowded systems.
- AU placement guarantees the current physical validity rules but does not
  attempt to optimize the resulting top-down composition.

## Future acceptance criteria

Any future spacing pass should preserve the current physical rules while also
providing:

- deterministic results for a given seed;
- explicit handling for crowded systems and multiple moons;
- no placement inside forbidden stellar or system-edge regions;
- no accidental movement of route portal bearings to solve planet layout;
- stable, readable behavior across supported viewport sizes.
