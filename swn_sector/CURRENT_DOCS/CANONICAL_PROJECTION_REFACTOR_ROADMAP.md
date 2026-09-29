# SWN Sector Canonical Generation and Projection Refactor

## Purpose

This document covers the **whole SWN_SECTOR architecture refactor** described
in [Canonical Generation and Projection Architecture](../../temp/canonical-generation-projection-architecture.md)
and its [toy example](../../temp/canonical-generation-projection-toy-example.md).
It sketches the smaller implementation specs needed to get there. The
[first planet slice](CANONICAL_PROJECTION_REFACTOR_SPEC.md) and
[part 2](CANONICAL_PROJECTION_REFACTOR_PART_2_SPEC.md) are implemented;
the remaining sub-specs below are proposed scopes, not completed specs.

This roadmap is about data ownership and dependency direction. It does not
prescribe a folder reorganization.

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
- A Display DTO may copy canonical values and add calculated values, content,
  labels, assets, and visibility-specific read models. It is never saved as
  canonical state.
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

### 3. Politics, culture, and points of interest — spec to write

Distinguish resolved generated events and culture choices from values that can
be calculated from them. Project polity capability interpretations, claim
summaries, conquest explanations, world-tag descriptions, culture display, and
habitable-POI presence and text. Keep randomly selected culture content and
historical outcomes canonical when other canonical facts cannot reconstruct
them. Make world completion an application command that generates a new Base
DTO and then projects it; rendering must not call generation directly.

### 4. Disclosure, names, and assets — spec to write

Define a single projection contract for GM versus player output and the four
scan levels. Visibility grants, independently editable names, and authored
intelligence remain canonical; the chosen visible name, redacted text, labels,
and asset URLs belong in the Display DTO. Preserve randomly selected portrait
IDs as canonical outcomes, while resolving their source paths and styles in
projection. Cover the inspector, maps, system views, culture screen, and any
other UI that currently makes its own disclosure decisions. Specify how a
missing or invalid asset is represented in the Display DTO.

### 5. Application cutover and canonical audit — spec to write

Make the application's read boundary return a complete Display Sector DTO for
the current view, while commands accept IDs and explicit edits to canonical
state. Remove direct Base DTO imports and domain/content derivation from UI
components. Audit every remaining Base DTO field against the rule: **if the
same value can be reconstructed from other Base fields plus deterministic
projection data, remove it**. Classify generation provenance and schema
metadata explicitly. Update validation and any schema version affected by
removed fields. The present prototype stores sectors only in memory, so this
sub-spec should address external migration only if persistence is introduced.

## Completion criteria for the whole refactor

1. Every UI read goes through the Display DTO; UI actions update canonical
   state through application commands and receive a newly projected result.
2. No UI component imports raw generation tables or derives domain/content
   facts from the Base DTO.
3. No random selection occurs in projection or rendering. Re-projecting the
   same Base DTO with the same projection data yields equal output without
   changing the Base DTO.
4. The Base DTO has no known reconstructable fields, weights, distributions,
   or presentation values; the field audit records any disputed exceptions.
5. Fixed-seed generation and key GM/player workflows retain their intended
   behavior, with deliberate schema changes documented in the relevant
   sub-spec.

Until sub-spec 5 is complete, individual slices may still coexist with legacy
UI reads of the canonical sector. Each slice must identify its remaining
direct reads so that the final cutover has an explicit checklist.
