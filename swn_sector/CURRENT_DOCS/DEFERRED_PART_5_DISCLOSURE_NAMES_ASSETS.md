# Deferred Part 5: GM and Player Disclosure, Names, and Assets

## Decision

Part 5 of the [canonical projection refactor roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md) is **deferred and outside the active refactor**. Do not build separate GM and player Display DTOs or a player-safe projection during part 6. Revisit this work only after an explicit scope decision.

The current app uses an in-memory sector in the browser. Its player preview controls what the UI shows, while the same client can hold GM-only facts. A person with access to that browser session or its data can inspect those facts despite the player preview. We accept that limitation for this prototype; the preview must not be described as secure redaction or authorization.

## Work reserved for a future project

- Define trusted GM and player read boundaries and decide whether to use separate DTO types, separate projection entry points, or another contract that prevents GM-only fields from entering a player payload.
- Apply the four scan grants consistently across the inspector, maps, system views, culture screen, routes, and any later UI. Define what a player receives when an entity or individual field is hidden.
- Resolve visible names, authored intelligence, stock text, labels, flags, and asset URLs within that boundary. Specify missing and invalid asset results. Preserve independently editable names, intelligence, and visibility grants as canonical state.
- Audit all client data paths, including initial sector loading, application command results, caches, exported data, and tests, so a player-facing read cannot expose a Base DTO or GM-only data by another route.
- Add tests that inspect the actual player payload for omitted GM fields and verify scan-level behavior, including after edits and world completion.

The existing [portrait index slice](CANONICAL_PROJECTION_PORTRAIT_INDEX_SPEC.md) remains implemented: the random portrait index is canonical and its category, source path, and style are projected. This deferred work concerns the remaining disclosure and asset contract.

## Boundary for part 6

Part 6 may create one shared Display Sector DTO containing all facts needed by the current GM and player previews. It may copy canonical visibility, names, and intelligence so the existing UI can choose what to show. It must not claim that its shared DTO is safe to send to an untrusted player. The active canonical field audit and application command cutover can proceed without this deferred project.
