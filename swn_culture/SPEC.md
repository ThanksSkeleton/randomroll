# SWN World Culture Generator Specification

Status: initial specification; new-table contents and the two decisions in **Deferred decisions** are not yet fixed.

## Purpose and boundary

`swn_culture` is a standalone generator for the world-detailing procedure in **Build Out the Important Worlds** from *Stars Without Number: Revised Edition — Free Edition* (printed page 131; PDF page 135 in `temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf`). It will be integrated with `swn_sector` later, but it must not depend on a generated sector or planet during this phase.

The generator turns only fixed, built-in tables into deterministic results. It does not invent prose or attempt to replace the GM's creative work. Any part of the book's procedure that calls for synthesis, explanation, description, reconciliation, or wholly new invention remains outside the application.

The initial page route is `/swn_culture/`. Its UI uses the repository's default debug presentation (`debug_text_box`) rather than a custom presentation.

## Public generation surfaces

The generator exposes two public generation modes:

1. `generateSwnCulture(seed)`: accepts a seed and randomly selects two World Tags before generating the culture.
2. `generateSwnCultureForTags(worldTags, seed)`: accepts exactly two World Tags and a seed, preserves those tags as inputs, and generates the rest of the culture from the seed.

Both modes return the same culture result shape and normally generate exactly one culture. Tests may generate batches by repeatedly invoking either mode with distinct, deterministic child seeds; batch generation is test support, not a third production API.

The seed-only mode must choose two distinct World Tags from the sector generator's filtered `WORLD_TAG_TABLE`. World Tag data comes from the existing canonical `src/generators/swn_sector/Data/Raw/world_tags.json` table; this generator must not maintain a divergent copy.

The predetermined-tags mode accepts exactly two canonical World Tags. Unknown values fail validation. Because callers control these inputs, duplicate supplied tags are accepted and their order is preserved; neither behavior is otherwise part of the generator's semantic contract.

Results are reproducible for identical inputs within the same generator/data version. No forward or backward seeded compatibility is promised when code, tables, or generator versions change.

## Programmatically generated structure

The culture result contains the following Category I material, selected randomly from fixed built-in lists.

### Cultural template

- Cultural Template: selected from the supported name categories.
- The selected template controls all generated personal names and place names in the result.
- Homeworld: a top-level place name selected from the Cultural Template's place-name list.
- The supported templates are exactly the ten SWN categories: Arabic, Chinese, English, Greek, Indian, Japanese, Latin, Nigerian, Russian, and Spanish.
- The generic `US` name category is excluded.

### Adventure components

All component prompts come from the two selected or supplied World Tags in `src/generators/swn_sector/Data/Raw/world_tags.json`.

- One Enemy component plus a culturally matching personal name
- One Friend component plus a culturally matching personal name
- One Complication component
- One Thing component
- One Place component plus a culturally matching place name

Each component is one result built from exactly two independent prompt rolls: one prompt from the first World Tag's corresponding category and one prompt from the second World Tag's corresponding category. The result retains both raw prompts and their source tags. It does not synthesize them into new prose.

Enemy and Friend each receive one personal name. The name's Male/Female table is selected by an independent equal-probability coin flip; the chosen gender is retained in the named component for traceability.

### Reason the PCs care about the world

Roll a top-level category, then roll its associated detail subtable:

- Commodity -> Commodity Type plus an independent Commodity Size roll: Bulk 25%, Small 75%
- Special Tech -> Special Tech Type
- Adventure Opportunity -> Adventure Opportunity Type

The category roll is uniform. Each type roll is uniform within its populated table.

### Biggest conflict

Roll a 2d6 top-level category, then roll its associated detail subtable:

- 2–3: Offworld Conflict -> Offworld Conflict Details
- 4–10: Class Conflict -> Class Conflict Details
- 11–12: Local War -> Local War Details

Each detail roll is uniform within its populated table.

### Outsider opinion

Select one fixed result:

- Comfortable
- Mistrust
- Hatred

Unless specified otherwise, these three results are equally likely.

### Law enforcement

- Law Enforcement Amount: 2d3
- Law Enforcement Style: 2d4
- Special Law: 2d6; `None` occupies results 4–10

All three are independent rolls.

### Major starport

- Starport Type
- Starport Name: selected from the place-name table for the Cultural Template

Starport Type is rolled on its 2d6 table.

### Planetary defenses

This is an original extension rather than part of the cited book procedure. Generate one result for each field:

- Orbiting Station Type
- Orbiting Station Style
- Trade and Smuggling Enforcement Amount
- Customs and Visa Emphasis
- Patrol Boat Presence
- Planetary Gun Turrets

Orbiting Station Type, Orbiting Station Style, Trade and Smuggling Enforcement Amount, and Customs and Visa Emphasis use their specified 2d3 tables. The numbered 2–6 Patrol Boat Presence and Planetary Gun Turret tables are also treated as 2d3 tables. All defense rolls are independent.

## Category II: GM-created material

The generator does not synthesize or store wholly invented GM material in this phase. In particular, it does not:

- merge two World Tag prompts into a new concept;
- write the one-sentence Enemy description requested by the book;
- explain relationships among generated facts;
- describe food, language, architecture, customs, history, or everyday life;
- create factions, neighboring-world relations, adventures, or other free prose.

Generated table entries are raw prompts for the GM. Category II fields and editable placeholders are omitted entirely for now. Editable GM-authored fields can be added in a later feature, but are not part of either generation API now.

## Data and implementation constraints

- The generator's new culture-specific tables live in `swn_culture/swn_culture_data.json`.
- Each table is stored directly as data, without provenance, schema, status, file-reference, or annotation fields.
- Place names are not duplicated in the culture data JSON. The generator uses `temp/swn_place_names.csv` directly, deriving the ten Cultural Template choices from its culture column and using the matching rows for Homeworld, Place, and Starport names.
- Randomness must be seeded; production generation must not call `Math.random()`.
- Both APIs must use one shared generation path after World Tags are resolved, preventing behavioral drift.
- A culture result must retain its two effective World Tags so a seed-only result can be reproduced through the predetermined-tags API.
- Personal and place names must come from the same Cultural Template as each other.
- Duplicate personal or place names are allowed, including a collision between the adventure Place and Major Starport.
- New table data should be represented as explicit data, separate from selection logic.
- The debug page must use the normal RandomRoll page controls and exports unless a later spec changes that requirement.
- CSV/flat serialization is not part of the domain contract. The initial implementation may use deliberately flattened columns or JSON-encoded nested values, whichever is simpler and produces intelligible debug output.
- Tests must cover same-version determinism, distinct random World Tags, supplied-tag preservation, membership of every result in its source table, exactly one prompt per source tag per component, the personal-name gender coin flip, cultural consistency of names, invalid supplied tags, and repeated/batch generation.

## Initial result shape

This sketch makes the intended nesting concrete without freezing unresolved cardinalities or naming details:

```ts
type SwnCulture = {
  worldTags: [WorldTag, WorldTag];
  culturalTemplate: CultureNameCategory;
  homeworld: string;
  adventureComponents: {
    enemy: NamedComponent;
    friend: NamedComponent;
    complication: TaggedComponent;
    thing: TaggedComponent;
    place: TaggedComponent & { placeName: string };
  };
  pcCaresAbout: { category: string; type: string; commoditySize: 'Bulk' | 'Small' | null };
  biggestConflict: {
    category: 'Class Conflict' | 'Offworld Conflict' | 'Local War';
    details: string;
  };
  outsiderOpinion: 'Comfortable' | 'Mistrust' | 'Hatred';
  lawEnforcement: { amount: string; style: string; specialLaw: string };
  majorStarport: { type: string; name: string };
  planetaryDefenses: {
    orbitingStationStyle: string;
    orbitingStationType: string;
    tradeAndSmugglingEnforcementAmount: string;
    customsAndVisaEmphasis: string;
    patrolBoatPresence: string;
    planetaryGunTurrets: string;
  };
};

type ComponentPrompt = { prompt: string; sourceTag: WorldTag };
type TaggedComponent = { prompts: [ComponentPrompt, ComponentPrompt] };
type NamedComponent = TaggedComponent & {
  name: string;
  gender: 'Male' | 'Female';
};
```

## Dice-table behavior

A dice table stores its die sizes and inclusive outcome ranges as data. Generation rolls each listed die, sums the results, and resolves the matching range. This preserves the non-uniform distributions of 2d3, 2d4, and 2d6 rather than treating the listed outcomes as equally likely.

The project spelling is **Starport** everywhere, including property and display labels.
