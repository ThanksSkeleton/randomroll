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
- **Conquest:** Assignment of a target to the attacking homeworld's polity by the one-time history pass.

Polities, star systems, and inhabited worlds are separate concepts. A polity may contain multiple worlds; a system may contain multiple inhabited worlds; system-level dominance does not automatically define every world's culture or identity.

## Capability matrix

The normative input is [swn_battle_strength_matrix.csv](swn_battle_strength_matrix.csv).

Map canonical population categories to matrix columns as follows:

| Canonical population | Matrix population band |
| --- | --- |
| `Fewer than 500` | `500` |
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
| 0 | Any | 0 | 0 | 0 |
| 1 | Any | 0 | 0 | 0 |
| 2 | Any | 0 | 0 | 0 |
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
- A world with Projection `0` may still target a different inhabited world in its own system.
- Culture, world names, and other local facts remain attached to worlds and are not replaced by polity membership.

The polity naming scheme and whether multiple worlds may begin in the same polity are drill-down decisions. The simplest initial implementation is one polity per inhabited world before conquest.

## Candidate targets

An attacker may consider a target only when:

1. Attacker and target are different inhabited worlds.
2. The target is not already part of the attacker's initial polity.
3. The shortest route distance from attacker system to target system is less than or equal to the attacker's Projection.
4. For Projection `0`, attacker and target are in the same system.
5. The attacker's Attack is greater than zero.

Physical hex distance and visual proximity are irrelevant. Only the generated route graph determines inter-system projection distance.

## Battle rule

For an eligible attacker and target:

- If `Attack > Defense`, the attacker can conquer the target.
- If `Attack <= Defense`, the defender holds.
- The defender therefore wins ties.

Defense is the target homeworld's matrix value. It is not increased by other members of its polity unless a later specification explicitly adds such a rule.

## Non-recursive conquest

- Only the original homeworld's Attack and Projection produce conquest attempts.
- A conquered world's Attack and Projection do not become available to its conqueror.
- A conquered system or world does not become a new origin point for route-distance calculation.
- Conquest does not modify Attack, Defense, or Projection.
- The pass runs to completion once during sector generation and does not run again automatically during campaign play.

## Resolution decisions still required

The source plan does not yet determine the following, and implementation must not choose them accidentally through collection order:

### Conquest unit

Choose whether a successful attack conquers:

- Only the targeted inhabited world; or
- Political control of the entire target system.

This decision must explicitly cover systems containing multiple inhabited worlds. Regardless of the choice, local culture and world names remain attached to their worlds.

### Multiple attackers

Choose how to resolve two or more successful attackers against the same target. Candidate rules include highest Attack, greatest margin over Defense, shortest distance, or a deterministic random tie-break.

### Resolution timing

Choose whether all attacks are evaluated against the initial independent state and applied simultaneously, or processed in a declared deterministic order. Simultaneous evaluation best preserves the stated non-recursive behavior, but it is not yet approved.

### Attacker choice

Choose whether every capable homeworld attacks every beatable target, attacks one preferred target, or follows another target-priority rule.

### Cycles and mutual conquest

Define the result when two homeworlds can defeat one another, including whether both battle notes are retained and which polity survives.

These are blocking drill-down decisions for the conquest algorithm.

## Battle-history notes

The politics pass produces narrowly scoped GM-facing battle notes for resolved contests. This is not a general event-log system.

At minimum, a note records:

- Attacker homeworld and polity.
- Defender world and polity.
- Route distance.
- Attack and Defense values.
- Outcome: conquest or defense.

The storage and exact prose format remain to be decided. Notes may be structured politics records rendered as prose or labeled text appended to an appropriate GMNote, but they must not overwrite human-authored GM text.

## Political scan

Political information must be available through the existing intelligence/visibility UI, with the exact format still to be designed.

The political presentation eventually needs to communicate:

- A world's current polity/allegiance.
- Whether it is a polity homeworld or a conquered member.
- Attack, Defense, and Projection to the GM.
- Relevant conquest history to the GM.

Which political facts appear at `BASIC_SCAN`, `CULTURE_PARTIAL`, and `CULTURE_FULL` is a drill-down decision. GM preview always has access to the complete political state.

## Data-model impact

Expected structured additions include:

- Stable polity IDs and polity records.
- Homeworld ID for each polity.
- Current polity/allegiance ID for each inhabited world.
- Derived or persisted Attack, Defense, and Projection.
- Narrow battle-history note records or a safe GMNote representation.

Polity membership must reference stable IDs rather than editable names. Derived capability values must be validated against the normative matrix.

No faction records, faction assets, political turns, or general campaign event records are introduced in this step.

## Acceptance criteria for the settled core

The following criteria are valid before the remaining resolution rules are chosen:

1. Every inhabited world receives a polity/allegiance and matrix-derived capability.
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
13. Battle-history output remains narrow and does not create a general event ledger.

Final acceptance criteria must be added for conquest unit, target choice, competing attackers, timing, and cycles after those decisions are made.

## Future, not part of Step 4

- Military, trade, and cultural alliances.
- TL4 colonial relationships that do not arise from this conquest algorithm.
- Faction Force/Cunning/Wealth mechanics.
- Revolts, diplomacy, wars during play, economic effects, or changing capability.
- Automated news reporting beyond the minimal battle-history requirement.
