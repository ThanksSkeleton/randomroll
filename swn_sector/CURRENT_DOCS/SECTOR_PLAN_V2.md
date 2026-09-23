# SWN Sector Plan V2

## Purpose

This project is a private *Stars Without Number* campaign companion for the GM and players. It generates a mechanically detailed sector that the GM can use as a starting shell, curate into campaign canon, and reveal to players over time.

The application generates systems, routes, worlds, tags, points of interest, and other procedural facts. It does not replace the GM's creative work. Stories, quests, NPCs, visual identity, tone, and final worldbuilding remain human-authored. Generated results may be edited or rejected after generation.

The intended campaign flow is:

1. The GM selects generation options and generates a sector.
2. The application generates the complete mechanical sector.
3. The application selects a starting inhabited world and places the player ship there.
4. The starting system and its immediate connections receive initial player visibility.
5. A one-time political-history pass establishes initial polities and conquests.
6. Initially known worlds may later receive additional generated cultural detail.
7. The GM edits and expands the generated material into campaign canon.
8. During play, the GM changes visibility and adds detail as the players explore.

This is an internal tool for the GM and their players. A VTT and automatic generation of complete narrative content are out of scope.

## Settled cross-cutting decisions

- Generation is performed in ordered phases. Later phases may depend on earlier results.
- Selectable entities retain stable IDs independent of their editable names.
- Generated results are persisted and may be manually edited.
- Rerolls are not supported. There is no selective reroll workflow or reroll provenance to maintain.
- Player disclosure uses the existing entity-level visibility values: `NONE`, `BASIC_SCAN`, `CULTURE_PARTIAL`, and `CULTURE_FULL`.
- GM-only notes and the generated sector truth continue to exist regardless of player visibility.
- Visual art should be clear, symbolic, consistent, and evocative rather than a canonical depiction of a place.
- The politics pass creates one-time sector history. It is not an ongoing grand-strategy simulation.
- Conquest never increases a polity's Attack, Defense, or Projection and never creates recursive conquest capability.
- A general-purpose campaign event log is not part of this plan. Section 4 may generate narrowly scoped battle-history notes.
- Data created by Sections 1–4 should remain structured enough to support later exports, but export work is deferred.

## Current implementation sequence

### 1. Cleanup, bugs, and simple elaborations

Improve the accuracy, readability, naming, and visual treatment of existing sector content without changing the basic product flow.

Detailed specification: [STEP_1_CLEANUP_SPEC.md](STEP_1_CLEANUP_SPEC.md)

### 2. Portrait system

Create hosted image banks for standard generated object categories, assign a stable portrait during sector generation, and provide deliberate placeholders for inhabited worlds and the player ship.

Detailed specification: [STEP_2_PORTRAITS_SPEC.md](STEP_2_PORTRAITS_SPEC.md)

### 3. Starting-world selection and initial visibility

Select an eligible inhabited starting world according to a GM-selected mode, place the ship there, and reveal the starting system plus its immediate route neighborhood.

Detailed specification: [STEP_3_STARTING_WORLD_SPEC.md](STEP_3_STARTING_WORLD_SPEC.md)

### 4. Initial politics and political dominance

Assign each inhabited world an initial polity and military capability derived from population and tech level, then resolve a non-recursive, one-time conquest pass.

Detailed specification: [STEP_4_POLITICS_SPEC.md](STEP_4_POLITICS_SPEC.md)

## Future reconnaissance plan

The remaining areas have useful source notes but are not ready for implementation. Each should receive a separate design pass after Sections 1–4 are specified and implemented.

### 5. Culture, naming, and detailed known worlds

Research and decide:

- The exact definition of a "known world" for cultural generation.
- When cultural detail is generated: initial generation, first reveal, or an explicit GM action.
- How cultural templates and original settlement reasons are selected.
- How the two world tags are summarized together.
- How merged enemy, friend, thing, and place results are generated and stored.
- How conflict, outsiders, law enforcement, starports, stations, and local opportunities are represented.
- World and system naming rules, including multi-inhabited-system tie-breaking.
- Which fields appear at `CULTURE_PARTIAL` and `CULTURE_FULL`.
- Which results remain suggestions versus structured campaign facts.

Expected output: a culture/detailing specification with schema changes, generation order, visibility behavior, UI locations, and acceptance criteria.

### 6. Factions

Research and decide:

- Whether the initial state contains one full faction plus one mentioned faction, or only one faction.
- The relationship between political polities and active campaign factions.
- Faction size, attributes, HP, credits, XP, goals, tags, homeworlds, and bases of influence.
- Starting asset selection and asset limits.
- How many factions become active during play.
- Whether factions receive automated turns or are maintained entirely by the GM.
- How PC-created factions and PC destruction of assets are represented.
- Whether faction activity produces a news chyron, newspaper, or radio-broadcast view.

Expected output: a deliberately bounded faction specification. It must avoid turning the application into an unintended strategy game unless that is explicitly chosen.

### 7. Export

Research and decide:

- Which sector views and data subsets can be exported.
- JSON schema and versioning expectations.
- Human-readable formats and player-versus-GM variants.
- Whether images are embedded, linked, or omitted.
- How hidden information and GM notes are protected in player exports.

Expected output: an export contract based on the structured data produced by earlier sections.

### 8. Final polish

Review the complete campaign workflow and identify only the work required to make it coherent and presentable. Candidate work includes additional imagery, improved names, logos, accessibility, responsive layout, and final copy editing.

Expected output: a finite release checklist rather than another open-ended feature phase.

### 9. Ship it

Prepare a brief demonstration and present the tool on stream.

## Explicitly out of scope

- Virtual tabletop features.
- Automated creation of complete plots, quests, NPCs, tone, or setting identity.
- Selective rerolls.
- A general-purpose campaign event ledger.
- Ongoing automated political simulation in Section 4.
- Fully automated faction play unless a later faction specification explicitly adds it.

## Source documents

This document supersedes `SWN_SECTOR_PLAN.txt` as the roadmap. The earlier plan and notes remain supporting design history:

- [SWN_SECTOR_PLAN.txt](SWN_SECTOR_PLAN.txt)
- [SWN_SECTOR_NOTES_1.txt](SWN_SECTOR_NOTES_1.txt)
- [SWN_SECTOR_NOTES_2.txt](SWN_SECTOR_NOTES_2.txt)
- [swn_battle_strength_matrix.csv](swn_battle_strength_matrix.csv)
