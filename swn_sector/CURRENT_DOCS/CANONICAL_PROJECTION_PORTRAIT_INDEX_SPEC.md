# SWN Sector: Canonical Portrait Index

## Status

Implemented as a portrait slice of the [canonical projection roadmap](CANONICAL_PROJECTION_REFACTOR_ROADMAP.md). The in-memory canonical schema advances from `merged-v5` to `merged-v6`.

## Ownership

- The Generator rolls one zero-based `PortraitIndex` from 0 through 17 for each portrait-bearing entity. It uses the same seeded portrait random stream and ordinal choice as the former portrait ID selection. It does not select an asset category, path, variant name, or CSS style.
- The Base DTO stores only the optional integer `PortraitIndex`. Stars, uninhabited planets, other celestial objects, POIs, and routes receive one. Inhabited planets, HPOIs, route portals, systems, and the player ship retain their existing no-portrait behavior. A portal displays its owning route's choice; a system displays its star's choice.
- Projection data maps each category and index to its source image and styling. All categories have 18 variants in a stable order. The projector derives the category from canonical star type, object type, POI type, route membership, or uninhabited planet size, composition, and effective temperature. It returns a Display DTO with the variant ID, URL, style, category, and copied index.
- `projectPortrait` receives the preview and asset base URL explicitly. It returns no portrait for a player without Basic scan visibility, an invalid index, a missing route relationship, or an unsupported planet combination. It does not mutate canonical state or choose randomly.
- Sector validation rejects non-integer or out-of-range indices. `PortraitAssetId` is no longer a canonical field and is rejected as an unknown property.

## Compatibility and checks

The prototype has no persisted sector boundary, so no external migration is included. The fixed-seed regression test projects each new index back to the former variant ID and compares the resulting canonical JSON hash with the pre-change `merged-v5` output. This checks that all seeded choices and other canonical facts are retained. Portrait tests cover index zero, invalid indices, deterministic projection, asset paths and styles, visibility, and route portals.

The full disclosure and asset contract remains in roadmap sub-spec 5; this slice changes the portrait path only.
