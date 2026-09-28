# SWN World Culture Generator Specification

Status: initial specification; new-table contents and the two decisions in **Deferred decisions** are not yet fixed.

## Purpose and boundary

`swn_culture` is a standalone generator for the world-detailing procedure in **Build Out the Important Worlds** from *Stars Without Number: Revised Edition — Free Edition* (printed page 131; PDF page 135 in `temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf`). It will be integrated with `swn_sector` later, but it must not depend on a generated sector or planet during this phase.

The generator turns only fixed, built-in tables into deterministic results. It does not invent prose or attempt to replace the GM's creative work. Any part of the book's procedure that calls for synthesis, explanation, description, reconciliation, or wholly new invention remains outside the application.

The initial page route is `/swn_culture/`. Its UI uses the repository's default debug presentation (`debug_text_box`) rather than a custom presentation.

## Public generation surfaces

The generator exposes two public generation modes:

1. Seed only: accepts a seed and randomly selects two World Tags before generating the culture.
2. Predetermined tags plus seed: accepts exactly two World Tags and a seed, preserves those tags as inputs, and generates the rest of the culture from the seed.

Both modes return the same culture result shape and normally generate exactly one culture. Tests may generate batches by repeatedly invoking either mode with distinct, deterministic child seeds; batch generation is test support, not a third production API.

The seed-only mode must choose two distinct World Tags from the sector generator's filtered `WORLD_TAG_TABLE`. World Tag data comes from the existing canonical `swn_sector/world_tags.json` table; this generator must not maintain a divergent copy.

The predetermined-tags mode accepts exactly two canonical World Tags. Unknown values fail validation. Because callers control these inputs, duplicate supplied tags are accepted and their order is preserved; neither behavior is otherwise part of the generator's semantic contract.

Results are reproducible for identical inputs within the same generator/data version. No forward or backward seeded compatibility is promised when code, tables, or generator versions change.

## Programmatically generated structure

The culture result contains the following Category I material, selected randomly from fixed built-in lists.

### Cultural template

- Cultural Template: selected from the supported name categories.
- The selected template controls all generated personal names and place names in the result.
- The supported templates are exactly the ten SWN categories: Arabic, Chinese, English, Greek, Indian, Japanese, Latin, Nigerian, Russian, and Spanish.
- The generic `US` name category is excluded.

### Adventure components

All component prompts come from the two selected or supplied World Tags in `swn_sector/world_tags.json`.

- One Enemy component plus a culturally matching personal name
- One Friend component plus a culturally matching personal name
- One Complication component
- One Thing component
- One Place component plus a culturally matching place name

Each component is one result built from exactly two independent prompt rolls: one prompt from the first World Tag's corresponding category and one prompt from the second World Tag's corresponding category. The result retains both raw prompts and their source tags. It does not synthesize them into new prose.

Enemy and Friend each receive one personal name. The name's Male/Female table is selected by an independent equal-probability coin flip; the chosen gender is retained in the named component for traceability.

### Reason the PCs care about the world

Roll a top-level category, then roll its associated detail subtable:

- Commodity -> Commodity Type
- Special Tech -> Special Tech Type
- Adventure Opportunity -> Adventure Opportunity Type

These are new tables. Their values and weighting are intentionally deferred.

### Biggest conflict

Roll a top-level category, then roll its associated detail subtable when one exists:

- Class Conflict -> Class Conflict Details
- Offworld Conflict -> Offworld Conflict Details
- Local War -> Local War Details
- Other Crisis -> no detail roll

These are new tables. Their values and weighting are intentionally deferred.

### Outsider opinion

Select one fixed result:

- Comfortable
- Mistrust
- Hatred

Unless specified otherwise, these three results are equally likely.

### Law enforcement

- Law Enforcement Amount and Style
- Special Laws -> Special Law Type

These are new tables. Their values and weighting are intentionally deferred. The relationship between the two rolls, including whether a world can have no special law, remains an open decision.

### Major starport

- Starport Type
- Starport Name: selected from the place-name table for the Cultural Template

Starport Type is a new table whose values and weighting are intentionally deferred.

### Planetary defenses

This is an original extension rather than part of the cited book procedure. Generate one result for each field:

- Orbiting Station Type
- Smuggling Enforcement
- Visa Enforcement
- Patrol Boat Presence Amount
- Planetary Gun Turrets

These are new tables unless an existing project table is explicitly adopted later. Their values, weighting, and any dependencies between them are intentionally deferred.

## Category II: GM-created material

The generator does not synthesize or store wholly invented GM material in this phase. In particular, it does not:

- merge two World Tag prompts into a new concept;
- write the one-sentence Enemy description requested by the book;
- explain relationships among generated facts;
- describe food, language, architecture, customs, history, or everyday life;
- create factions, neighboring-world relations, adventures, or other free prose.

Generated table entries are raw prompts for the GM. Category II fields and editable placeholders are omitted entirely for now. Editable GM-authored fields can be added in a later feature, but are not part of either generation API now.

## Data and implementation constraints

- Randomness must be seeded; production generation must not call `Math.random()`.
- Both APIs must use one shared generation path after World Tags are resolved, preventing behavioral drift.
- A culture result must retain its two effective World Tags so a seed-only result can be reproduced through the predetermined-tags API.
- Personal and place names must come from the same Cultural Template as each other.
- Duplicate personal or place names are allowed, including a collision between the adventure Place and Major Starport.
- New table data should be represented as explicit data, separate from selection logic.
- The debug page must use the normal RandomRoll page controls and exports unless a later spec changes that requirement.
- CSV/flat serialization is not part of the domain contract. The initial implementation may use deliberately flattened columns or JSON-encoded nested values, whichever is simpler and produces intelligible debug output.
- Tests must cover same-version determinism, distinct random World Tags, supplied-tag preservation, membership of every result in its source table, exactly one prompt per source tag per component, the personal-name gender coin flip, cultural consistency of names, invalid supplied tags, and repeated/batch generation.

## Proposed result shape (non-final)

This sketch makes the intended nesting concrete without freezing unresolved cardinalities or naming details:

```ts
type SwnCulture = {
  worldTags: [WorldTag, WorldTag];
  culturalTemplate: CultureNameCategory;
  adventureComponents: {
    enemy: NamedComponent;
    friend: NamedComponent;
    complication: TaggedComponent;
    thing: TaggedComponent;
    place: TaggedComponent & { placeName: string };
  };
  pcCaresAbout: { category: string; type: string };
  biggestConflict:
    | { category: 'Class Conflict' | 'Offworld Conflict' | 'Local War'; details: string }
    | { category: 'Other Crisis' };
  outsiderOpinion: 'Comfortable' | 'Mistrust' | 'Hatred';
  lawEnforcement: { amountAndStyle: string; specialLaw: string; specialLawType: string };
  majorStarport: { type: string; name: string };
  planetaryDefenses: {
    orbitingStationType: string;
    smugglingEnforcement: string;
    visaEnforcement: string;
    patrolBoatPresenceAmount: string;
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

## Deferred decisions

In addition to the actual values and weights for all new tables, these behaviors will be decided when the placeholder table scaffolds are created:

1. **Law-enforcement dependency.** Whether a Special Law is always generated, whether the amount/style roll can suppress it, and whether `Special Laws` is a separate roll from `Special Law Type`.
2. **Planetary-defense dependency.** Whether the five defense fields are independent rolls or whether combinations are constrained.

The project spelling is **Starport** everywhere, including property and display labels.
