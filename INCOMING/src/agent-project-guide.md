# Agent project guide

## What this project is

SWN Sector Map V0 is a browser-based React/TypeScript prototype for viewing and editing a Stars Without Number sector. It currently uses deterministic local fixtures and an in-memory archive. It is not connected to a production generator, database, identity provider, or authorization system.

The default experience is:

- GM session.
- `Sector1` loaded.
- Sector hex map visible.
- GM/player controls represent preview modes, not authenticated users.

The prototype’s appearance and interaction behavior are part of the current contract. Structural work should preserve class names, labels, DOM semantics, data field names, and observable transitions unless a task explicitly changes them.

## Runtime and development entry points

| Purpose | Entry point |
| --- | --- |
| Browser bootstrap | `src/main.tsx` |
| Application composition and workflow coordination | `src/App.tsx` |
| Styles and visual contract | `src/styles.css` |
| Development server | `npm run dev` |
| Unit/component tests | `npm test` |
| Production typecheck/build | `npm run build` |
| Vitest configuration | `vite.config.ts` |
| TypeScript configuration | `tsconfig.app.json` |

`src/main.tsx` mounts `App` inside `React.StrictMode` and imports the global stylesheet. Vite serves the app; there is no router or server runtime.

## Source layout

```text
src/
├── App.tsx                         # composition, derived view state, workflow callbacks
├── data.ts                         # deterministic prototype fixtures and cloning
├── types.ts                        # temporary compatibility re-export
├── application/
│   ├── appState.ts                 # application state shape and reducer transitions
│   └── prototypeApplication.ts     # concrete synchronous in-memory application boundary
├── domain/sector/
│   ├── model.ts                    # framework-independent sector data contract
│   ├── selectors.ts                # read-only queries and object lookup
│   ├── operations.ts               # immutable transformations and prohibited cases
│   ├── validation.ts               # sector invariant checks
│   └── index.ts                    # domain exports
└── features/
    ├── navigation/                # chrome and stage navigation
    ├── sector-map/                # sector hex-map rendering
    ├── system-viewer/             # symbolic and top-down system views
    ├── object-inspector/          # selected-object detail panel
    ├── sector-editor/             # GM lock/edit controls
    └── sector-archive/             # generation and archive controls
```

## Architectural boundaries

### Domain: `src/domain/sector`

This layer is framework-independent. It may use TypeScript and other domain modules, but must not import React, JSX, DOM APIs, CSS, network clients, storage, authentication, or generator implementation details.

The domain owns:

- The `Sector` schema and nested system/world/star/POI/route/ship types.
- Visibility levels and visibility ranking.
- Object lookup, containing-system lookup, route destination resolution, and hex adjacency.
- Immutable visibility changes, ship relocation, cascading deletion, edits, cloning/remapping, and validation.

Domain operations return typed success/failure results where an operation can be prohibited. Preserve serialized field names and casing such as `OriginalSeed`, `SectorName`, `DetailsAndVisibility`, `MoonOf`, and `VisibilityLevel`.

### Application state: `src/application/appState.ts`

`AppState` contains current sectors plus presentation/navigation state: active and archive indexes, view, preview, selection, current system, system representation, lock state, and edit draft.

Named reducer actions express user-intent transitions, including `selectObject`, `changePreview`, `openSystem`, `changeRepresentation`, `returnToSector`, `beginEditing`, `saveEditing`, `loadSector`, and `replaceSectors`. Keep related state changes atomic here rather than scattering them across components.

### Concrete application boundary: `src/application/prototypeApplication.ts`

`PrototypeApplication` is deliberately small and synchronous. It currently owns the local in-memory sector collection and exposes these replacement points:

```ts
generateSector(seed: string): Sector
listSectors(): Sector[]
loadSector(index: number): Sector | undefined
saveSector(index: number, sector: Sector): Sector[] | undefined
renameSector(index: number, name: string): Sector[] | undefined
deleteSector(index: number): DeleteSectorResult
getCurrentSession(): { role: 'gm' }
```

Do not turn this into a generic repository, provider framework, dependency-injection system, or async API without inspecting the real systems first. The sector schema currently has no stable sector ID, so indexes are a prototype-local assumption documented for replacement in Sequence 05.

### Features: `src/features`

Feature components render coherent UI regions and receive narrow props. They should delegate sector rules to domain functions and application workflows rather than implementing mutations inline. Preserve existing CSS selectors and accessible names when moving or extending UI.

Important feature responsibilities:

- `AppChrome`: sector/archive navigation and GM/player preview controls.
- `HexMap`: sector-wide systems, routes, and ship display.
- `SystemViewer`: restricted system view composition.
- `SymbolicSystem`: symbolic systems, worlds, routes, and intelligence cards.
- `TopDown`: top-down system geometry, planets, moons, POIs, ships, and adjacent systems.
- `DetailBar`: selected-object inspection and editable detail fields.
- `GMEditBar`: lock/unlock, visibility, movement, deletion, and edit actions.
- `SectorArchive`: seed generation and archive selection/load/rename/delete controls.

## Data and behavior notes

`src/data.ts` creates two deterministic fixtures and provides clone-based generated sectors. Generated sectors inherit the second available sector as a template, receive fresh IDs, preserve the requested seed, and are named `Generated-{index}-{seed}`. This is prototype fixture logic, not the future production generator.

The sector contract requires globally unique selectable IDs and exactly one detail/visibility record per selectable object. `validateSector` checks these and related parent, route, and player-ship invariants.

Player mode is presentation filtering only. It hides objects based on visibility and changes displayed names; it is not authentication or authorization. The local session always reports GM.

The archive is memory-only. Refreshing the browser recreates the two initial sectors. There is no `localStorage` or server persistence.

## Where to make common changes

| Change | Primary location | Keep in mind |
| --- | --- | --- |
| Add or alter a sector field | `domain/sector/model.ts` | Preserve serialized names and update validation/tests. |
| Add a sector query | `domain/sector/selectors.ts` | Keep it pure and reusable from UI. |
| Add a sector mutation/invariant | `domain/sector/operations.ts` | Return a new sector or typed failure; test prohibited cases. |
| Change navigation/selection semantics | `application/appState.ts` | Add or adjust a named transition and reducer test. |
| Change local generation/archive behavior | `application/prototypeApplication.ts` | Preserve current behavior and test the boundary. |
| Change fixture shape/content | `data.ts` and `data.test.ts` | Validate IDs, routes, visibility records, and clone remapping. |
| Change a rendered region | Corresponding `features/*` module | Preserve classes, labels, DOM structure, and callbacks. |
| Coordinate multiple features/workflows | `App.tsx` | Keep it compositional; avoid putting domain rules here. |
| Change visual styling | `styles.css` | Check reference views and avoid unrelated selector cleanup. |

## Verification workflow for agents

Before editing, inspect the working tree and run the baseline checks:

```bash
git status --short
npm test
npm run build
```

After editing:

```bash
npm test
npm run build
git diff --check
```

For UI-affecting work, use the managed Playwright browser. At minimum check startup, the affected workflow, GM/player preview behavior when relevant, and browser console errors. Review the diff for accidental changes to copy, class names, accessibility labels, or styling.

The project does not currently include a browser-test dependency or a screenshot-regression harness. Do not add one merely for inspection. Existing tests are Vitest plus Testing Library in `jsdom`; prefer user-visible assertions over component implementation details.

## Migration status and constraints

Sequences 01–04 are complete:

1. Characterization coverage and browser reference behavior were established.
2. The sector domain was extracted.
3. UI features and application transitions were extracted.
4. Concrete local replacement points for generation, archive persistence, and session lookup were added.

Sequence 05 is intentionally not started. It is the future integration phase for the real generator, production persistence, and authentication. Before beginning it, inspect those external systems and revisit the unresolved identity, async, error, concurrency, and session assumptions in the Sequence 04 handoff.

Do not introduce production integrations, login UI, server authorization, storage persistence, generic adapters, or a framework abstraction as part of routine prototype maintenance.

## Related documents

- [`docs/migration-sequence-01-04.md`](./migration-sequence-01-04.md) — phase objectives and acceptance gates.
- [`docs/migration-sequence-01-behavior-matrix.md`](./migration-sequence-01-behavior-matrix.md) — characterized workflows.
- [`docs/migration-sequence-02-domain-boundary.md`](./migration-sequence-02-domain-boundary.md) — domain boundary details.
- [`docs/migration-sequence-02-handoff.md`](./migration-sequence-02-handoff.md) — domain extraction handoff.
- [`docs/migration-sequence-03-handoff.md`](./migration-sequence-03-handoff.md) — feature/state extraction handoff.
- [`docs/migration-sequence-04-handoff.md`](./migration-sequence-04-handoff.md) — concrete integration replacement points.
- [`assumptions.txt`](../assumptions.txt) — product assumptions and resolved ambiguities.
