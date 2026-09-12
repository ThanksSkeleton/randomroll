# Sector Creation Flow — V2

## Pre-note: Habitability roles

The `hab` metadata in `world_attributes.json` drives V2’s constraint-aware generation. The ratings have two distinct roles and must not be combined as a simple total:

- **Preconditions:** atmosphere, temperature, and biosphere describe the world’s underlying environmental suitability for ordinary human habitation. A world’s calculated Hab is the minimum of these three ratings.
- **Implications:** population and tech level describe evidence about what sustained habitation is occurring or can be supported. Their `hab` values are minimum environmental-Hab requirements: a completed world must have calculated Hab greater than or equal to both Population Hab and Tech Level Hab.

For example, a large low-tech human population on a world with hostile environmental preconditions is rejected by the current V2 rules. Population roll 12 is marked `alien: true`; it establishes alien inhabitants and is not ordinary evidence of human habitability. Additional explanation rules may be introduced in later V2 revisions.

## V2 world-tag compatibility rules

The following accepted constraints define the first V2 refinement rules. Their machine-readable source is `swn_sector/world_tag_constraints.json`; the validation-only checker is `src/test/swn_sector_v2_constraints.test.ts`; and `src/generators/swn_sector/sector_v2.ts` applies them during generation. `TL2+`, `TL3+`, and `TL4+` refer to the displayed technology level or a more advanced level. `Pop` refers to the population table’s 2d6 roll. `Biosphere 6+` similarly refers to its 2d6 roll.

`Hab` in this table refers to the calculated environmental Hab: the minimum of atmosphere, temperature, and biosphere metadata. It is not an additive score with population or tech level.

| Tag | Constraint |
| --- | --- |
| Badlands World | Not Hab 3. |
| Beastmasters | Biosphere 6+. |
| Bubble Cities | Must not have a Breathable Mix atmosphere. |
| Colonized Population | TL4+. |
| Cybercommunists | TL3+. |
| Cyborgs | TL3+. |
| Desert World | Not Hab 3. |
| Exchange Consulate | TL4+. |
| Flying Cities | TL4+; assign the special `NONTERRESTRIAL` tag. |
| Forbidden Tech | TL4+. |
| Gold Rush | TL4+. |
| Heavy Industry | TL3+. |
| Heavy Mining | TL2+. |
| Hostile Biosphere | Biosphere 6+. |
| Local Tech | TL3+. |
| Major Spaceyard | TL4+. |
| Mandate Base | TL4+. |
| Megacorps | TL2+. |
| Night World | Biosphere 6+. |
| Outpost World | TL4+ and Pop 2 or 3. |
| Perimeter Agency | TL4+. |
| Post-Scarcity | TL4+. |
| Preceptor Archive | TL3+. |
| Pretech Cultists | TL4+. |
| Primitive Aliens | Assign the special `ALIEN` tag. |
| Psionics Academy | TL4+. |
| Radioactive World | Not Hab 3. |
| Regional Hegemon | TL4+ and Pop 4+. |
| Rising Hegemon | TL4+ and Pop 4+. |
| Robots | TL3+. |
| Terraform Failure | Hab 2 or below. |
| Tomb World | Hab 1 or below and Pop 2 or 3. |
| Trade Hub | TL4+. |
| Unbraked AI | TL4+. |
| Xenophiles | Assign the special `ALIEN` tag. |

The `ALIEN` and `NONTERRESTRIAL` entries are special world-state markers for later V2 work. They are distinct from Population roll 12’s `alien: true` flag, which identifies an alien population result.

### ALIEN inclusion

Each V2 world has an `ALIEN` inclusion state. It defaults to false. When it is false, entries requiring the `ALIEN` special tag are excluded from tag selection, and Population roll 12 (`alien: true`) is excluded from population selection. When it is true, those entries are eligible. This state is a constraint on the existing flow, not an additional table roll; the roll order remains Tag 1, Tag 2, atmosphere, temperature, biosphere, population, then tech level.

## Scope

This is the deliberately simplified V2 generation flow. It uses the extracted world-tag and world-attribute tables, but intentionally diverges from the book’s full procedure in the ways recorded below. The book-faithful reference is [Sector_Creation_Flow_RAW.md](Sector_Creation_Flow_RAW.md).

V2 generates a complete set of inhabited worlds and their base characteristics, applying the declared world-tag compatibility rules while it does so. It does **not** create optional system points, routes, polities, adventure components, culture, relations, or factions.

```text
Create sector grid
  → 1a: place stars
  → 1b: assign 1–3 inhabited worlds to every star
  → 2: generate each inhabited world's tags, attributes, and name
```

## 1a. Place stars

1. Use the standard 8-wide by 10-high sector grid.
2. Roll `1d10 + 20` to determine the total number of stars.
3. Place every star in a randomly selected valid grid hex.
4. If a selected hex already contains a star, retry until an empty hex is selected.

V2 intentionally omits the book’s special occupied-hex placement direction, half-hex handling, and its instruction to place remaining stars so that stellar clumps connect. The result is simply a random set of non-overlapping star positions.

## 1b. Assign inhabited worlds

Every star system has at least one primary inhabited world. Independently for each star system, select one of these mutually exclusive outcomes:

| Probability | Inhabited worlds in system |
| --- | --- |
| 85% | 1 |
| 10% | 2 |
| 5% | 3 |

The first inhabited world is the system’s primary world. Any additional inhabited worlds are generated independently using step 2, but V2 deliberately assigns no origin, relationship, contact point, or other inter-world detail.

## 2. Generate each inhabited world

Run these steps separately for every inhabited world from step 1b.

V2 retains V1’s roll order, but every selected tag or attribute contributes constraints to the remaining selections. Each next selection must be drawn only from results that satisfy all accumulated constraints and still leave at least one valid completion for the later selections. In particular, Tag 2 must be distinct from Tag 1 and compatible with it before any attribute rolls are made.

| Order | Action | Table/data interaction | Output |
| --- | --- | --- | --- |
| 2.1 | Roll the first world tag. | `world_tags.json`: one `d100` selection from tags allowed by the world’s `ALIEN` state. | `tag1` record and its constraints. |
| 2.2 | Roll the second, different world tag. | `world_tags.json`: one further eligible selection that is compatible with `tag1`; retry otherwise. | Distinct `tag2` record and the combined constraints. |
| 2.3 | Roll atmosphere. | `world_attributes.json`, `tables[id="atmosphere"]`: one `2d6` result satisfying the combined constraints and permitting a valid later completion. | Atmosphere. |
| 2.4 | Roll temperature. | `world_attributes.json`, `tables[id="temperature"]`: one `2d6` result satisfying the combined constraints and permitting a valid later completion. | Temperature. |
| 2.5 | Roll biosphere. | `world_attributes.json`, `tables[id="biosphere"]`: one `2d6` result satisfying the combined constraints and permitting a valid later completion. | Biosphere. |
| 2.6 | Roll population. | `world_attributes.json`, `tables[id="population"]`: one `2d6` result satisfying the combined constraints and the world’s `ALIEN` state. | Population. |
| 2.7 | Roll tech level. | `world_attributes.json`, `tables[id="tech_level"]`: one `2d6` result satisfying the combined constraints. | Tech level. |
| 2.8 | Construct the world name. | No source table. | `TAG1_TAG2_XYZ`. |

`XYZ` is a random three-digit number in the inclusive range `000`–`999`. `TAG1` and `TAG2` are the selected tag names in rolled order, normalized as name tokens by replacing spaces with underscores; the separator between all three parts is one underscore. For example: `Abandoned_Colony_Alien_Ruins_042`.

V2 applies the accepted compatibility rules above by limiting each selection to results that can still lead to a valid completed world. It also performs no name-collision correction. Additional explanation rules for otherwise plausible combinations belong to a later V2 revision.

## Table-interaction matrix

| Data file | Used at flow step | Dice/mechanism | Uses per inhabited world | Role |
| --- | --- | --- | --- | --- |
| `world_tags.json` | 2.1–2.2 | Two `d100` rolls; retry the second only when it duplicates the first | 2 | Supplies two distinct world tags. Tag prompt lists are retained in the data but not used in V2. |
| `world_attributes.json` | 2.3–2.7 | One `2d6` roll for each listed table, rerolled when it violates an accumulated constraint | 5 | Supplies atmosphere, temperature, biosphere, population, and tech level, in that order. |

`system_points_of_interest.json` is intentionally not used in V2.

## Explicit V2 exclusions

The following parts of the raw/book flow are omitted from V2:

- Optional additional system points of interest, including secondary-world origin/relationship/contact prompts.
- Contact lines, trade routes, and polities.
- Important-world detail: cultural template, tag-derived Enemy/Friend/Complication/Thing/Place components, and cultural questions.
- Inter-world and inter-polity relations.
- Factions.
- Additional compatibility or explanation rules beyond the declared world-tag constraints.

## V2 completion conditions

A V2 sector is complete when every randomly placed star has one to three inhabited worlds, and every one of those worlds has two different tags, all five 2d6 attributes, and a generated `TAG1_TAG2_XYZ` name. No omitted information is implicitly generated.
