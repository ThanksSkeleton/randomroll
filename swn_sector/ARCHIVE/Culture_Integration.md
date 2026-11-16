# Culture Integration Specification

## Purpose and scope

Integrate the existing `swn_culture` generator into the SWN sector. An **habitable world** in this specification means an inhabited `Planet` or moon (`InhabitedInfo !== false`), matching the sector's starting-world and politics rules. The existing generator supplies structured prompts and table results; this feature does not synthesize stories or GM-authored prose.

The culture record belongs to a world, survives name and visibility edits, and is generated at most once. World-linked **Habitable Points of Interest** (HPOIs) make the relevant infrastructure inspectable on the existing system maps. There is one HPOI for each infrastructure type, except that a contested world has one Garrison HPOI per contesting polity. This feature introduces a GM-only Culture screen in the top navigation beside Sector Archive.

## Existing contracts to preserve

- `swn_culture` exposes `generateSwnCultureForTags(worldTags, seed)` and returns the shape in `SwnCulture`. The sector must pass the inhabited world's existing two `WorldTags`; it must not roll a replacement pair.
- `Planet.InhabitedInfo` holds those tags, population, and `TechLevel`. `TECH_LEVEL` maps the canonical tech strings to numeric values, including `4.1` for Postech with specialties. A TL 4 threshold means `TECH_LEVEL[value] >= 4`.
- The starting-world visibility pass in `generate.ts` runs after politics and grants `BasicScan` to the starting system's objects and neighboring systems' objects. Visibility is four independent flags with prerequisites, not one ordered level.
- Politics creates one original polity per inhabited world and stores surviving claims in `ClaimedByPolityIds`. A conquered world can have several surviving foreign claims, so a singular owner cannot be inferred in every case.
- Ordinary `PointOfInterest` records explicitly exclude inhabited hosts and have a two-to-five-per-system and three-per-host limit. HPOIs therefore require their own entity type and collection; do not add them to `StarSystem.PointsOfInterest` or its generation count.
- The current sector archive is synchronous and in memory (`PrototypeApplication`); `saveSector` is the existing save boundary. This specification concerns persistence through that boundary and the sector model, without implying browser storage that the prototype does not have.

## Data model

Add `Complete: boolean` and `Culture: SwnCulture | null` to inhabited `Planet` records, or an equivalent typed inhabited-world variant. An uninhabited planet has neither field. Preserve the entire structured `SwnCulture` result, including the tag-attributed adventure prompts, names, law enforcement, starport, and defenses. `Complete === false` requires `Culture === null`; `Complete === true` requires a culture record whose `worldTags` equal the world's `InhabitedInfo.WorldTags` in order. Blanks on the Culture screen are a rendering of `null`, not empty placeholder results stored as culture.

The world's `Culture` is the **single source of generated values**. HPOIs refer to it through `ParentWorldId`; they do not store copies of culture fields. When the culture is completed, its values are applied to the HPOI readouts through a shared projection function. Culture-screen and inspector readouts use that same function, including any `NONE` exceptions.

Add `StarSystem.HabitablePointsOfInterest: HabitablePointOfInterest[]`, separate from ordinary POIs. Each HPOI is selectable and contains:

```ts
type HabitablePointOfInterestType =
  | 'Orbital Station'
  | 'Starport'
  | 'Planetary Defenses'
  | 'Garrison';

interface HabitablePointOfInterest extends SelectableEntity {
  ParentWorldId: Guid;
  HPOIType: HabitablePointOfInterestType;
  // Required for Garrison; null for the other three types.
  AssignedPolityId: Guid | null;
  AngleDegrees: number;
}
```

All HPOIs have the same `Visibility` and `Intelligence` fields as other selectable entities. These intelligence fields hold only GM-authored text; generated culture values are read from the parent world. Their portrait is the existing **NO DATA** treatment, regardless of visibility or culture completion; no portrait asset is assigned. The `ParentWorldId` is an inhabited planet in the same system. Names and IDs are stable, deterministic, and independent of the world's editable `NiceName`. Garrison IDs include the assigned polity ID so several Garrison HPOIs around one world remain distinct.

Create three non-Garrison HPOI shells for **every** inhabited world during sector generation, including incomplete worlds and inhabited moons. Create one Garrison shell for each polity in the world's surviving `ClaimedByPolityIds`. This yields four HPOIs for a singly claimed world, three plus the number of contesting polities for a contested world, and three for an unclaimed world. All four visibility flags initially are `false`. Before completion, every generated culture readout is blank. The shells appear in GM view; none appear in player view until the GM grants visibility. Completion makes their readouts available without changing their IDs or any visibility edits. A world with no surviving polity has no Garrison to assign.

### HPOI content mapping

| HPOI | Structured values from `SwnCulture` | GM label/source table |
| --- | --- | --- |
| Orbital Station | `planetaryDefenses.orbitingStationStyle`, `.orbitingStationType`, `.tradeAndSmugglingEnforcementAmount`, `.customsAndVisaEmphasis` | Orbiting Station Styles/Types; Trade and Smuggling Enforcement Amounts; Customs and Visa Emphasis |
| Starport | `majorStarport.type`, `.name` | `starport_types`; Starport Name |
| Planetary Defenses | `planetaryDefenses.planetaryGunTurrets` | Planetary Gun Turrets |
| Each Garrison | `planetaryDefenses.patrolBoatPresence`, evaluated against that Garrison's assigned polity TL | Patrol Boat Presence |

The three non-Garrison HPOIs derive their polity claims from the parent world. Each Garrison is assigned to exactly one surviving polity and shows that polity alone, including its name and flag. Preserve the original polity separately through `Sector.Polities[*].HomeworldId`; conquest must not rewrite it. If a future editing feature changes a world's claims, reconcile its Garrison set atomically with those claims: retain matching Garrison IDs and visibility, add one for each new claimant, and remove those for former claimants. Render polity names and flags from IDs, not duplicated text.

### Tech exceptions and ownership

Apply exceptions when projecting the world's stored culture to its screen and HPOI readouts. Do not alter the canonical `swn_culture` table data, change the stored rolled result, or consume alternate random rolls to find a permitted value. The projected value is `NONE` wherever an exception applies.

- **Contested world:** If `ClaimedByPolityIds` contains more than one polity, suppress Orbital Station, Starport, and Planetary Defenses regardless of original TL. Their applicable fields display `NONE`; the starport name is blank. Keep those HPOI records but hide them on both maps. Retain one Garrison HPOI for **each** contesting polity, assigned to that polity.
- **Original polity TL < 4:** Also suppress Orbital Station, Starport, and Planetary Defenses regardless of the claim count. Their applicable fields display `NONE`; the starport name is blank. This rule uses the world's original generated `InhabitedInfo.TechLevel`, even if it has been conquered.
- **Assigned polity TL < 4:** Suppress only that polity's Garrison HPOI and display `NONE` for its Patrol Boat Presence. Read its TL from its `HomeworldId` planet. Other contesting polities' Garrisons are evaluated independently and may remain present.
- A natural `None` result from the Patrol Boat Presence table suppresses each Garrison that would otherwise be present. A `None` result for **Trade and Smuggling Enforcement Amount** means no enforcement, not no orbital station; preserve the station and its other results unless a contested-world or original-TL rule suppresses it.
- Suppression is derived from the world, its current claims, and the culture result. Reopening the Culture screen, changing visibility, or loading the sector must not expose a suppressed HPOI. The one rolled Patrol Boat Presence value is applied to every eligible Garrison; it is not rerolled per polity. On a contested world, display Patrol Boat Presence separately for each assigned polity so low-TL `NONE` and eligible results can coexist.

## Generation and completion order

1. Generate systems, routes, and ordinary POIs using the existing procedure.
2. Resolve politics and establish each world's original polity and surviving claims.
3. Select the starting world and assign initial visibility as today.
4. Create three non-Garrison HPOI shells and one Garrison shell per surviving claimant for every inhabited world. Link each shell to its world and, for Garrisons, to its assigned polity.
5. For every inhabited world with `Visibility.BasicScan === true` **at the end of initial visibility assignment**, generate and store culture and set `Complete: true`. All other inhabited worlds start with `Complete: false` and blank generated culture fields. HPOI readouts and suppression are derived from the completed world's culture and the rules above.

Use a per-world deterministic child seed derived from `Sector.OriginalSeed` and the stable world ID, with a culture-specific namespace. This keeps results independent of iteration order, other worlds' visibility, and later completion timing. The standalone culture page retains its own seed-only mode; sector integration always calls the supplied-tags mode. A culture-generation failure must leave that world incomplete rather than storing a partial result. Sector generation should surface a failure rather than silently produce a sector that violates the completed-world invariant.

**Complete is not a visibility flag.** A later GM change to world visibility does not generate culture automatically, change `Complete`, or reveal any HPOI. An incomplete world may be made visible; its generated culture remains blank until the GM presses its completion button. Completion does not change the world or HPOI visibility flags. There is no reroll or automatic re-completion of an already complete world.

The completion command must be a single sector update: verify an inhabited, incomplete world; generate from its current two World Tags and stable seed; store the culture; set `Complete: true`; then save through the application boundary and update UI state. The HPOIs immediately read their projected values from that world. Repeated clicks or a completed-world command are no-ops. If the GM edits World Tags later, the existing culture is not silently regenerated; a separate explicit editing policy is needed before tag editing can be enabled.

## Culture screen

Add a **CULTURE** tab to the existing top row containing SECTOR and SECTOR ARCHIVE. It is available only to the GM session in GM preview. Switching to player preview while it is open returns to the sector view and clears any selected or draft GM content, as Sector Archive currently does. The screen acts on the active loaded sector, not the archive selection. It lists every inhabited world and moon, grouped by system in a stable order, with a clear starting-world marker if applicable.

For each world, show its name and location, `Complete` status, and the same four visibility flags with the same names, prerequisite behavior, and edit controls used elsewhere. Also show the text for all four scan fields and the GM information field, so the screen replicates the world's visibility information rather than only its switches. Show the existing world facts useful for interpreting culture: World Tags, population, TL, original polity, and current claims. A completed world displays **every** field of its stored `SwnCulture`: cultural template and homeworld name; both source-tag prompts for each adventure component plus generated names/gender/place name; PC care-about category/type/commodity size; biggest conflict category/details; outsider opinion; law enforcement amount/style/special law; starport type/name; and all six planetary-defense fields. Use the shared projection for effective `NONE` values, and show Patrol Boat Presence by assigned polity when there are multiple Garrisons. Display all of the world's HPOIs beneath it with their type, visibility flags and scan/GM text, polity assignment or claims, presence/absence, and effective generated readouts.

For an incomplete world, keep every generated culture value and HPOI detail cell blank (an em dash is an acceptable visual blank), show its HPOI shells, and offer **GENERATE CULTURE / COMPLETE WORLD**. Existing user-authored scan and GM text still displays. The button is GM-only and disabled while a completion transaction is running. For a complete world, show its saved values and no generation button. Display `NONE` for values suppressed by contest or tech rules, with the reason visible to the GM. Treat this screen as a management surface for structured generated data; existing GM `Intelligence.GM` notes remain editable through the normal inspector.

## Current map and inspector presentation

- Extend both symbolic and top-down system viewers to position each HPOI close to its parent planet or moon without changing the ordinary POI count or orbital model. Give each of the four types a distinct short label or symbol and a selectable target. Avoid overlap with the world, ship, and existing POIs. Sector hexes may continue to summarize systems without individual HPOI glyphs.
- GM preview shows present HPOIs even when their player visibility is off, including unpopulated shells. A suppressed HPOI is hidden from both map previews and identified as `NONE` on the Culture screen. Player preview shows a present HPOI only if its own `BasicScan` is enabled **and** its parent world is player-visible. Visibility of a parent never automatically grants HPOI visibility.
- Selecting an HPOI uses the existing inspector and GM visibility controls. Basic Scan shows its HPOI type and public physical details (station style/type, starport type/name, turret type, or patrol presence). Politics Scan shows the parent world's claims and flags for the three non-Garrison types; a Garrison shows only its assigned polity. Deep Politics Scan may show the station's enforcement/customs details. The GM tab shows all projected HPOI values and the existing GM note. No HPOI field appears in player view before its corresponding flag is enabled.
- On a **complete** world, the existing world inspector's GM section shows the full structured culture record or a clear link to its Culture screen entry. Its player-facing Deep Politics section may show the cultural template, outsider opinion, law enforcement, and biggest-conflict category/details when that world's `DeepPoliticsScan` is enabled. Adventure component prompts, generated Enemy/Friend names, and PC care-about results remain GM-only prompts. An incomplete world's constructed culture sections stay blank even if a scan flag is enabled.
- The `NO DATA` portrait appears for every selected HPOI in GM view and for a visible HPOI in player view. The player cannot navigate to a hidden HPOI by selection, search, or a stale selected ID.

## Validation, compatibility, and acceptance

Update the merged schema, generation invariants, UI validation, selectors, object-kind labels, deletion rules, map renderers, inspector, navigation state, and application save path. Schema validation should require exactly one of each non-Garrison HPOI type and exactly one Garrison per surviving claimant, unique stable IDs, correct same-system parent references, valid visibility dependencies, Garrison assignments matching the parent's claim set, and `Complete`/culture consistency. Ordinary POI limits and host restrictions continue to apply **only** to ordinary POIs. Deleting an inhabited world or its system removes its HPOIs and relevant polity references as allowed by the editor's existing integrity rules; an HPOI cannot be detached and reparented to a different world. Bump the sector schema version and provide an explicit migration or explicit rejection for older sector data if persisted-sector loading is added; do not silently treat absent `Complete` as `true`.

Acceptance checks:

1. A newly generated sector completes exactly the inhabited worlds with `BasicScan` at generation time; all other inhabited worlds have blank culture and hidden HPOI shells: three non-Garrison shells plus one per surviving claimant.
2. Completing an unseen world once stores its entire culture deterministically without changing visibility. Every HPOI reads its values from that culture. Saving/loading through the current application boundary retains the result and cannot reroll it.
3. The Culture screen lists every inhabited world, shows all four visibility flags, their scan text, GM text, and every culture/HPOI field, and is inaccessible in player preview.
4. A contested world suppresses station, starport, and turret HPOIs and has a distinct Garrison HPOI for each contesting polity. Original TL below 4 also suppresses station, starport, and turret HPOIs. An assigned polity's TL below 4 or a natural patrol `None` suppresses its Garrison. Suppressed fields display `NONE` and suppressed HPOIs never render on maps.
5. Each Garrison is assigned to one surviving claimant; other HPOIs reflect the parent world's claims. Player maps and inspector reveal only present HPOIs and fields whose own visibility prerequisites are met.
6. Ordinary POI generation counts, host restrictions, portraits, and existing starting-world and politics behavior remain valid after integration.

## Source of truth

- [Standalone culture generator specification](../../swn_culture/SPEC.md) and `src/generators/swn_culture/swn_culture_impl.ts`
- `src/generators/swn_sector/merged_schema.ts`, `generate.ts`, `politics.ts`, `tables.ts`, and `invariants.ts`
- [Starting-world visibility specification](STEP_3_STARTING_WORLD_SPEC.md), [politics specification](STEP_4_POLITICS_SPEC.md), and [visibility rework](VISIBILITY_REWORK_SPEC.md)
