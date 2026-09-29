# SWN Sector: Politics, Culture, and Points of Interest

## Status and scope

This is sub-spec 4 of the [canonical projection refactor roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md). The slice is implemented. It migrated the in-memory Base sector from `merged-v6` to `merged-v7` after project organization.

This slice moves political interpretation, culture presentation, world-tag descriptions, and POI/HPOI stock content behind named Display DTOs. It also routes world completion through the application. Preserve the current generated sector and GM/player behavior except for the explicitly removed reconstructable Base fields. The unified disclosure, name, flag-asset, and scan policy is now [deferred Part 5](DEFERRED_PART_5_DISCLOSURE_NAMES_ASSETS.md). Part 6 owns the shared application-wide Display Sector DTO boundary.

## Base DTO field decisions

| Field or relationship | Decision | Reason |
| --- | --- | --- |
| `Polity.Id`, `HomeworldId`, `NiceName`, `Flag` | Keep | Identity and homeworld association are generated facts. Names may be edited independently; flag colors are random choices. Name and asset presentation are reserved for deferred Part 5. |
| `Polity.Attack`, `Defense`, `Projection` | Remove | `capabilityFor(homeworld.InhabitedInfo.TechLevel, Population)` uniquely reconstructs all three. Compute them in projection and in the generator's temporary politics working record. |
| `SystemObject.ClaimedByPolityIds` and their order | Keep | These are surviving simultaneous claims, including conquest results. Do not recompute them from the current route graph or polity capabilities. |
| `ConquestEvent.Id`, attacker/defender/target IDs, `RouteDistance`, `Attack`, `Defense` | Keep | An event records a resolved attempt and its generation-time distance and capability snapshots. Later changes to homeworld facts or routes must not rewrite that history. `RouteDistance` is route-hop distance at resolution, not the hex distance from part 2. |
| `ConquestEvent.Outcome` | Remove | The current outcome is exactly `Attack > Defense ? 'CONQUEST' : 'DEFENSE'`, so its stored value duplicates the event snapshots. Project the outcome and explanation from those snapshots. |
| `Planet.InhabitedInfo.WorldTags` | Keep | The two rolled tags are canonical choices. |
| `Planet.Culture` selected template, names, prompts, opinions, enforcement, conflicts, starport and defenses outcomes | Keep when present | These are selected results; neither world tags nor other Base fields reconstruct the particular selections. Do not reroll them during projection. |
| `Planet.Complete` | Remove | In the current contract it equals `Boolean(Culture)`; completion is represented by a non-null culture on an inhabited world. An uninhabited world has no culture field. |
| `Culture.worldTags` | Remove from the sector's stored culture shape | It duplicates the inhabited world's `WorldTags`. The standalone `swn_culture` generator may continue returning its full result; the sector adapter stores only non-derived culture fields. Projection restores the tag pair for display. |
| `Culture.adventureComponents.*.prompts[*].sourceTag` | Remove from the sector's stored culture shape | Prompt position 0 or 1 corresponds to the same position in the world's tag pair. Keep the selected `prompt` text. Projection adds its source tag for display. |
| Ordinary `PointOfInterest` identity, type, host and angle | Keep | The POI and its host are generated outcomes. Its current text and counts are derived. |
| `HabitablePointOfInterest` identity, type, host, assigned polity, angle, names, visibility and intelligence | Keep | Existing generated shells, including their random angle, must survive even when projection marks them absent. A garrison's assigned polity is a resolved relationship, not a live copy of claim order. |
| HPOI effective presence, reason, fields, claimant display and stock text | Project | These depend on current claims, TL, completion and selected culture. Do not persist `absent`, `NONE`, or any reason string. |

Do not infer an event from present claims: attempted attacks can have a `DEFENSE` outcome, and the final claim set is a separate resolved fact. A political edit changes current interpretations but does not replay the initial politics pass.

## Display DTO contracts

Add named types in `DisplayDTO/dto.ts` and pure projectors under `Projector/`. A projector receives a `Sector`, an ID, and explicit preview context only where existing text depends on preview. It returns an explicit missing/invalid result for broken references; it never calls a generator, changes a Base object, or consumes random values.

- `PolityDisplayDTO`: polity ID, homeworld ID, copied name and flag data needed by current views, and derived `attack`, `defense`, and `projection`. If the homeworld or inhabited info is missing, projection fails clearly instead of inventing zero capability.
- `PoliticalClaimsDisplayDTO`: object or system ID, ordered claimant IDs, resolved polity names/flag references, `ClaimedBy: ...` stock text, and claimant count. For a system, union object claims and sort by polity name then ID as `systemPoliticalClaimIds` currently does. For an object, preserve its canonical claim order. Use `None` for an empty set. `PlanetDisplayDTO.stock.politics` consumes the same projected claim text.
- `ConquestDisplayDTO`: event ID, resolved participant and target labels, recorded route-hop distance and attack/defense snapshots, derived outcome, and a concise GM explanation identifying the comparison. The event list remains generation history; do not imply that a present route or claim proves the event.
- `WorldTagDisplayDTO`: tag value and deterministic description. Preserve tag order and the current `No description available.` fallback for missing mapping data. The two selected tags are copied from `InhabitedInfo`.
- `CultureWorldDisplayDTO`: world ID, `complete`, displayed culture (or null), projected tag descriptions, original polity, current ordered claimants, existing starting-world/status labels, and HPOI entries. Retain the culture screen's current ordering: complete worlds first, then system/object order; its polity overview retains current claim-count and tie-break sorting.
- `PoiDisplayDTO`: POI ID, host ID, type label, generated inspector Basic text, and deterministic count contribution for the host object's `Signals Detected` line. Existing authored `Intelligence` stays an independent input and is not overwritten.
- `HabitablePoiDisplayDTO`: HPOI ID/type/host, assigned polity when present, `absent`, absence reason, typed field labels and values, claimant IDs, and Basic/Detailed/Politics/Deep/GM stock strings. Reuse the present HPOI rules: contested worlds or low TL suppress infrastructure; garrisons depend on their assigned polity's homeworld TL and patrol-boat choice. Preserve the current `NONE`, blank starport-name, and multiple-garrison display behavior.

`CultureWorldDisplayDTO` must copy selected culture values before applying effective HPOI text. The projector must not modify the Base `Culture`. An incomplete inhabited world has `complete: false`, no displayed culture, and empty HPOI culture fields, while its generated HPOI shells still exist.

## Data and dependency placement

- Split the mixed `Data/Raw/world_tags.json` roles. Keep roll identifiers, tag selection inputs and prompt lists on the generation side. Put deterministic tag-to-description content in `Data/Projection/`, with the current strings unchanged. `Generator/generation_rules.ts` and `swn_culture_impl.ts` consume only generation inputs; `CultureScreen` consumes projected tag descriptions and no longer imports `WORLD_TAG_DEFINITIONS`.
- Keep culture choice tables in `swn_culture/swn_culture_data.json` and the place-name input as generation data. A selected string is canonical even when it came from a table. Do not replace it with a deterministic lookup keyed by tag or seed.
- Keep `capabilityFor` as a single pure rule in `Helpers/Domain/politics_interpretation.ts`, shared by generator politics and projector. Generation may use a temporary capability record but emits no capability fields on `Polity`.
- Keep POI generation constraints and HPOI shell creation in `Data/Raw/` and `Generator/`. Move any display-only labels, absence text and formatting into `Data/Projection/` or `Projector/`; no UI import of raw tables.
- Preserve part 2's hex-route projection separately. A conquest event's stored route-hop distance is historical and must never be substituted with hex distance.

## Application command and UI cutover

Add `PrototypeApplication.completeWorld(index, worldId)` as the only UI-facing completion operation. It validates the sector index and inhabited world ID, invokes the existing `Generator/culture.ts` action, stores the returned Base sector, and returns the fresh canonical sector plus its projected culture/politics/POI read results (or a clear failure). Repeating completion is idempotent and must not reroll culture. The application must not expose a path where a render calls `completeWorld`.

`CultureScreen` receives projected culture and polity rows plus an `onCompleteWorld(worldId)` command callback. `App` wires that callback to `PrototypeApplication`, then updates its in-memory sector state with the returned Base result and renders newly projected DTOs. Keep the culture tab GM-only as it currently is; a unified disclosure contract is deferred.

Move covered display derivations out of `CultureScreen`, `DetailBar`, `HexMap`, `SymbolicSystem`, and `TopDown`: claim unions and text, world-tag descriptions, HPOI presence/field text, POI stock labels/counts, and claimant flag data come from projectors. Layout, expanding drawers, click handling, and the existing overlay toggle remain UI concerns. `UI/domain/sector/selectors.ts` must no longer own `systemPoliticalClaimIds`; `UI/domain/sector/validation.ts` must call the domain validation boundary for flag colors rather than import `Data/Raw/polity_flag_colors.ts`.

The current `planet_projection.ts` and `culture_projection.ts` may be extended or split, but every new public result has a named type in `DisplayDTO/`. Reuse one claim projector so the culture screen, maps and inspector cannot disagree about the same current claim set. Do not add a whole-app `DisplaySectorDTO` yet.

## Validation and schema transition

Emit `merged-v7` Base sectors after the cutover. The prototype currently holds sectors in memory; update generator output, type contracts, fixtures, and `Validation/invariants.ts` shape checks without adding an external data migration. Remove unknown-schema allowances for `Polity.Attack/Defense/Projection`, `ConquestEvent.Outcome`, `Planet.Complete`, and the two redundant stored culture fields. Validate culture presence on inhabited worlds, selected prompt tuples and references, event snapshot values, event target ownership, and HPOI host/assignment references. Do not require historical event snapshots to equal *current* polity capability or present route reach, because those may change after generation. Keep the UI's save-time validation aligned with these rules.

Before removing fields, compare fixed-seed `merged-v6` sectors with `merged-v7` after stripping only the listed fields and version. The sequence of generated IDs, claims, flags, culture choices, POI/HPOI shells and angles, and conquest snapshots must stay the same. Test the standalone culture generator's full output separately from the sector's slimmer stored culture shape.

## Implementation sequence

1. Add projection data for world-tag descriptions, named Display DTOs, and pure projectors for capabilities, claims, conquest explanations, world tags, culture and POIs. Compare each against current GM and player output before changing Base fields.
2. Change `CultureScreen`, the covered `DetailBar` branches, map/system political overlays, and POI views to use the projected results. Add and wire the application world-completion command; verify repeated completion does not draw again.
3. Remove the identified reconstructable Base fields, adapt generator output and the sector culture adapter, update validation and test fixtures, then bump to `merged-v7`.
4. Run fixed-seed, projection, command, UI and invariant checks; record any remaining direct Base reads for parts 5 and 6.

## Acceptance tests

1. Repeated projection of the same `merged-v7` sector and preview is deeply equal and does not mutate the Base sector or call randomness.
2. Every polity's projected capability equals the old `capabilityFor` result. Changing a homeworld's tech/population changes the current capability display without altering recorded conquest snapshots or claims.
3. Fixed-seed claims, flag colors, event IDs, route-hop snapshots, attack/defense snapshots, selected culture content, and POI/HPOI IDs and angles match `merged-v6`. Projected event outcome matches the old stored outcome.
4. Empty, single and contested claim sets have the same object/system stock text, ordering and flags across culture screen, inspector and overlays. Missing references produce an explicit invalid result.
5. Every generated world tag retains its existing description and order. The UI imports no generation table for descriptions.
6. HPOI absence and text match current behavior for incomplete worlds, contested claims, below-TL4 infrastructure, assigned-polity TL, no patrol boats, and one versus multiple garrisons. Reprojection never alters stored culture.
7. Completing an eligible world through `PrototypeApplication` changes only that world's culture state, is repeatable and idempotent, returns a newly projected result, and leaves visibility and unrelated worlds unchanged. Invalid IDs fail clearly. `CultureScreen` never imports a generator.
8. New sectors have no removed Base fields and pass updated invariants; invalid culture/POI/event references fail validation. Type check, SWN sector and culture tests, and production build pass.

## Direct Base reads left for later slices

This slice may leave UI reads of `Sector` for navigation, layout coordinates, scan filtering, names, authored intelligence, flag rendering, portrait assets, player-ship state and edit drafts. Disclosure, names, and remaining assets are deferred; part 6 will replace the remaining UI Base-sector read boundary with one shared DTO. List any additional direct reads discovered during implementation in the part 6 checklist.

## Implementation evidence

- The fixed-seed Part 2 comparison reconstructs the `merged-v5` serialized shape from `merged-v7` and retains the three existing hashes. This covers the removed fields without accepting new generated choices.
- SWN sector and standalone culture tests pass (29 files, 135 tests), including Part 4 projection and application-command tests.
- Type checking and the Vite production build pass. Managed-browser interaction confirmed that the GM culture screen rendered 27 worlds, completing one world reduced the incomplete count from 23 to 22, and the browser reported no console errors.
