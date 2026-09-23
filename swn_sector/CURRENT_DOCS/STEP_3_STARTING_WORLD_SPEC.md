# Step 3 Specification: Starting World and Initial Visibility

## Status and intent

This step selects the campaign's starting inhabited world, places the player ship there, and establishes the initial player-visible neighborhood.

It uses the existing entity-level visibility model:

- `NONE`
- `BASIC_SCAN`
- `CULTURE_PARTIAL`
- `CULTURE_FULL`

This step changes visibility values; it does not introduce a second knowledge model.

## Generation input

Sector generation receives one starting-world mode.

| Mode | Eligible inhabited worlds |
| --- | --- |
| `UNRESTRICTED` | Any inhabited planet or moon, regardless of tech level or population band. |
| `TL4_PLUS` | Any inhabited planet or moon whose numeric tech level is at least 4. |
| `TL4_PLUS_POP_GT_500` | Any inhabited planet or moon whose numeric tech level is at least 4 and whose population band is not `Fewer than 500`. |

For eligibility purposes:

- `Modern postech` is TL4.
- `Postech with specialties` is TL4.1 and qualifies as TL4+.
- `Pretech with surviving infrastructure` is TL5.
- “Population greater than 500” is evaluated using the existing categorical population value. Every category except `Fewer than 500` qualifies.

The UI labels may be friendlier than the serialized mode keys, but their meaning must be explicit. The default mode remains a drill-down decision.

## Selection algorithm

1. Collect every `Planet` whose `InhabitedInfo` is not `false`.
2. Filter that collection using the selected starting-world mode.
3. Sort or otherwise stabilize the candidate collection before random selection so incidental array ordering does not change the result.
4. Select one candidate using the sector's deterministic random source and a dedicated starting-world random path.
5. Persist the chosen world's stable ID as the starting-world reference.
6. Set `PlayerShip.CurrentLocationId` to that world ID.

The starting world may be a direct-orbit planet or an inhabited moon.

This is not a reroll system. A generated sector has one selected starting world. Manually moving the ship later is ordinary campaign editing and does not retroactively repeat initial visibility setup.

## No-candidate behavior

If the chosen mode has no eligible world:

- Generation fails with a clear, specific error.
- The error identifies the selected mode and states that no eligible inhabited world was generated.
- The application offers the GM a way to choose another mode or generate a different sector.
- The application does not silently fall back to a less restrictive mode.
- No partial sector is presented as a successful campaign sector.

## Initial visibility algorithm

Before applying the starting-world reveal, ordinary generated selectable entities begin at `NONE`.

Let `S` be the system containing the selected starting world.

### 1. Reveal the starting system contents

Set the following entities in `S` to `BASIC_SCAN`:

- `S` itself.
- `S.Star`.
- Every planet and moon in `S.Objects`.
- Every other celestial object in `S.Objects`.
- Every POI in `S.PointsOfInterest`.

Set the player ship to `BASIC_SCAN`.

“Everything in the starting system” includes objects that remain narratively mysterious; `BASIC_SCAN` controls which existing intelligence fields the player view exposes.

### 2. Reveal directly connected routes

For every route with one endpoint in `S`:

- Set the `Route` to `BASIC_SCAN`.
- Set both of that route's `RoutePortal` records to `BASIC_SCAN` so the complete known connection is represented consistently.

### 3. Reveal first-order neighboring systems

For the system at the other endpoint of each revealed route:

- Set the neighboring `StarSystem` entity to `BASIC_SCAN`.
- Do not automatically reveal that neighboring system's star, planets, moons, other objects, or POIs.

### 4. Stop propagation

- Do not reveal routes merely because they connect to one of the neighboring systems.
- Do not reveal second-order systems.
- Do not recursively reveal any additional entities.

In graph terms, the result contains the full starting system, all incident routes, and the system records at distance one. Route traversal does not continue beyond distance one.

## Existing information boundaries

- GM preview continues to display sector truth and GM notes regardless of visibility.
- Player preview continues to hide `NONE` entities.
- `BASIC_SCAN` does not reveal `CULTURE_PARTIAL`, `CULTURE_FULL`, or GM-only text.
- This step does not generate cultural information. It only establishes initial visibility values.
- Later GM visibility edits use the existing edit controls and do not recalculate this initial reveal.

## Data-model impact

Add or persist:

- The selected starting-world mode as generation configuration/provenance.
- The selected starting-world ID as campaign state, unless it can be unambiguously represented by a dedicated existing field without conflating it with the ship's later location.

The player ship location alone is insufficient as a permanent starting-world record because the ship can move during play.

No reroll state is added.

## UI requirements

- Sector generation presents the three modes with their exact eligibility meaning.
- On success, the chosen starting world is identifiable to the GM.
- The ship appears at the chosen world in symbolic and top-down views.
- Player preview shows the starting system contents, connected routes, and first-order neighboring system records as described above.
- Player preview does not leak neighboring system contents or second-order routes.
- The no-candidate error is actionable and does not imply that the application silently changed modes.

## Acceptance criteria

1. `UNRESTRICTED` can select any inhabited world and never selects an uninhabited planet.
2. `TL4_PLUS` never selects a world below TL4.
3. `TL4_PLUS_POP_GT_500` never selects a world below TL4 or in the `Fewer than 500` population band.
4. TL4.1 qualifies for both TL4+ modes.
5. Selection is deterministic for the same seed, sector contents, and mode.
6. A mode with no eligible candidates fails clearly and never falls back silently.
7. The ship's initial location is the selected world.
8. Every selectable entity contained by the starting system receives `BASIC_SCAN`.
9. Every incident route and both of its portals receive `BASIC_SCAN`.
10. Directly connected system records receive `BASIC_SCAN` while their contained objects remain `NONE`.
11. Second-order routes and systems remain `NONE` unless independently included by another settled rule.
12. Moving the ship later does not repeat or reverse initial visibility assignment.
13. GM and player previews continue to honor the existing visibility-level content rules.

## Drill-down decisions remaining

- Default starting-world mode in the generation UI.
- Final serialized names and location of the mode and starting-world ID.
- Exact UI recovery flow after a no-candidate error.
