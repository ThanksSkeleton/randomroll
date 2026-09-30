# SWN Sector Canonical Generation and Projection Refactor

## Purpose

This document covers the active SWN_SECTOR generation and projection refactor described
in [Canonical Generation and Projection Architecture](../../temp/canonical-generation-projection-architecture.md)
and its [toy example](../../temp/canonical-generation-projection-toy-example.md).
It sketches the smaller implementation specs needed to get there. The
[first planet slice](CANONICAL_PROJECTION_REFACTOR_SPEC.md),
[part 2](CANONICAL_PROJECTION_REFACTOR_PART_2_SPEC.md), and the
[organization step](CANONICAL_PROJECTION_REFACTOR_PART_3_ORGANIZATION_SPEC.md)
and [part 4](CANONICAL_PROJECTION_REFACTOR_PART_4_POLITICS_CULTURE_POI_SPEC.md)
are implemented. Part 5 is explicitly deferred and is not a prerequisite for
part 6; [part 6](CANONICAL_PROJECTION_REFACTOR_PART_6_APPLICATION_CUTOVER_SPEC.md)
is implemented and its application cutover and canonical audit are closed out.

This roadmap also implements the architecture's Project Organization rule:
file location must make each architectural category visible. The organization
step follows the existing slices and precedes more domain work.

## Target contract

```text
raw generation data -> generator/action -> Base Sector DTO
                                            |
                         projection data + pure projector
                                            |
                                            v
                                    Display Sector DTO -> UI
```

- The Base DTO stores generated outcomes, independent editable facts, and
  campaign state. It excludes generation tables, weights, deterministic
  interpretations, and display-only fields.
- The active plan uses one shared Display DTO. It may copy canonical values,
  including GM-only facts, and add calculated values, content, labels, and
  assets. It is never saved as canonical state. The player preview remains a UI
  presentation mode, not an access-control or data-redaction boundary.
- Projection is deterministic and side-effect free. The UI renders Display
  DTOs and handles interaction; it does not infer domain or content facts.
- A user action may run generation after initial sector creation. It updates
  the Base DTO through an application/generator operation, then projects the
  resulting state. The timing of that action does not change the data flow.
- Generated random choices, such as a selected portrait variant or culture
  outcome, remain canonical when they cannot be reconstructed from the other
  canonical facts and deterministic projection data.

## Sub-specs

The order below is a suggested migration sequence. Each sub-spec should name
its Base DTO fields, Display DTO fields, raw and projection data, covered UI
consumers, migration effects, and acceptance tests.

### 1. Planet facts and ratings — detailed spec exists

Implement the [first planet slice](CANONICAL_PROJECTION_REFACTOR_SPEC.md):
project planet colors, displayed composition, ratings, and generated inspector
text for the symbolic view and planet inspector. Then remove the demonstrably
derived `TotalHab`, `TidallyLocked`, and `HabitabilityRating` fields from the
canonical schema. This is a vertical slice, not a claim of whole-app compliance.

### 2. Stars, systems, spatial facts, and routes — implemented

Implement [part 2](CANONICAL_PROJECTION_REFACTOR_PART_2_SPEC.md): project star presentation, orbital and system boundaries, temperature bands,
route lengths, endpoint descriptions, object-kind labels, and system-level
summaries. Cover the hex map, top-down and symbolic system views, and route
inspector. Audit stored route and spatial fields one by one: keep random
placements and independently generated relationships; move values determined
by canonical coordinates, star type, or linked entities into projection.
Remove UI imports of generation-rule tables for these display calculations.

### 3. Project organization — implemented

Implement [part 3](CANONICAL_PROJECTION_REFACTOR_PART_3_ORGANIZATION_SPEC.md):
move the existing SWN sector code into category directories under
`src/generators/swn_sector/`, using the architecture's `Data/Raw`,
`Data/Projection`, `Generator`, `BaseDTO`, `Projector`, `DisplayDTO`, and `UI`
categories. Keep supporting helpers, validation, serialization, and composition
in clearly named supporting locations. The exact names may follow repository
conventions, but a file's category must be clear from its path.

The implementation spec should inventory every source file and generation-data
file, assign it a target category, and identify modules that need splitting.
In particular, separate raw generation tables from deterministic projection
tables, place the canonical sector types in `BaseDTO`, and give Display DTO
contracts their own category rather than leaving them inside
projector modules. Remove compatibility re-exports that continue to expose
projection rules through generation-table modules. Update imports, entry points,
tests, and data paths. Document any shared deterministic rules used by both
generation and projection so neither layer imports the other's DTO or UI code.

This step is a structural migration: generated Base DTO values and projected
output should remain the same. Accept it when the file inventory has no
unassigned architectural modules, the app and type checks pass, and existing
fixed-seed generation and projection tests still pass. Record legacy
dependencies reserved for later sub-specs with their owner in the implementation
spec.

### 4. Politics, culture, and points of interest — implemented

Implement [part 4](CANONICAL_PROJECTION_REFACTOR_PART_4_POLITICS_CULTURE_POI_SPEC.md): distinguish resolved generated events and culture choices from values that can
be calculated from them. Project polity capability interpretations, claim
summaries, conquest explanations, world-tag descriptions, culture display, and
habitable-POI presence and text. Keep randomly selected culture content and
historical outcomes canonical when other canonical facts cannot reconstruct
them. Make world completion an application command that generates a new Base
DTO and then projects it; rendering must not call generation directly.

### 5. Disclosure, names, and assets — deferred; do not implement in this refactor

The [deferred Part 5 document](DEFERRED_PART_5_DISCLOSURE_NAMES_ASSETS.md)
records the possible future work. The current project will not create separate
GM and player DTOs, enforce player-safe redaction in projection, or make the
player preview a security boundary. Existing preview, scan, name, and asset
presentation behavior may continue. The completed
[portrait index slice](CANONICAL_PROJECTION_PORTRAIT_INDEX_SPEC.md) remains in
place. Do not silently move the deferred disclosure work into part 6.

### 6. Application cutover and canonical audit — implemented

Make the application's read boundary return one shared Display Sector DTO,
while commands accept IDs and explicit edits to canonical state. Remove direct
Base DTO imports and domain/content derivation from UI components, except for
the existing GM/player preview, scan, and visible-name presentation decisions
explicitly deferred in part 5. The shared DTO may contain GM-only data; no
player-safe payload or redaction guarantee is required. Audit every remaining
Base DTO field against the rule: **if the
same value can be reconstructed from other Base fields plus deterministic
projection data, remove it**. Classify generation provenance and schema
metadata explicitly. Update validation and any schema version affected by
removed fields. The present prototype stores sectors only in memory, so this
sub-spec should address external migration only if persistence is introduced.
The [part 6 implementation spec](CANONICAL_PROJECTION_REFACTOR_PART_6_APPLICATION_CUTOVER_SPEC.md)
records the current direct reads, command boundary, field audit, cutover order,
and acceptance checks.

## Completion criteria for the active refactor

1. Every UI read goes through the shared Display DTO; UI actions update
   canonical state through application commands and receive a newly projected
   result. The DTO may contain GM-only data in either preview mode.
2. No UI component imports raw generation tables or derives domain/content
   facts from the Base DTO. Existing preview, scan, and visible-name
   presentation decisions are an explicit exception until deferred part 5 is
   separately authorized.
3. No random selection occurs in projection or rendering. Re-projecting the
   same Base DTO with the same projection data yields equal output without
   changing the Base DTO.
4. The Base DTO has no known reconstructable fields, weights, distributions,
   or presentation values; the field audit records any disputed exceptions.
5. Fixed-seed generation and key GM/player workflows retain their intended
   behavior, with deliberate schema changes documented in the relevant
   sub-spec. Player preview is a display convenience, not a confidentiality
   guarantee.
6. Architectural source and data files live in category locations; shared
   support files have explicit homes, and imports preserve dependency direction.

Until sub-spec 6 is complete, individual slices may still coexist with legacy
UI reads of the canonical sector. Each slice must identify its remaining
direct reads so that the final cutover has an explicit checklist. Part 6's
checklist excludes the deferred disclosure contract; completion of the active
refactor does not imply completion of part 5.
