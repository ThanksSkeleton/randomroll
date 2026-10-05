# Culture-driven naming mini-spec

## Goal

Keep the current SWN sector generation order. A system starts with its random five-letter `NiceName` and the existing derived names. Completing an inhabited world rolls its culture last, then propagates `Culture.homeworld` into the appropriate `NiceName` fields. Incomplete worlds have `Culture: null`; their culture is not rolled early just to obtain a name.

## Naming rules

- The **system naming world** is the first inhabited planet or moon in the system's stable generated `Objects` order. This choice is fixed for that generated system, regardless of which world is completed first.
- When the naming world is completed, set the system's `NiceName` to its `Culture.homeworld`. Rebuild the star and object `NiceName` values using the existing suffix scheme: `star`, direct-orbit letters, `X` for other celestial objects, and parent-letter plus lowercase moon letter. Rebuild each ordinary POI's `NiceName` from its parent's resulting `NiceName`, its existing Roman ordinal, and its POI type.
- Every inhabited planet or moon keeps its object suffix based on stable orbit order. An incomplete world uses the system's current name as its prefix. A completed world uses its own `Culture.homeworld` as its prefix, so it keeps that name if another world later renames the system. For example, after both worlds complete, the system can be `Orion`, with worlds `Orion A` and `Mira B`.
- The original polity identified by `HomeworldId` receives the completed world's `NiceName`. An incomplete world's original polity follows that world's current `NiceName`. Current claims and original-polity identity continue to use IDs.
- Rebuild the `NiceName` of every route portal attached to the renamed system from the current names of its two endpoint systems, using the existing `Portal <side>-<other>` format. A portal attached to the other endpoint of that same route also needs updating. Route names and habitable POI names do not derive from a system or world name and stay as they are.
- Leave every `Id`, `ProceduralName`, culture roll, world tag, visibility flag, intelligence field, portrait choice, route, claim membership, and conquest fact unchanged. After polity names change, re-sort each `ClaimedByPolityIds` array by polity `NiceName`, then polity ID, matching the current politics ordering rule.

## Completion flow

1. Generate systems, routes, politics, starting-world visibility, and habitable POI shells in their existing order. Five-letter names remain in place during these stages.
2. Complete worlds with `Visibility.BasicScan === true` at the existing end-of-generation stage. For each one, `completeWorld` rolls and stores its culture, then runs the naming update for that world and its system.
3. A later `completeWorld` command uses the same path. It updates names in the same sector transaction that stores culture; it does not require a sector-wide reroll.
4. Repeating completion for an already completed world remains a no-op. Completing worlds in either order produces the same final generated names once both are complete.

The naming update is a single shared function called from `completeWorld`, not a second implementation in `generate`. It derives names from stored culture and the current system structure. It may replace GM-edited `NiceName` values on entities in its update scope, including the system, its star and bodies, its ordinary POIs, attached portals, and affected polities. Other systems' entity names remain untouched, apart from portals connected to the renamed system; claimant ordering can change wherever an affected polity has a claim. Once culture is stored, ordinary manual name edits still work through the existing editor until a later completion triggers another update in that system.

## Two-world example

Suppose system `ABCDE` has worlds `ABCDE A` (the naming world) and `ABCDE B`.

| Event | System | First world | Second world | Original polities |
| --- | --- | --- | --- | --- |
| Neither complete | `ABCDE` | `ABCDE A` | `ABCDE B` | Match their worlds |
| Second completes with `Mira` | `ABCDE` | `ABCDE A` | `Mira B` | `ABCDE A`, `Mira B` |
| First completes with `Orion` | `Orion` | `Orion A` | `Mira B` | `Orion A`, `Mira B` |

If the first world completes before the second, the incomplete second world becomes `Orion B`. Completing it later changes it to `Mira B`. Other bodies use the system prefix and their existing suffixes whenever the system name changes.

## Implementation and acceptance

- Extract the existing suffix and POI naming rules from `Generator/generate_system.ts` for reuse by the completion-time naming update. Identify the naming world from stable generated order, including inhabited moons.
- Update `Generator/culture.ts` so culture storage and name propagation form one returned sector value. The application command in `Application/prototypeApplication.ts` continues to validate and save that returned value atomically.
- Cover initial completion and later completion, one- and two-world systems, both completion orders, inhabited moons, dependent stars/bodies/POIs/portals/polities, claim ordering, and deterministic replay. Verify that incomplete cultures remain `null`, manual names in the update scope can be overwritten, IDs and procedural names remain stable, and unrelated systems do not change. Update fixed-seed output snapshots, then run the SWN tests, type check, and build.
