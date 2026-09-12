# Sector Creation Flow — V1

## Scope

This is the deliberately simplified V1 generation flow. It uses the extracted world-tag and world-attribute tables, but intentionally diverges from the book’s full procedure in the ways recorded below. The book-faithful reference is [Sector_Creation_Flow_RAW.md](Sector_Creation_Flow_RAW.md).

V1 generates a complete set of inhabited worlds and their base characteristics. It does **not** resolve incongruous results, create optional system points, routes, polities, adventure components, culture, relations, or factions.

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

V1 intentionally omits the book’s special occupied-hex placement direction, half-hex handling, and its instruction to place remaining stars so that stellar clumps connect. The result is simply a random set of non-overlapping star positions.

## 1b. Assign inhabited worlds

Every star system has at least one primary inhabited world. Independently for each star system, select one of these mutually exclusive outcomes:

| Probability | Inhabited worlds in system |
| --- | --- |
| 85% | 1 |
| 10% | 2 |
| 5% | 3 |

The first inhabited world is the system’s primary world. Any additional inhabited worlds are generated independently using step 2, but V1 deliberately assigns no origin, relationship, contact point, or other inter-world detail.

## 2. Generate each inhabited world

Run these steps separately for every inhabited world from step 1b.

| Order | Action | Table/data interaction | Output |
| --- | --- | --- | --- |
| 2.1 | Roll the first world tag. | `world_tags.json`: one `d100` selection from `tags`. | `tag1` record. |
| 2.2 | Roll the second, different world tag. | `world_tags.json`: one further `d100` selection; reroll only if it equals `tag1`. | Distinct `tag2` record. |
| 2.3 | Roll atmosphere. | `world_attributes.json`, `tables[id="atmosphere"]`: one `2d6` result. | Atmosphere. |
| 2.4 | Roll temperature. | `world_attributes.json`, `tables[id="temperature"]`: one `2d6` result. | Temperature. |
| 2.5 | Roll biosphere. | `world_attributes.json`, `tables[id="biosphere"]`: one `2d6` result. | Biosphere. |
| 2.6 | Roll population. | `world_attributes.json`, `tables[id="population"]`: one `2d6` result. | Population. |
| 2.7 | Roll tech level. | `world_attributes.json`, `tables[id="tech_level"]`: one `2d6` result. | Tech level. |
| 2.8 | Construct the world name. | No source table. | `TAG1_TAG2_XYZ`. |

`XYZ` is a random three-digit number in the inclusive range `000`–`999`. `TAG1` and `TAG2` are the selected tag names in rolled order, normalized as name tokens by replacing spaces with underscores; the separator between all three parts is one underscore. For example: `Abandoned_Colony_Alien_Ruins_042`.

V1 leaves every combination of tag and attribute results unchanged, even when the results appear implausible or contradictory. It also performs no name-collision correction. Identifying and forbidding impossible combinations belongs to the later Cleaning phase, not this version of the flow.

## Table-interaction matrix

| Data file | Used at flow step | Dice/mechanism | Uses per inhabited world | Role |
| --- | --- | --- | --- | --- |
| `world_tags.json` | 2.1–2.2 | Two `d100` rolls; retry the second only when it duplicates the first | 2 | Supplies two distinct world tags. Tag prompt lists are retained in the data but not used in V1. |
| `world_attributes.json` | 2.3–2.7 | One `2d6` roll for each listed table | 5 | Supplies atmosphere, temperature, biosphere, population, and tech level, in that order. |

`system_points_of_interest.json` is intentionally not used in V1.

## Explicit V1 exclusions

The following parts of the raw/book flow are omitted from V1:

- Optional additional system points of interest, including secondary-world origin/relationship/contact prompts.
- Contact lines, trade routes, and polities.
- Important-world detail: cultural template, tag-derived Enemy/Friend/Complication/Thing/Place components, and cultural questions.
- Inter-world and inter-polity relations.
- Factions.
- Any compatibility or impossibility rules beyond ensuring the two tags on one world differ.

## V1 completion conditions

A V1 sector is complete when every randomly placed star has one to three inhabited worlds, and every one of those worlds has two different tags, all five 2d6 attributes, and a generated `TAG1_TAG2_XYZ` name. No omitted information is implicitly generated.
