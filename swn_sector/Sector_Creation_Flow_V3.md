# Sector Creation Flow — V3

## Status and relationship to V2

V3 is V2 with two additional layers of system detail: a primary-star result for every star system and a physical elaboration for each system's first (primary) inhabited world. Except where this document explicitly changes it, every V2 rule, constraint, table interaction, exclusion, and completion condition remains in force. The canonical V2 baseline is [Sector_Creation_Flow_V2.md](Sector_Creation_Flow_V2.md).

In particular, V3's calculated environmental Hab is the minimum of atmosphere, temperature, and biosphere; it must be at least both Population Hab and Tech Level `habRequired`. Direct table constraints use the V3 percentile cutoffs in `world_tag_constraints.json`. V3 deliberately changes the sector-wide ordering so that all world tags precede all later world and star generation.

## Scope

V3 generates a sector with the same inhabitants and base world characteristics as V2, plus:

- one primary star classification for every system; and
- terrestrial, orbital, compositional, water, gas-giant-moon, and tidal-locking elaboration for the primary inhabited world in every system.

The first inhabited world assigned in step 1b is the **primary inhabited world**. Any second or third inhabited world remains a complete V2 world, but receives no V3 physical elaboration. A system's primary star is not necessarily the only star in a real astronomical system; companion stars, multiplicity, flare activity, luminosity, age, and other individual stellar properties are out of scope.

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

The first inhabited world is the system's primary world. Additional inhabited worlds are generated independently in step 2, with no origin, relationship, contact point, or other inter-world detail in V3. Assign orbital slots in generated-world order: the first world uses slot 2 (middle), the second uses slot 1 (inner), and the third uses slot 3 (outer).

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
| 3.3 | Roll biosphere. | `world_attributes_2.json`, `tables[id="biosphere"]`: one compatible `d100` result that permits valid completion. | Biosphere. |
| 3.4 | Roll population. | `world_attributes_2.json`, `tables[id="population"]`: one compatible `d100` result. | Population. |
| 3.5 | Roll tech level. | `world_attributes_2.json`, `tables[id="tech_level"]`: one compatible `d100` result. | Tech level and `habRequired`. |
| 3.6 | Construct the world name. | No source table. | `TAG1_TAG2_XYZ`. |
| 3.7 | Roll terrestrial size. | `world_attributes_2.json`, `tables[id="terrestrial_size"]`: one `d100` result. | Terrestrial size. |
| 3.8 | Elaborate the primary inhabited world, when applicable. | Primary Inhabited World table; see below. | Remaining primary-world detail record. |

`XYZ` is a random inclusive `000`–`999` value. `TAG1` and `TAG2` are rolled tag names normalized by replacing spaces with underscores. V3 performs no name-collision correction.

The V3 constraints remain mandatory: Tag 2 is distinct and compatible; each later selection must preserve a valid completion; population and tech level cannot require more environmental Hab than atmosphere, temperature, and biosphere provide. Direct table requirements are inclusive d100 cutoffs. The `ALIEN`/`NONTERRESTRIAL` tag-state rules and ALIEN inclusion state are unchanged; population has no separate Alien Inhabitants outcome.

### 3.7. Roll terrestrial size

Every inhabited world receives a terrestrial size from `world_attributes_2.json`, `tables[id="terrestrial_size"]`, using one `d100` roll: Luna (Hab 1) on 1–3; Mars (Hab 2) on 4–17; Super-Earth (Hab 2) on 18–25; and Earth (Hab 3) on 26–100. The result is stored with the world and controls its displayed planet size. Size Hab is retained as V3 metadata; it does not yet alter the established calculated environmental-Hab formula.

### 3.8. Elaborate the primary inhabited world

Perform this step only once per system, after step 3.7, for its first inhabited world. Terrestrial size is already generated for every inhabited world; this step stores the following remaining V3 elaboration fields alongside the primary world:

| Field | Allowed values | Source status |
| --- | --- | --- |
| Thermal orbit | Too Hot; Hot; Temperate; Cold; Too Cold | `thermalOrbits` on the selected temperature result in `world_attributes_2.json` |
| Bulk composition | Sulfur; Carbon; Iron; Silicon; Water; Magnesium; Calcium-Aluminum | `world_attributes_2.json`, `tables[id="bulk_composition"]` |
| Significant water present | Yes; No | Primary Inhabited World table |
| Moon of gas giant | Yes; No | Primary Inhabited World table |
| Tidal locking | Derived | Primary Inhabited World table |

Temperature is a `d100` dependent attribute. Its selected row explicitly lists the eligible `thermalOrbits`, preserving overlapping choices without a separate mapping element. Titan-Pluto is intentionally omitted because Too Cold covers that territory.

Bulk composition is a `d100` V3 primary-world field. Its results describe the planet's bulk material rather than surface deposits or terrain; its `hab` values are retained in the table for later V3 dependency rules.

The source table supplies no dice weights or cross-field restrictions for the remaining physical fields. Therefore V3 must preserve these as **unresolved generation rules** rather than inventing probabilities or physical constraints:

- the selection distribution for terrestrial size, water, and gas-giant-moon status;
- the rule deriving tidal locking;
- how bulk-composition Hab participates in the calculated environmental Hab or other V3 constraints; and
- any relation between these fields and V2 atmosphere, temperature, biosphere, environmental Hab, or the star Hab Score.

Until those rules are approved, V3 can represent the fields in its schema and UI but must not claim an authoritative randomized elaboration. This is intentional: the available V3 tables define categories, while V2's existing rolls and constraints remain authoritative.

## 4. Generate primary stars

Only after every inhabited world's tags, attributes, name, and applicable primary-world elaboration have been generated, classify the primary star for every system. The star is deliberately generated last: it is a dependent variable that describes and supports the completed world narrative rather than leading it.

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
| `world_attributes_2.json` | 3.1–3.5, 3.7 | One filtered `d100` roll for each table | 6 per inhabited world | Supplies atmosphere, temperature, biosphere, population, tech level, and terrestrial size after tags are fixed. |
| Primary-world table (`temp/planets_table.txt`) | 3.8 | Category schema only; selection rules pending | 1 record per system | Defines the remaining primary-world elaboration fields and their allowed values. |
| `star_types.json` | 4 | Filtered weighted `d100`; star `hab` must meet the highest inhabited-world environmental Hab and `habitableSlots` must meet the inhabited-world count | 1 per system | Supplies the primary-star type and dependent Hab Score after all worlds are complete. |

`system_points_of_interest.json` remains intentionally unused in V3.

## Explicit V3 exclusions

- Extra worlds, asteroid belts, comets, and system points of interest; these are V4 scope.
- Secondary-world origin, relationship, and contact prompts.
- Companion stars, stellar multiplicity, flare activity, luminosity, age, or other individual star properties.
- Planetary sizes, orbits, compositions, or physical details for second and third inhabited worlds.
- Unapproved distributions, cross-field constraints, and tidal-locking derivation for primary-world elaboration.
- Contact lines, trade routes, polities, important-world detail, inter-world/inter-polity relations, and factions.
- Compatibility or explanation rules beyond the declared V2 world-tag constraints and the V3 star-Hab dependency.

## V3 completion conditions

A V3 sector meets V2 completion conditions: every placed star has one to three inhabited worlds, and every inhabited world has two distinct compatible tags, five compatible attributes, a generated name, and an orbital slot in 2, 1, 3 generated-world order. Every system additionally has one weighted primary-star classification from `star_types.json`, whose Hab Score is at least the highest calculated environmental Hab of its inhabited worlds and whose habitable slots meet its inhabited-world count. Its first inhabited world has a V3 primary-world elaboration record whose values, once the pending selection/derivation rules are approved, are drawn from the allowed category sets above. No V4 information is implicitly generated.

## Change verification and artifact handoff

Every V3 change to generation code, generation data, constraints, or tests must run the relevant automated test before handoff. The V3 generator test is `npx vitest run src/test/swn_sector_v2.test.ts`; it must produce and validate the deterministic artifact at `/tmp/randomroll-swn-sector-v3.json`. The handoff for each change must provide that artifact to the user. Changes to TypeScript production code must also pass `npx tsc --noEmit`.
