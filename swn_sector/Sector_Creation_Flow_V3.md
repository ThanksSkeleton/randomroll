# Sector Creation Flow — V3

## Status and relationship to V2

V3 is V2 with two additional layers of system detail: a primary-star result for every star system and physical elaboration for every inhabited world. Except where this document explicitly changes it, every V2 rule, constraint, table interaction, exclusion, and completion condition remains in force. The canonical V2 baseline is [Sector_Creation_Flow_V2.md](Sector_Creation_Flow_V2.md).

In particular, V3's calculated environmental Hab is the minimum of every generated result with a `hab` rating: atmosphere, temperature, Terran biosphere, terrestrial size, and bulk composition. It must be at least the `habRequired` of Terran biosphere, Population, and Tech Level. Terran Biosphere None requires Hab 0; every other Terran-biosphere result requires Hab 1. Native biosphere has no Hab effect. Future generated Hab-rated fields also participate in this minimum. Atmosphere, population, and native-biosphere constraints use V3 percentile cutoffs; tech-level constraints compare the selected `tl` value in `world_tag_constraints.json`. V3 deliberately changes the sector-wide ordering so that all world tags precede all later world and star generation.

## Scope

V3 generates a sector with the same inhabitants and base world characteristics as V2, plus:

- one primary star classification for every system; and
- terrestrial, orbital, compositional, water, gas-giant-moon, and tidal-locking elaboration for every inhabited world.

The first inhabited world assigned in step 1b is the **primary inhabited world**. Every inhabited world receives V3 physical elaboration. A system's primary star is not necessarily the only star in a real astronomical system; companion stars, multiplicity, flare activity, luminosity, age, and other individual stellar properties are out of scope.

```text
Create sector grid
  → 1a: place stars
  → 1b: assign 1–3 inhabited worlds to every star
  → 2: generate world tags for every inhabited world
  → 3: generate each inhabited world's attributes, name, and applicable planet-level detail
  → 4: generate each system's primary star
```

## 1a. Place stars

1. Use the standard 8-wide by 10-high sector grid.
2. Roll `1d10 + 20` to determine the total number of stars.
3. Place every star in a randomly selected valid grid hex.
4. If a selected hex already contains a star, retry until an empty hex is selected.

V3 retains V2's deliberate omission of the book's special occupied-hex placement direction, half-hex handling, and stellar-clump connection instruction. Positions are a random set of non-overlapping grid hexes.

## 1b. Assign inhabited worlds

Every star system has at least one primary inhabited world. Independently for each star system, select one of these mutually exclusive outcomes:

| Probability | Inhabited worlds in system |
| --- | --- |
| 85% | 1 |
| 10% | 2 |
| 5% | 3 |

The first inhabited world is the system's primary world. Additional inhabited worlds are generated independently in step 2, with no origin, relationship, contact point, or other inter-world detail in V3. Every temperature result declares an `orbitalOrder`. After all worlds in a system have temperature orbital orders, assign orbit slots left to right in descending `orbitalOrder`; ties retain generated-world order.

## 2. Generate world tags

World tags are the narrative core of V3 generation. Before generating an atmosphere, other world attribute, physical planet detail, or star, generate both tags for **every** inhabited world in the sector. The selected tags establish the constraints that bend all later world generation around their narrative result.

| Order | Action | Table/data interaction | Output |
| --- | --- | --- | --- |
| 2.1 | Roll the first world tag. | `world_tags.json`: one `d100` selection from tags allowed by the world’s `ALIEN` state. | `tag1` record and constraints. |
| 2.2 | Roll the second, different world tag. | `world_tags.json`: one further eligible selection compatible with `tag1`; retry otherwise. | Distinct `tag2` record and combined constraints. |

Complete steps 2.1–2.2 for one world, then repeat them for every remaining inhabited world. Only after this sector-wide tag pass is complete may step 3 begin.

## 3. Generate worlds around their tags

After the sector-wide tag pass, generate each inhabited world in turn. Its existing tag pair and combined constraints govern every applicable later selection. Complete one world before proceeding to the next.

| Order | Action | Table/data interaction | Output |
| --- | --- | --- | --- |
| 3.1 | Roll atmosphere. | `world_attributes_2.json`, `tables[id="atmosphere"]`: one compatible `d100` result that permits valid completion. | Atmosphere. |
| 3.2 | Roll temperature. | `world_attributes_2.json`, `tables[id="temperature"]`: one compatible `d100` result that permits valid completion. | Temperature and eligible thermal orbits. |
| 3.3 | Roll native biosphere. | `world_attributes_2.json`, `tables[id="native_biosphere"]`: one compatible `d100` result. It has no Hab effect; native-biosphere tag constraints apply here. | Native biosphere. |
| 3.4 | Roll Terran biosphere. | `world_attributes_2.json`, `tables[id="terran_biosphere"]`: one compatible `d100` result that permits valid completion. | Terran biosphere. |
| 3.5 | Roll population. | `world_attributes_2.json`, `tables[id="population"]`: one compatible `d100` result. | Population. |
| 3.6 | Roll tech level. | `world_attributes_2.json`, `tables[id="tech_level"]`: one compatible `d100` result. | Tech level and `habRequired`. |
| 3.7 | Construct the world name. | No source table. | `TAG1_TAG2_XYZ`. |
| 3.8 | Roll terrestrial size. | `world_attributes_2.json`, `tables[id="terrestrial_size"]`: one `d100` result. | Terrestrial size. |
| 3.9 | Elaborate the inhabited world. | Primary Inhabited World table; see below. | Remaining physical-detail record. |

`XYZ` is a random inclusive `000`–`999` value. `TAG1` and `TAG2` are rolled tag names normalized by replacing spaces with underscores. V3 performs no name-collision correction.

The V3 constraints remain mandatory: Tag 2 is distinct and compatible; each later selection must preserve a valid completion; population and tech level cannot require more environmental Hab than the world’s Hab-rated fields provide. Direct table requirements are inclusive d100 cutoffs. Native-biosphere requirements are Hostile Biosphere 20+, Beastmasters 60+, Night World 60+, and Primitive Aliens 60+. The `ALIEN`/`NONTERRESTRIAL` tag-state rules and ALIEN inclusion state are unchanged; population has no separate Alien Inhabitants outcome.

### 3.8. Roll terrestrial size

Every inhabited world receives a terrestrial size from `world_attributes_2.json`, `tables[id="terrestrial_size"]`, using one compatible `d100` roll: Luna (Hab 1) on 1–3; Mars (Hab 2) on 4–17; Super-Earth (Hab 2) on 18–25; and Earth (Hab 3) on 26–100. The result is stored with the world, controls its displayed planet size, and participates in calculated environmental Hab.

### 3.9. Elaborate the inhabited world

Perform this step after 3.8 for every inhabited world. Terrestrial size is already generated for every inhabited world; this step stores the following remaining V3 elaboration fields alongside that world:

| Field | Allowed values | Source status |
| --- | --- | --- |
| Thermal orbit | Too Hot; Hot; Temperate; Cold; Too Cold | `thermalOrbit` on the selected temperature result in `world_attributes_2.json` |
| Bulk composition | Sulfur; Carbon; Iron; Silicon; Water; Magnesium; Calcium-Aluminum | `world_attributes_2.json`, `tables[id="bulk_composition"]` |
| Surface water present | Yes; No | `world_attributes_2.json`, `tables[id="surface_water_present"]` |
| Moon of gas giant | Yes; No | `world_attributes_2.json`, `tables[id="gas_giant_moon"]` |
| Tidal locking | True; False | Derived from primary-star type |

Temperature is a `d100` dependent attribute. Its selected row has one `thermalOrbit` value: Too Hot and Too Cold remain extreme slots; Hot, Temperate, and Cold are distinct thermal descriptions within the broader Goldilocks region used by V4. Titan-Pluto is intentionally omitted because Too Cold covers that territory.

Bulk composition is a compatible `d100` V3 world field. Its results describe the planet's bulk material rather than surface deposits or terrain; its `hab` participates in calculated environmental Hab.

Surface water present is a `d100` world field: No on 1–25 and Yes on 26–100. Cryogenic or Volcanic temperature and Vacuum atmosphere override the table to No. Otherwise, Water bulk composition and the Oceanic World or Seagoing Cities tag override it to Yes. When conditions conflict, the environmental No overrides take precedence.

Gas-giant moon is a `d100` world field: Yes on 1–10 and No on 11–100. Tidal locking is derived after the system’s primary star is selected: it is true for M-type stars and false for every other star type.

The source table supplies no dice weights or cross-field restrictions for the remaining physical fields. Therefore V3 must preserve these as **unresolved generation rules** rather than inventing probabilities or physical constraints:

- any relation between these fields and V3 atmosphere, temperature, either biosphere table, environmental Hab, or the star Hab Score.

Until those rules are approved, V3 can represent the fields in its schema and UI but must not claim an authoritative randomized elaboration. This is intentional: the available V3 tables define categories, while V2's existing rolls and constraints remain authoritative.

## 4. Generate primary stars

Only after every inhabited world's tags, attributes, name, and physical elaboration have been generated, classify the primary star for every system. The star is deliberately generated last: it is a dependent variable that describes and supports the completed world narrative rather than leading it.

Each system receives exactly one primary-star classification. Calculate the system's required star Hab as the highest calculated environmental Hab among its inhabited worlds; its required habitable slots equal its number of inhabited worlds. Then make one weighted `d100` selection from `star_types.json`, `tables[id="star_type"]`, limited to star types whose `hab` is greater than or equal to the required star Hab **and** whose `habitableSlots` is at least the required habitable slots. Reroll an ineligible result. This makes star type dependent on the completed worlds in the same way that population and tech level depend on environmental Hab.

| Roll | Hab Score | Habitable slots | Type | Example | Description / justification |
| --- | ---: | ---: | --- | --- | --- |
| 01–04 | 1 | 1 | A-type (includes B/O) | Sirius A | Hot, luminous main-sequence stars; viable temperate terrestrial worlds are possible, but UV and shorter lifetimes make naturally Earthlike worlds less likely. |
| 05–16 | 2 | 2 | F-type | Procyon A | Hotter and more luminous than Sol; temperate terrestrial worlds remain plausible despite greater UV exposure. |
| 17–46 | 3 | 3 | G-type | Sol | Sun-like baseline for long-term temperate terrestrial environments. |
| 47–76 | 3 | 2 | K-type | Alpha Centauri B | Cooler, stable, long-lived stars with favorable habitable zones. |
| 77–88 | 2 | 1 | M-type | Proxima Centauri | Red dwarfs; temperate worlds are plausible, with close-orbit tidal, atmospheric, and activity complications. |
| 89–92 | 1 | 1 | Giant (includes subgiants) | Pollux | Evolved stars with outward-shifted habitable zones; Earthlike worlds are unusual. |
| 93–96 | 0 | 0 | White dwarf | Sirius B | Compact remnant; worlds and temporary habitable zones are possible but naturally Earthlike worlds are exceptional. |
| 97–98 | 0 | 0 | Neutron star | PSR B1257+12 | Planet-hosting remnant whose formation history and radiation make Earthlike conditions highly improbable. |
| 99–00 | 0 | 0 | Stellar-mass black hole | Gaia BH1 | A conventional naturally Earthlike world requires unusual circumstances or another luminous companion. |

The primary-star Hab Score is stored as system metadata. It does not add to or replace any world's calculated environmental Hab, but it must meet the system's required star Hab. As a result, a system with any Hab 3 inhabited world can roll only a G-type or K-type primary star; a system whose highest inhabited-world Hab is 2 can additionally roll F- or M-type stars; and a system whose highest inhabited-world Hab is 0 can roll any star type. Every star type also records `habitableSlots`: the total number of temperate-ish planets that can exist in that system. V3 requires the selected star to have at least one habitable slot per generated inhabited world.

## Table-interaction matrix

| Data file / source | Used at flow step | Dice/mechanism | Uses | Role |
| --- | --- | --- | --- | --- |
| `world_tags.json` | 2.1–2.2 | Two filtered `d100` rolls | 2 per inhabited world | Supplies two distinct compatible world tags before all other world generation. |
| `world_attributes_2.json` | 3.1–3.6, 3.8–3.9 | One filtered `d100` roll for each applicable table | 10 per inhabited world | Supplies atmosphere, temperature, native biosphere, Terran biosphere, population, tech level, terrestrial size, bulk composition, surface water, and gas-giant-moon status after tags are fixed. |
| Primary-world table (`temp/planets_table.txt`) | 3.9 | Category schema only; selection rules pending | 1 record per inhabited world | Defines the remaining physical elaboration fields and their allowed values. |
| `star_types.json` | 4 | Filtered weighted `d100`; star `hab` must meet the highest inhabited-world environmental Hab and `habitableSlots` must meet the inhabited-world count | 1 per system | Supplies the primary-star type and dependent Hab Score after all worlds are complete. |

`system_points_of_interest.json` remains intentionally unused in V3.

## Explicit V3 exclusions

- Extra worlds, asteroid belts, comets, and system points of interest; these are V4 scope.
- Secondary-world origin, relationship, and contact prompts.
- Companion stars, stellar multiplicity, flare activity, luminosity, age, or other individual star properties.
- Unapproved distributions, cross-field constraints, and tidal-locking derivation for physical elaboration.
- Contact lines, trade routes, polities, important-world detail, inter-world/inter-polity relations, and factions.
- Compatibility or explanation rules beyond the declared V2 world-tag constraints and the V3 star-Hab dependency.

## V3 completion conditions

A V3 sector meets V2 completion conditions: every placed star has one to three inhabited worlds, and every inhabited world has two distinct compatible tags, six compatible attributes, a generated name, an orbit slot determined by descending temperature `orbitalOrder`, and a V3 physical-elaboration record. Every system additionally has one weighted primary-star classification from `star_types.json`, whose Hab Score is at least the highest calculated environmental Hab of its inhabited worlds and whose habitable slots meet its inhabited-world count. No V4 information is implicitly generated.

## Change verification and artifact handoff

Every V3 change to generation code, generation data, constraints, or tests must run the relevant automated test before handoff. The V3 generator test is `npx vitest run src/test/swn_sector_v2.test.ts`; it must produce and validate the deterministic artifact at `/tmp/randomroll-swn-sector-v3.json`. The handoff for each change must provide that artifact to the user. Changes to TypeScript production code must also pass `npx tsc --noEmit`.
