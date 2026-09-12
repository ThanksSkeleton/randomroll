# Sector Creation Flow — RAW

## Scope and reading order

This report follows the Sector Creation chapter in the requested source range: PDF pages 133–175, corresponding to printed pages 129–171. The operational procedure is on printed pages 130–131; the supporting roll tables appear later in the chapter. This is the book’s order of work, not a proposed UI order.

```text
Choose sector scope
  → place stars on sector map
  → create each inhabited system's primary world
  → mark contacts, routes, and optional polities
  → detail only worlds needed for imminent play
  → choose relations and optional factions
```

At every random-table step, the chapter expressly permits a GM to choose a result or reroll an incongruous one. A generator must therefore present rolls as default suggestions, not immutable facts.

## 1. Set up and place the stellar map

Source: printed page 130 (PDF 134). No extracted JSON table is used in this step.

1. Start with the chapter’s standard sector grid: 8 hexes wide by 10 hexes high.
2. Determine the sector’s number of stars: roll `1d10 + 20`, or choose a suitable total.
3. For the first twenty or so stars, roll `1d8` for a column and `1d10` for a row.
4. If the rolled hex is occupied, place the star in an adjacent hex in the direction of the nearest edge.
5. In columns that have only nine full hexes, a row result of 10 is rerolled or placed in the bottom-most full hex.
6. Add any remaining stars to connect stellar clumps/groupings.

This creates map positions only. It does not automatically make every star inhabited, name systems, make routes, or assign a primary world.

## 2. Create a primary world for each inhabited system

Source: printed page 130 (PDF 134). Repeat this section once for every system chosen to be inhabited. The chapter initially assumes one primary world per inhabited system; additional worlds are optional later.

| Order | Action | Table/data interaction | Output |
| --- | --- | --- | --- |
| 2.1 | Select or roll two world tags. | `world_tags.json`: make two independent `d100` selections from `tags`. | Two tag records, including five prompt categories per tag. |
| 2.2 | Select or roll atmosphere. | `world_attributes.json`, `tables[id="atmosphere"]`: one `2d6` result. | Atmosphere result. |
| 2.3 | Select or roll temperature. | `world_attributes.json`, `tables[id="temperature"]`: one `2d6` result. | Temperature result. |
| 2.4 | Select or roll biosphere. | `world_attributes.json`, `tables[id="biosphere"]`: one `2d6` result. | Biosphere result. |
| 2.5 | Select or roll population. | `world_attributes.json`, `tables[id="population"]`: one `2d6` result. | Population result. |
| 2.6 | Select or roll tech level. | `world_attributes.json`, `tables[id="tech_level"]`: one `2d6` result. | Tech-level result. |
| 2.7 | Optionally add more worlds or other system points. | See section 3. | Optional system details. |
| 2.8 | Give the primary world a name and one-sentence description. | No book table. GM choice, informed by the generated characteristics. | Name and short description. |

The five `world_attributes.json` tables are used in the displayed order. The book calls for the tags first, then atmosphere, then the remaining attributes in that sequence. Attribute rolls may be chosen or rerolled when they do not make sense with a world’s tags; this is a deliberate GM decision point, not an error-recovery rule.

## 3. Optionally add further system details

Source: printed pages 170–171 (PDF 174–175). This is an optional branch after the primary-world attributes, not a mandatory pass over every system.

### 3A. Additional inhabited world

If the GM adds another inhabited planet, generate its ordinary world details by returning to section 2. Then use one `d8` row from `system_points_of_interest.json` → `secondaryWorld.rows` to supply three linked prompts:

1. `origin`: how the additional world came to be.
2. `relationship`: its current relationship with the primary world.
3. `contactPoint`: the major point of contact between them.

If three or more inhabited worlds are added, the book asks the GM to determine how each feels about the others; relations need not be reciprocal. The table does not prescribe a complete matrix of relations.

### 3B. Other point of interest

To add a station, base, asteroid belt, or equivalent point, use `system_points_of_interest.json` → `otherPoint.rows`:

1. Roll or choose a `d8` `point` row.
2. Within that row, roll or choose one `d10`-range entry from `occupants`.
3. Independently roll or choose one `d10`-range entry from `situations`.

The two d10 selections are independent. An occupied point is therefore the combination of its selected type, occupant, and situation—not a single lookup result.

## 4. Mark contacts, routes, and optional polities

Source: printed page 131 (PDF 135). No extracted roll table is used.

1. Identify star systems in contact and draw communication lines between them.
2. Treat a gap of four or more hexes as uncrossable without pretech spike drives; distant clusters require an intermediate world for contact.
3. Optionally draw a polity border around systems that plausibly belong to one interstellar polity.

This is a GM interpretation step based on the map and generated worlds. The chapter provides constraints and examples, but does not provide a random route or polity table.

## 5. Build out only the important worlds

Source: printed page 131 (PDF 135). The book recommends detailing the campaign’s starting world and worlds the PCs might reach by the end of the first session, rather than fully detailing every world in the sector.

For each selected important world:

1. Choose a rough cultural template. No table is supplied in the approved range.
2. Revisit both selected tag records in `world_tags.json`.
3. For each adventure-component category, use one or both tag prompt cells as inspiration, merge/adapt them, and record at least one item:

   | Required component | Source field(s) |
   | --- | --- |
   | Enemy | `prompts.enemies` from either/both tags |
   | Friend | `prompts.friends` from either/both tags |
   | Complication | `prompts.complications` from either/both tags |
   | Thing | `prompts.things` from either/both tags |
   | Place | `prompts.places` from either/both tags |

4. Record answers to five cultural/play questions: what the world has that PCs may care about; its largest current conflict; its attitude toward outsiders; its law enforcement; and where the PCs land (the major starport and its deficiencies/opportunities).

The tag prompt cells are not additional dice tables in the chapter. They are lists of components for GM selection and combination. A later implementation should not silently choose one item from every comma-separated cell unless the user intentionally asks it to do so.

## 6. Choose relations and optional factions

Source: printed page 131 (PDF 135). No extracted table is used.

1. Choose the relationships between the starting world and its neighbors.
2. Choose relationships between any established polities.
3. Optionally establish one or more factions; the chapter advises that two or three are sufficient at campaign start.

Faction rules themselves begin outside the approved sector-creation material and are not part of this generator scope.

## Table-interaction matrix

| Data file | Used at flow step | Dice/mechanism | Mandatory? | Role |
| --- | --- | --- | --- | --- |
| `world_tags.json` | 2.1; revisited at 5 | Two `d100` results per primary world, or GM picks | Yes for each inhabited primary world | Establishes tags and provides raw adventure components. |
| `world_attributes.json` | 2.2–2.6 | Five `2d6` results per primary world, or GM picks | Yes for each inhabited primary world | Establishes atmosphere, temperature, biosphere, population, and tech level. |
| `system_points_of_interest.json` → `secondaryWorld` | 3A | One `d8` row, or GM pick | Only when adding an inhabited world | Prompts the secondary world’s origin, relationship, and contact. |
| `system_points_of_interest.json` → `otherPoint` | 3B | One `d8` point row plus independent `d10` occupant and situation selections | Only when adding another point of interest | Builds an optional station/base/etc. |

## Explicit non-table decisions

The following must remain freeform GM inputs/edits in any future implementation: inhabited-system selection; extra-star placement to connect clusters; world names/descriptions; tag/attribute overrides; route lines; polities; cultural template; merged adventure components; cultural questions; inter-world/polity relations; and whether/how many factions exist.

## Phase 3 review checkpoints

- The only automatic rolls are those expressly associated with a source table or map-placement instruction.
- The system-detail tables are optional and cannot be run before a primary world exists.
- World tags are rolled before world attributes, and their prompt cells are reused only while detailing important worlds.
- There is no source table for routes, polities, culture, relations, or factions in the approved scope.
- The next phase should review table structure against this matrix; the Cleaning phase should later turn incompatible generated states into explicit prohibited combinations rather than silently changing the book’s flow.
