# Phase 1 Step 2b — Domain Invariants

This document contains the retained Phase 1 Step 2b invariants. Rejected and
redundant candidates have been removed. Each invariant is intended to become a
deterministic unit test over the structured sector data.

Permitted incongruities require no explanation, paper trail, or generator note
inside the application. Any narrative resolution belongs in the user's
external narrative documents and is outside the generator's scope.

Related decisions are detailed in [RouteElaborationSpec.md](RouteElaborationSpec.md)
and [TemperatureElaborationSpec.md](TemperatureElaborationSpec.md).

## Sector and system map

- A8: Every system contains at least one planet or other orbiting object.
- A9: Different systems do not have indistinguishable procedural and display names.

## Orbital structure and parentage

- B1: Every object that directly orbits its star has a non-null AU.
- B3: Every recorded orbital distance is finite and nonnegative.
- B4: Every orbital angle is at least zero degrees and less than 360 degrees.
- B5: Direct-orbit objects within the same system have distinct AU values.
- B7: Every parent-object reference resolves to an existing object.
- B8: Every object's parent belongs to the same system as the object.
- B9: No object is its own parent.
- B10: Parent-object relationships contain no cycles.
- B11: Every moon and station has a parent chain that terminates at its system's star.
- B12: An ordinary planet does not orbit an asteroid belt, gas cloud, or station.
- B13: A diffuse object such as a belt or gas cloud is not a conventional satellite of a planet.
- B14: Every system contains at least one object that directly orbits its star.
- B15: Every system has an outermost direct-orbit object with a usable AU from which its warp boundary can be derived.
- B16: A moon cannot have moons of its own.
- B17: A moon's size category is strictly smaller than its parent planet's size category.
- B18: A planet has at most two moons.
- B19: A moon has the same temperature as its parent planet.
- B20: A moon has the same star-relative AU as its parent planet. Moon-to-planet distance is treated as zero, while the moon retains an angle for presentation.
- B21: An independent station directly orbits its system's star; it cannot orbit a planet, moon, or other system object.

## Stars, planets, and physical conditions

- C2: Among direct-orbit planets in the same system, a planet with a higher temperature rank is closer to the star. Apply the detailed temperature-to-AU rules in `TemperatureElaborationSpec.md`.
- C5: Every Jupiter-sized planet has a gas composition rather than an ordinary rock or metal composition.
- C6: Luna-, Mars-, Earth-, and Super-Earth-sized planets do not have Jovian or Neptunian gas composition.
- C7: Neptune-sized planets have Neptunian gas composition, and Jupiter-sized planets have Jovian gas composition.
- C8: Gas giants do not have surface water.
- C17: A planet is tidally locked if and only if it directly orbits an M-type star. Moon relationships do not affect this field.

## Habitability and inhabited worlds

- D1: An inhabited planet's star provides at least the habitability required by the planet's population.
- D3: An inhabited planet's total habitability meets or exceeds the requirement of its population category.
- D4: An inhabited planet's total habitability meets or exceeds the requirement of its technology category. Low technology requires higher natural habitability.
- D10: A Terran biosphere exists only where the recorded environmental conditions can support Terran life.
- D12: A gas giant is not itself an inhabited world; inhabitants associated with it live on moons or stations.

## World tags and social facts

- E2: A Desert World is not primarily water-covered.
- E6: A world tagged Heavy Industry, Major Spaceyard, or Post-Scarcity does not have primitive technology.
- E8: An Outpost World does not have billions of inhabitants.
- E9: A Tomb World or Abandoned Colony has the rank-1 population category, `Fewer than 500`.
- E10: A Trade Hub's system has at least one route connecting it to another system.

## Points of interest and other celestial objects

- F1: Every point-of-interest parent reference resolves to an existing object.
- F2: Every point of interest belongs to an object in the same system.
- F3: A point-of-interest parent is a system object, not a star, system, route, ship, or another point of interest.
- F4: A point of interest is not attached directly to an inhabited planet.
- F5: A point of interest is not attached to a gas giant that has an inhabited moon.
- F9: Every point of interest has a known, nonblank type from the enumerated point-of-interest taxonomy.
- F10: No object has more than three attached points of interest.
- F12: Every other celestial object has a temperature compatible with its class and receives AU placement through the same star-and-temperature methodology as a planet. Asteroid belts require Volcanic through Alpine temperatures; Kuiper belts and gas clouds require Boreal through Cryogenic temperatures; independent stations permit any temperature.
- F13: Every point of interest is attached to an object compatible with its type. A non-gas planet and a gas planet are distinguished by bulk composition, not by inhabited status.
- F14: Every independent station hosts exactly one point of interest, of type `Deep-space station`, and hosts no other point-of-interest type.

## Routes and travel

- G1: A route connects two different systems.
- G2: Every route portal references an existing system.
- G4: No two routes connect the same pair of systems.
- G5: Every route portal boundary angle is at least zero degrees and less than 360 degrees.
- G6: Route portals in the same system have distinct boundary angles.
- G8: Every system is connected to at least one route.
- G10: A Regional Hegemon's system has at least one route connecting it to another system.

## Player ship, identity, and information

- H1: The player ship's current-location reference resolves to an existing allowed location.
- H2: The player ship cannot be its own current location. A route is an allowed location and means that the ship is in warp.
- H3: Every non-route ship location has a determinable containing system. A ship located on a route intentionally has no current system; a top-level route portal identifies its system directly.
- H5: Every object that the interface names has a nonblank nice name.
- H7: Entity names are unique enough to prevent ambiguous player-facing choices.
