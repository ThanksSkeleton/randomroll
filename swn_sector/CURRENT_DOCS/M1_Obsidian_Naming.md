# M1 Obsidian Vault Naming — Collision Problem

## Requirement

Vault pages should use human-readable names rather than GUIDs. Duplicate page names must cause a clear error instead of receiving an automatic GUID suffix or silent overwrite.

## Current conflict

- The current converter uses GUIDs in folders, filenames, links, and `source_id` properties. It checks duplicate IDs and paths, but not duplicate human-readable names.
- The existing `sector-one-seed` JSON contains two systems named **Novosibirsk**. A strict system-name rule would reject this sector.
- Every inhabited world produces a polity whose name initially matches its homeworld. Separate WorldPolity and WorldInfo pages therefore collide by design if names must be unique across all page types.

## Decisions for this sub-spec

1. Define where uniqueness is required: across the entire vault, within each page type, or within each folder. Define whether names that differ only by case, spacing, or filename normalization count as duplicates.
2. Define the human-readable names and paths for WorldPolity, WorldInfo, System, Route, and POI pages, including the intentional world/polity name pair.
3. Decide whether GUIDs are forbidden only in page names and links or also inside page content and metadata.
4. Decide whether duplicate source names are prevented during sector generation, rejected during JSON export, or rejected by the vault converter. No automatic renaming should be introduced without an explicit change to this requirement.

The converter should detect all resulting page-path collisions before writing any vault files and report the conflicting source entities and proposed path.
