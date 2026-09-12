# SWN Sector Creator — Phase 1: Overview and Plan

## Objective

Build a browser-based, deterministic Stars Without Number: Revised Edition sector creator for the existing RandomRoll site. Its rules data and generation flow will be transcribed from the local free-edition source, restricted to PDF pages 133–175 as requested.

This phase establishes scope and the implementation plan only. It deliberately does **not** copy rule tables or begin implementation; that occurs after the human review gate for phases 2–4.

## Source and page mapping

- Authoritative local source: `temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf`
- Requested PDF range: 133–175 inclusive
- The PDF front matter is four pages, so this corresponds approximately to printed pages 129–171.
- The table of contents identifies this material as the **Sector Creation** chapter. It begins with sector setup and covers world tags plus atmosphere, temperature, biosphere, population, tech level, and additional points of interest. PDF page 175 is a boundary page: during extraction we will verify whether it belongs to Sector Creation or starts the next chapter, and exclude unrelated material.

## Product scope

The initial generator should support a GM in producing a usable sector, rather than merely a random list of planets:

1. Configure a reproducible seed and the chapter-supported sector options.
2. Produce a sector map/grid and a set of star systems according to the source procedure.
3. Generate each system’s primary world, its world tags, the tag-provided adventure prompts, and its physical/social world properties.
4. Generate any chapter-supported additional system points of interest.
5. Let the GM reroll or edit an individual generated value without losing the remainder of the sector.
6. Export/share the resulting data (the precise first export format will be selected in UI design; JSON is the baseline because it preserves all generated fields).

### Explicitly out of scope for the first release

- Adventure-generation procedures outside the requested page range.
- Faction turns, starship construction, character generation, and paid-edition-only material.
- Invented setting lore, artwork, or tables that are not in the approved source range.
- A map renderer that implies travel distances or routes beyond what the source rules define.

## Proposed technical shape

This will be a new, self-contained `swn_sector` generator. The existing `swn` generator and `swn/index.html` are explicitly out of scope and will not be changed.

```text
swn_sector/
  index.html             independent generator page
src/generators/swn_sector/
  swn_sector.ts          browser entry point and UI wiring
  sector_generator.ts    pure seeded generation pipeline
  sector_types.ts        persisted sector/result types
  sector_tables.ts       source-derived structured table data
  sector_validation.ts   table/data and result invariants
  sector.css             page-specific presentation
src/test/swn_sector.test.ts
```

- The generator core will be pure TypeScript: `generateSector(seed, options)` returns serializable data and does not touch the DOM.
- It will use the project’s existing `seedrandom` dependency so a seed recreates the same sector exactly.
- Rule tables will be typed data, never HTML strings or scattered switch statements. Each record will retain a source locator (PDF page/table name) for auditability.
- The UI will render from that result and keep GM edits as an overlay or updated sector state, so a reroll is local and predictable.
- Tests will exercise the pure core in Vitest; the existing project runs type-checking through `npm run build` and tests through `npm test`.

## Extraction plan (phase 2)

The local environment currently lacks `pdftotext`/Poppler. Before transcribing, use a reliable PDF text-extraction route that preserves table structure, then visually compare every table against the PDF pages. Capture the following in a temporary, reviewable extraction worksheet:

| Source category | Structured fields to capture | Checks |
| --- | --- | --- |
| Sector-creation procedure | ordered steps, inputs, optional branches, dice expressions, page locator | every instruction becomes an explicit flow step or documented manual choice |
| Map/system rules | grid/placement constraints, star/system counts, travel-related notes in scope | distinguish procedural rule from presentation advice |
| World tags | tag title; all prompt columns/entries; roll range | complete roll coverage; duplicate names/rows checked |
| World attributes | roll range; result; mechanical implications/notes | no gaps/overlaps; dice notation parsed exactly |
| Points of interest | category/table; roll range; result; conditions | conditional tables linked to their trigger |
| Examples and exceptions | rule reference and expected resulting data | converted to test fixtures where sufficiently concrete |

Extraction output will be source-attributed data and concise implementation notes, not a wholesale copy of prose. Ambiguous typography, wrapped cells, and edge-case instructions will be flagged rather than guessed.

## Flowcharting plan (phase 3)

After table extraction, turn the source procedure into a reviewed decision graph before coding:

```text
seed + GM options
        ↓
sector map / system placement
        ↓
for each selected system
  ├─ primary world
  │   ├─ tags and tag prompts
  │   └─ world attributes
  └─ additional points of interest (if called for)
        ↓
validation → editable sector result → UI/export
```

The review artifact will name each dice roll, its table, prerequisites, and output field. “GM choice” and “random roll” will be visibly distinct, because silently randomizing an intentional choice makes the tool much less useful at the table.

## Table review plan (phase 4)

Before implementation, validate the extracted data with both automated and manual checks:

- Every declared dice outcome is covered once, with no duplicate or unreachable rows.
- Every table reference in the flowchart resolves to one structured table.
- Cross-references and conditional branches have a defined data representation.
- Each table entry is compared against the page image/text, including punctuation that changes a rule.
- The source page/table locator is present for each table.
- A reviewer can trace a generated field back to a source table without reading application code.

## Implementation and test plan (phases 5–6)

1. Add types, seeded roller helpers, and the reviewed tables.
2. Implement the generation pipeline in the flowchart order.
3. Add deterministic fixtures for at least one normal sector and each meaningful conditional branch.
4. Add table-integrity tests for roll coverage and reference validity.
5. Add result-invariant tests: stable seed, unique/valid system coordinates, complete required world data, and local rerolls not mutating unrelated data.
6. Run `npm test` and `npm run build`; fix any extraction-model mismatch before UI work.

## UI and frontend plan (phases 7–8)

Design comes only after the rule engine is verified. The likely first screen has a compact control bar (seed, sector options, generate/export), an accessible map/list of systems, and a detail panel for the selected system. The final wireframe will be reviewed before frontend implementation. UI tests will cover the normal generator action, selection, and per-field reroll/edit behavior; browser inspection will check console/network errors and responsive layout.

## Decisions needed at the next quality gate

1. Confirm the requested PDF range is the sole rules source, including the handling of PDF page 175 if it begins the next chapter.
2. Confirm that the first deliverable should expose the whole source procedure, with manual override/editing, rather than enforce one fixed campaign style.
3. Approve moving to extraction once the source PDF can be read in a table-preserving form.

## Completion criteria for the complete feature

- Every generated value is reproducible from the seed and traceable to a reviewed source table/procedure.
- The generator covers the approved Sector Creation material and nothing outside it without an explicit extension.
- A GM can generate, inspect, adjust, and export a sector in the browser.
- All data-integrity, deterministic-generation, UI, type-check, and production-build checks pass.
