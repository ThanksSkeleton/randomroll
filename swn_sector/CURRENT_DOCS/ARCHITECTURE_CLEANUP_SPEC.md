# SWN Sector Architecture Cleanup

## Goal and baseline

Simplify `src/generators/swn_sector/` without changing generated sectors, display values, command results, validation outcomes, or the `merged-v7` schema. Perform the four steps below in order. This is a follow-up to the completed canonical projection refactor, not a new data-model migration.

Use [the baseline module import graph](SWN_SECTOR_IMPORT_GRAPH_BASELINE.json) and its [folder view](SWN_SECTOR_IMPORT_GRAPH_BASELINE.mmd) to locate current consumers. The JSON contains `fileEdges`, `layerEdges`, and the pre-cleanup cycle list. It covers 72 production TypeScript files and excludes tests. **It is an import graph, not a function-call graph**: confirm individual symbol use with `rg -n '<symbol>' src/generators/swn_sector` before moving a function. The baseline graph is a snapshot; inspect live imports after each step.

## 1. Remove `Validation/`

- Move canonical shape, schema-version, unknown-key, identity, reference, and edit-safety checks from `Validation/invariants.ts` into `Helpers/Domain/canonical_validation.ts`. Keep its input as `unknown` and retain useful rule IDs and messages. Application commands must continue to reject every edit or operation they rejected before this cleanup.
- Move checks that assert the output of the generation process, including generated counts, eligibility, world-tag constraints, and required generated content, into `Generator/generated_sector_invariants.ts`. Keep a full `checkAllInvariants` entry point there for generator tests and the current application gate. Compose it from the canonical checks plus generation checks; do not silently relax the application gate as part of a folder move. A later behavior change can decide which generation assertions should stop gating edits.
- Move `validPolityFlag` from `Validation/politics.ts` into `Helpers/Domain/canonical_validation.ts` or a small adjacent shared rule module. Retain the current checks against the flag palette, format, and duplicate field colors.
- Remove the overlapping, test-only `Validation/sector_validation.ts`. Change its test callers to the canonical or full validator according to what each test asserts; do not keep a second sector validator under another name.
- Move and split `Validation/invariants.meta.test.ts` beside the validators it exercises. Keep tests for malformed input, unknown keys, references, and representative generated-sector rules. Delete `Validation/` after imports and tests move.
- Put no validation function into `Projector/` unless it checks a projected value. The current projector already reports projection failures for unresolved references; preserve that behavior without making Generator or Application import Projector validation.

## 2. Move single-owner helpers

Treat a **consumer** as an architectural folder, not one import statement. Move a helper only when its production use belongs to one folder. Split mixed files at function boundaries; do not duplicate shared rules.

- Move `Helpers/Domain/composition_interpretation.ts` to `Projector/`: `displayBulkComposition` has only projector consumers. The older organization spec's statement that generation uses it is stale.
- Move `formatPlanetAu`, `isTidallyLocked`, and `POPULATION_TIER` from `planet_interpretation.ts` into an appropriate `Projector/` module. Keep habitability, technology, and other tables/functions used by Generator, Projector, or validation in the shared file.
- Move `normalTemperatureAuBand` and `systemEdgeAu` from `spatial_interpretation.ts` into `Projector/`. Keep orbit bands, temperature resolution, and `effectiveOrbit` shared because Generator, Projector, and/or validation use them.
- Keep `politics_interpretation.ts`, `poi_host_interpretation.ts`, `portrait_index.ts`, `scan_visibility.ts`, and `sector_selectors.ts` in the shared area. Keep the shared portions of `planet_interpretation.ts` and `spatial_interpretation.ts` there too. Recheck these decisions against live imports after step 1.
- Remove unused exports only after checking production and test references. Preserve all generated values and projected strings.

## 3. Rename the shared folder

Rename `Helpers/Domain/` to top-level `Shared/`, then update imports, colocated tests, and current documentation that describes active paths. Leave historical implementation notes identifiable as historical rather than rewriting their account of the original migration. No `Helpers/` directory should remain if it is empty.

## 4. Rename the application folder

Rename top-level `Composition/` to `Application/`, including its tests. Update every import and active-path reference. `Application/prototypeApplication.ts` continues to own the in-memory canonical sectors, execute commands, validate before committing, project reads, and return detached display values. Keep it distinct from `UI/application/`, which owns UI state.

## Acceptance checks

1. No `Validation/`, `Helpers/Domain/`, or `Composition/` path remains in production imports; no empty legacy folder remains.
2. The only production UI boundary into canonical state is `Application/`; UI still reads Display DTOs. Generator does not import Projector or UI. Projector does not import Generator or UI.
3. The same fixed seeds produce equal Base DTOs, and repeated projection produces equal Display DTOs. Existing command success/failure results and validation rule outcomes remain unchanged.
4. Run `npx tsc --noEmit`, `npx vitest run src/generators/swn_sector src/generators/swn_culture`, and `npx vite build`. Resolve failures before declaring the cleanup complete.
5. Regenerate or recheck the dependency graph after step 4 and report any remaining cross-layer imports or cycles. The baseline JSON is the comparison point, not proof of the final state.
