# Step 4 Specification: Initial Politics and Political Dominance

## Status and intent

This step creates an initial political map and a small amount of prior history from the generated inhabited worlds. It is a one-time generation pass, not an ongoing political simulation.

Every inhabited world begins with a polity/allegiance and military capability derived from its population and tech level. Strong homeworlds may dominate weaker targets within their projection range.

The design deliberately remains simpler than the future faction system.

## Terms

- **Inhabited world:** A `Planet` or moon whose `InhabitedInfo` is not `false`.
- **Homeworld:** The inhabited world from which a polity's capability is calculated.
- **Polity:** A political identity that may control one or more inhabited worlds.
- **Attack:** Ability to dominate another world.
- **Defense:** Ability to resist domination.
- **Projection:** Maximum route distance at which the homeworld can attempt conquest. Projection `0` permits targets only within the same system.
- **Route distance:** The smallest number of routes between two systems. Worlds in the same system have distance `0`.
- **Claim:** A polity's surviving political presence on a system object after resolution.
- **Conquest:** Removal of a homeworld's native polity by one or more foreign polities during the one-time history pass.

Polities, star systems, and inhabited worlds are separate concepts. A polity may contain multiple worlds; a system may contain multiple inhabited worlds; system-level dominance does not automatically define every world's culture or identity.

## Capability matrix

The normative input is [swn_battle_strength_matrix.csv](swn_battle_strength_matrix.csv).

Map canonical population categories to matrix columns as follows:

| Canonical population | Matrix population band |
| --- | --- |
| `Up to 2,000 inhabitants` | `500` |
| `Fewer than a million inhabitants` | `1m` |
| `Several million inhabitants` | `several Million` |
| `Hundreds of millions of inhabitants` | `100M` |
| `Billions of inhabitants` | `Billion` |

Map canonical technology as follows:

| Canonical tech | Matrix TL |
| --- | --- |
| `Neolithic-level technology` | 0 |
| `Medieval technology` | 1 |
| `Early Industrial Age tech` | 2 |
| `Tech like that of present-day Earth` | 3 |
| `Modern postech` | 4 |
| `Postech with specialties` | 4 |
| `Pretech with surviving infrastructure` | 5 |

The resulting matrix is:

| TL | Population | Attack | Defense | Projection |
| ---: | --- | ---: | ---: | ---: |
| 0 | Any | 0 | 0 | -1 |
| 1 | Any | 0 | 0 | -1 |
| 2 | Any | 0 | 0 | -1 |
| 3 | 500, 1m, several Million | 0 | 0 | 0 |
| 3 | 100M, Billion | 1 | 1 | 0 |
| 4 | 500 | 1 | 1 | 0 |
| 4 | 1m | 2 | 2 | 1 |
| 4 | several Million | 2 | 2 | 1 |
| 4 | 100M | 2 | 3 | 1 |
| 4 | Billion | 2 | 3 | 1 |
| 5 | 500 | 2 | 2 | 1 |
| 5 | 1m | 3 | 3 | 2 |
| 5 | several Million | 3 | 4 | 2 |
| 5 | 100M | 3 | 4 | 2 |
| 5 | Billion | 4 | 4 | 3 |

Capability is calculated from the homeworld's original generated population and TL. Conquest does not combine values, add population, or create a stronger polity.

## Initial polity state

Before conquest resolution:

- Every inhabited world is assigned an initial polity identity.
- Every polity has exactly one capability-producing homeworld.
- Each inhabited world's Attack, Defense, and Projection are derived from the matrix.
- A world with Attack `0` cannot successfully conquer another world.
- A world with Projection `0` paints every system object in its own system.
- A world with Projection `-1` paints only its own homeworld and no other object, even in its own system.
- Culture, world names, and other local facts remain attached to worlds and are not replaced by polity membership.

There is exactly one initial polity per inhabited world. Its initial name is the homeworld's `NiceName`, while relationships use stable IDs rather than that editable name.

Each initial polity also receives a deterministic generated flag. The flag is a 2:1 rectangle whose body color is unique across all polities in the sector, with a centered circle in a randomly selected canonical color. Black is excluded from generated polity colors. Every flag has a one-pixel white outline. Unclaimed space uses a special solid-black `None` flag.

## Projection painting

Every initial polity paints claims independently and simultaneously, before any resolution occurs:

1. A polity always paints its own homeworld.
2. Projection `-1` paints nothing else.
3. For Projection `0` or greater, the polity paints every system object whose system's shortest route distance from the home system is less than or equal to Projection.
4. Painted objects include inhabited and uninhabited planets and moons, asteroid belts, Kuiper belts, gas clouds, and independent stations.
5. Stars, systems, routes, route portals, points of interest, and the player ship are not painted.
6. Attack `0` does not prevent painting, though it cannot eliminate another polity.

Physical hex distance and visual proximity are irrelevant. Only the generated route graph determines inter-system projection distance.

## Simultaneous resolution

For every painted object, compare all painted polities against the original capability values of all other painted polities:

- A polity is removed from that object if any opposing polity has `Attack >` its `Defense`.
- `Attack <= Defense` does not remove the defending polity. Defense therefore wins ties.
- All removals are evaluated against the complete initial painted set and applied simultaneously.
- A non-homeworld object retains every surviving polity. Multiple survivors represent a contested claim.
- A homeworld whose native polity survives is controlled exclusively by the native polity, even if foreign polities also survived the ordinary comparison.
- If the native polity is removed, all surviving foreign polities remain. A defeated homeworld can therefore be contested by multiple invaders.

An object with no surviving or projected polity has no claim.

## Non-recursive conquest

- Only the original homeworld's Attack and Projection produce conquest attempts.
- A conquered world's Attack and Projection do not become available to its conqueror.
- A conquered system or world does not become a new origin point for route-distance calculation.
- Conquest does not modify Attack, Defense, or Projection.
- The pass runs to completion once during sector generation and does not run again automatically during campaign play.
- A conquered polity retains claims projected from its original homeworld during the simultaneous painting pass. In particular, a conquered polity may retain a distant claim beyond its conqueror's projection range.

## Battle-history notes

The politics pass produces narrowly scoped GM-facing battle notes for resolved contests. This is not a general event-log system.

At minimum, a note records:

- Attacker homeworld and polity.
- Defender world and polity.
- Route distance.
- Attack and Defense values.
- Outcome: conquest or defense.

The initial implementation stores these as structured internal conquest-event records. It does not yet render them in the UI and does not append to or overwrite human-authored GM text.

## Political scan

Political control is available through constructed Politics 1 (`PoliticsScan`) output on every system object in this form:

`ClaimedBy: <PolityName>, <PolityName>`

An object without a surviving claim displays `ClaimedBy: None`.

The corresponding polity flags appear with the constructed Politics 1 claim information. Selecting a system displays the union of every polity claiming at least one object in that system, without duplicates. This is a summary of object-level claims; it does not create a separate system claim.

## Polity overlay

The system viewer provides a `Polity Overlay` option alongside the existing view controls.

- When active, every visible planet, moon, belt, cloud, and independent station displays its surviving claim flags in a vertical column above the object.
- An unclaimed object displays the black `None` flag.
- Hovering a generated flag displays its polity name; hovering the black flag displays `None`.
- Player preview shows overlay flags only where Politics 1 is visible. GM preview may show all generated political claims.
- The same persisted flag colors are used in Politics 1 and the overlay.

The political presentation eventually needs to communicate:

- A world's current polity/allegiance.
- Whether it is a polity homeworld or a conquered member.
- Attack, Defense, and Projection to the GM.
- Relevant conquest history to the GM.

Further placement of capability and history facts in deeper scans remains a future presentation decision. GM preview always has access to constructed Politics 1.

## Data model

Structured political state includes:

- Stable polity IDs and polity records.
- Homeworld ID for each polity.
- Two distinct non-black canonical flag colors for each polity.
- Current polity/allegiance ID for each inhabited world.
- Derived or persisted Attack, Defense, and Projection.
- Narrow battle-history note records or a safe GMNote representation.

Polity membership must reference stable IDs rather than editable names. Derived capability values must be validated against the normative matrix.

No faction records, faction assets, political turns, or general campaign event records are introduced in this step.

## Acceptance criteria

The settled implementation must satisfy the following:

1. Every inhabited world creates exactly one polity named from its `NiceName` and receives matrix-derived capability.
2. Every canonical TL and population category maps to the intended matrix row.
3. `Postech with specialties` uses the TL4 row.
4. Route distance uses the shortest path through `Route` endpoints and treats the same system as distance zero.
5. Projection limits are enforced.
6. An attacker wins only when Attack is strictly greater than Defense.
7. The defender wins a tie.
8. Conquest never changes capability values.
9. Conquered worlds never project additional conquest.
10. The politics pass runs once and does not become an ongoing simulation.
11. World culture and names survive changes in polity membership.
12. Political state is stored through stable IDs and is available to GM preview.
13. Battle-history output remains a narrow internal conquest-event log and does not create a general event ledger.
14. Projection paints every system object in range and does not paint stars, POIs, routes, route portals, or the player ship.
15. Resolution is simultaneous and independent of collection order.
16. Every opposing polity whose Attack exceeds a polity's Defense removes that polity's claim.
17. Multiple surviving claims remain contested on ordinary objects and on a defeated homeworld.
18. A surviving native polity exclusively controls its own homeworld.
19. A conquered polity retains any separately projected claims that survive resolution.
20. Politics 1 displays `ClaimedBy` names or `None` for every system object.
21. System Politics 1 displays the deduplicated union of polities claiming its objects.
22. Every generated polity flag uses two distinct canonical non-black colors, a centered circle, and a one-pixel white outline.
23. The black `None` flag represents an unclaimed object.
24. The Polity Overlay renders claim flags in a vertical column above system objects and exposes polity names as flag tooltips.

## Future, not part of Step 4

- Military, trade, and cultural alliances.
- TL4 colonial relationships that do not arise from this conquest algorithm.
- Faction Force/Cunning/Wealth mechanics.
- Revolts, diplomacy, wars during play, economic effects, or changing capability.
- Automated news reporting beyond the minimal battle-history requirement.
