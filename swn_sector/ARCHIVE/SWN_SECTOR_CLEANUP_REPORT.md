# SWN Sector cleanup report

Date: 2026-09-21

## Executive summary

The fused application is now rooted at `swn_sector/index.html`, which loads
`src/generators/swn_sector/ui/main.tsx`. The UI reaches the canonical
`merged-v1` generator through `ui/application/prototypeApplication.ts` and
`ui/data.ts`, both of which call `generate()` from
`src/generators/swn_sector/generate.ts`.

The main cleanup opportunity is a disconnected legacy V1–V4 implementation:

- `src/generators/swn_sector/sector.ts`
- `src/generators/swn_sector/sector_shared.ts`
- `src/generators/swn_sector/visualizer.ts`
- `src/test/swn_sector_v4.test.ts`

The first two production files are reached only by the old V4 test and the
disconnected visualizer. The visualizer is not loaded by any HTML entry point.
These four files can be removed as one unit after deciding that the historical
V4 artifact test is no longer required.

Two smaller TypeScript compatibility barrels have no importers anywhere and
are safe deletion candidates now:

- `src/generators/swn_sector/ui/types.ts`
- `src/generators/swn_sector/ui/domain/sector/index.ts`

The documentation contains two completed histories: the original RAW/V1–V4
design and the merged-generator/UI-fusion process. Most can be archived or
deleted. `ui/agent-project-guide.md` should instead be rewritten because it is
the apparent current guide but contradicts the fused implementation.

## Evidence and method

The audit used these roots and classifications:

1. Production root: the module script in `swn_sector/index.html`.
2. Test roots: all `*.test.ts` and `*.test.tsx` files discovered by Vitest.
3. Tool roots: package scripts plus intentionally standalone scripts.
4. Static reachability: local `import`, `export ... from`, and dynamic import
   edges, resolved with TypeScript/JavaScript extensions and index modules.
5. Repository history: the old generator predates the `new sector UI`,
   `migration part 1`, `get rid of model.ts`, and `continued integration with
   UI map` commits. The live HTML entry changed to the React UI in the new-UI
   commit.

This is a reachability report, not an automatic deletion list. A file can have
no importers because it is an HTML entry, a test, a declaration file, or a
manual command-line tool.

## JavaScript and TypeScript cleanup candidates

### Remove together: disconnected legacy V1–V4 application

| File | Current reachability | Recommendation |
| --- | --- | --- |
| `src/generators/swn_sector/sector.ts` | Not reachable from the current UI or canonical `generate()` path. Imported only by `visualizer.ts` and `src/test/swn_sector_v4.test.ts`. It contains the separate `SectorV3`/`SectorV4` models and old `generateSector()` implementation. | Delete with the visualizer and legacy test. High confidence. |
| `src/generators/swn_sector/sector_shared.ts` | Imported only by legacy `sector.ts`. | Delete with `sector.ts`. High confidence. |
| `src/generators/swn_sector/visualizer.ts` | Has no importer. It expects an `#app` root and renders the old `SectorV4` shape; the current page supplies `#root` and loads `ui/main.tsx`. | Delete with the legacy generator. High confidence. |
| `src/test/swn_sector_v4.test.ts` | Actively discovered by Vitest, but its only subject is legacy `generateSector()` and its `v4` artifact. It writes `/tmp/randomroll-swn-sector-v4.json`. | Delete with the legacy generator. High confidence once historical V4 coverage is intentionally retired. |

Removing this set eliminates about 2,068 lines before documentation and schema
artifacts are considered.

### Safe independent deletion candidates

| File | Evidence | Recommendation |
| --- | --- | --- |
| `src/generators/swn_sector/ui/types.ts` | Three-line re-export of `merged_schema`; no code or test imports it. | Delete. High confidence. |
| `src/generators/swn_sector/ui/domain/sector/index.ts` | Five-line barrel; no code or test imports it. Callers already import the concrete modules. | Delete. High confidence. |

### Review before deletion

| File | Why it looks leftover | Why it is not an automatic deletion |
| --- | --- | --- |
| `src/test/swn_sector_v2_constraints.test.ts` | It tests the V2-era raw table model and implements its own exhaustive compatibility checker. It does not test the canonical generator. | Vitest still runs it, and some raw-data integrity checks are not duplicated exactly by `generation_rules.test.ts`. Either retain it as data validation or port the valuable assertions before deletion. Medium confidence. |
| `swn_sector/extract_tables.mjs` | No importer or package script references it. It belongs to the original PDF extraction phase and writes `world_attributes.json`, while the live generator consumes `world_attributes_2.json`. | It is a standalone provenance/regeneration tool. Archive it with extraction documentation, or update and document it if reproducible data extraction is still desired. Do not run it casually because it overwrites JSON data. Medium-high confidence that it is obsolete in its current form. |

### Confirmed non-leftovers

- `src/generators/swn_sector/invariants.ts` is not in the browser bundle, but it
  is the oracle used by `stochastic_success.test.ts` and should remain.
- Every canonical generator module from `generate.ts` through
  `generate_system.ts`, `generate_inhabited_planet.ts`, `generate_routes.ts`,
  `planet_templates.ts`, `generation_rules.ts`, `generation_random.ts`,
  `tables.ts`, and `merged_schema.ts` is reachable from the live UI.
- The UI feature, application, and concrete domain modules are reachable from
  `ui/main.tsx`; only the two barrels listed above are disconnected.
- `ui/vite-env.d.ts` is an ambient Vite declaration file. It is expected to
  have no importer.
- Test files generally have no importers because Vitest discovers them; this
  alone is not evidence that they are dead.
- Elsewhere in the repository, `src/counter.ts` has no importer and appears to
  be the untouched Vite scaffold counter. It is outside SWN Sector but is a
  high-confidence repository-level cleanup candidate.

## Documents associated with the old design

### Archive or delete with the legacy generator

| Document | Association |
| --- | --- |
| `swn_sector/SWN_SECTOR_GOAL.md` | Original phased project brief. Its implementation references point to V2–V4, `sector.ts`, and the old V4 visualizer. |
| `swn_sector/Sector_Creation_Flow_V1.md` | Deliberately simplified V1 output and rules. |
| `swn_sector/Sector_Creation_Flow_V2.md` | V2 constraint-aware design tied directly to `sector.ts` and the V2 test. |
| `swn_sector/Sector_Creation_Flow_V3.md` | Old V3 star/world schema and generation order. |
| `swn_sector/Sector_Creation_Flow_V4.md` | Old `SectorV4`, location-slot, and visualizer contract. |
| `swn_sector/sector_v4.schema.json` | Machine-readable contract for the obsolete V4 shape. It is not Markdown/HTML, but it belongs to the same cleanup set. |
| `swn_sector/PHASE_1_OVERVIEW_AND_PLAN.md` | Initial extraction/flow/UI plan, written before implementation. |

`swn_sector/Sector_Creation_Flow_RAW.md` is also part of the original design
work, but it is a useful book-procedure reference rather than an implementation
contract. Keep it if source traceability matters; otherwise archive it with the
other flow documents.

### Usually retain as source rationale

| Document | Reason to retain |
| --- | --- |
| `swn_sector/AU_Range_Notes.md` | Explains the AU-width interpretation now encoded in canonical generation rules. It remains useful design rationale. |
| `swn_sector/Sector_Creation_Flow_RAW.md` | Records the source-book procedure independently of either implementation. |

## Documents associated with the merge/fusion process

### Completed planning and handoff artifacts: archive or delete

| Document | Association |
| --- | --- |
| `swn_sector/SCHEMA_COMPARISON.html` | Field-by-field comparison of legacy `SectorV4`, the prototype UI model, and the proposed merged model. Its recommendation to merge has been implemented. |
| `MERGE_GAMEPLAN.md` | Phase plan for constructing the merged generator; the UI section is still marked TBD despite the fusion being complete. |
| `INVARIANTS_2A.md` | Inventory translating old-generator behavior into merged invariants; it cites legacy `sector.ts` extensively. |
| `INVARIANTS_2B.md` | Domain-invariant design pass used to shape the merged schema and tests. |
| `PART_5_IMPLEMENTATION_SPEC.md` | Implementation specification for `generate()`; explicitly says to keep the old V4 generator/visualizer operational during that phase. That transitional requirement has expired. |
| `Validation_test.md` | Starter plan for the stochastic invariant test now implemented in code. |
| `RouteElaborationSpec.md` | Schema-design decision record for canonical routes and portals. |
| `TemperatureElaborationSpec.md` | Schema-design decision record replacing legacy thermal/orbit categories. |
| `GPT_SOL_INSPECTION_HANDOFF.md` | One-time request to inspect a temporary generated artifact. |
| `GPT_SOL_INSPECTION.md` | Completed manual-inspection verdict and resolution log. |
| `docs/swn-sector-generator-ui-integration-gameplan.md` | Exact generator/UI fusion plan. Its acceptance criteria are now reflected in the code. Note: the whole `docs/` directory is ignored by Git, so this file is present locally but untracked. |

These files contain useful history, but they should not remain mixed with
current operational documentation. If history is valuable, move them under a
clearly named archive such as `docs/archive/swn-sector/`; otherwise remove them
and rely on Git history.

### Retain or convert into current documentation/issues

| Document | Recommendation |
| --- | --- |
| `PHASE_1_FOLLOWUPS.md` | Contains unresolved product work, including station accounting and uninhabited moons. Keep it or migrate each live item to the project's issue tracker before archiving. |
| `perf_exhaustive.md` | Keep for now. It describes the same stochastic-test timeout observed during this audit, so it is still operationally relevant. Consolidate it into a current troubleshooting/performance note after the timeout is fixed. |

### Rewrite immediately: misleading current guide

`src/generators/swn_sector/ui/agent-project-guide.md` mixes updated statements
with pre-fusion claims and broken paths. Specific contradictions include:

- It says the UI uses local fixtures and is not connected to the production
  generator, while `ui/data.ts` and `prototypeApplication.ts` call the real
  canonical generator.
- It says `Sector1` is the default, while initial sectors are generated from
  `sector-one-seed` and `sector-two-seed` and use generator-provided names.
- Entry points are documented as `src/main.tsx`, `src/App.tsx`, and
  `src/styles.css`, but they actually live under
  `src/generators/swn_sector/ui/`.
- It cites `tsconfig.app.json`, which does not exist.
- Its layout still lists deleted `domain/sector/model.ts` and calls
  `types.ts` a temporary compatibility export.
- It describes legacy fields such as `DetailsAndVisibility`, `MoonOf`, and
  `OriginalSeed` as the domain contract even though the UI now uses
  `merged_schema.ts` entities directly.
- It says integration Sequence 05 has not started, while the integration has
  been implemented.
- All seven documents in its “Related documents” section are absent at the
  referenced locations.

This file should become the concise current architecture/maintenance guide;
deleting it outright would remove the only colocated agent guidance for the
SWN UI.

## Recommended cleanup order

1. Rewrite `ui/agent-project-guide.md` to describe the fused architecture and
   remove broken migration references.
2. Delete the two unused compatibility barrels.
3. Delete the legacy V4 code/test island (`sector.ts`, `sector_shared.ts`,
   `visualizer.ts`, and `swn_sector_v4.test.ts`) together.
4. Decide whether the V2 raw-data test still provides desired independent
   validation; port any valuable assertions before removing it.
5. Archive or delete the completed design/fusion documents as grouped above,
   including `sector_v4.schema.json` with the V4 group.
6. Keep open follow-ups, the current performance note, RAW source traceability,
   and AU rationale until their information has a deliberate new home.

## Verification status

- `npx tsc --noEmit`: passed.
- `npm test -- --run`: 14 test files passed and one failed; 86 of 87 tests
  passed. The failure was the known five-second timeout in
  `stochastic_success.test.ts`, matching `perf_exhaustive.md`.
- `npm run build`: could not reach typecheck/build because `tsx` was denied
  permission to create its IPC socket at `/tmp/tsx-1000/38.pipe` while running
  the JSON-generation pre-step. No source cleanup was performed as part of
  this report.
