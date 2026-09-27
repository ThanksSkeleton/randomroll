# Visibility Rework Specification

## Purpose

Replace the current single, ordered visibility level with independent scan information for basic, detailed, and political knowledge. This supports upcoming polity and detailed world information.

## Data model

Each selectable entity has four GM-editable information fields:

| Field | Default | Player access |
| --- | --- | --- |
| Basic Scan | `-` | Basic Scan enabled |
| Detailed Scan | `-` | Detailed Scan enabled |
| Politics Scan | `-` | Politics Scan enabled |
| Deep Politics Scan | `-` | Deep Politics Scan enabled |

GM information remains separate and GM-only. There is no information field for Invisible. Replace the current `VisibilityLevel` representation with flags/state sufficient to represent the information available at each scan tier.

## Dependencies and controls

- Invisible is the state with no player information enabled.
- Basic Scan is required before Detailed Scan or Politics Scan information is available.
- Politics Scan is required before Deep Politics Scan information is available.
- Detailed Scan and Politics Scan are independent; a world may have either or both.
- The GM controls show the specified six icon states and are lit according to the enabled information and dependencies:
  1. Eye with X
  2. Eye with beaker
  3. Eye with two beakers
  4. Eye with crossed-out flag
  5. Eye with flag
  6. Eye with two flags

The control behavior for enabling a state whose prerequisites are off, and the exact mapping of all valid information combinations to the six icons, must be settled during implementation. Preserve independent Detailed and Politics information; do not collapse them into a single ordered rank.

## Icon assets

Add an image generation step to create reusable beaker, flag, and X artwork. Composite these elements with the existing eye motif to produce the required visibility symbols. Keep the generated components and composition process suitable for producing consistent UI assets.

## Detail pane

- Present player-visible content in four sections: Basic, Detailed, Politics, and Deep Politics.
- Gate each section by its corresponding enabled information and dependencies.
- Retain GM editing for all four information fields and the separate GM information.
- Add a GM-only tab selector that opens the GM information tab.
- Reserve a blank player-area tab with the same dimensions as the GM tab selector/area so the layout stays aligned in player mode.

## Required updates

- Update the schema, default entity construction, generation output, validation, and saved-sector compatibility for the new representation.
- Update GM visibility controls and player preview filtering/content rules throughout the map, system views, object inspector, and other entity displays.
- Replace rank-based name and portrait disclosure checks with rules based on the new information state where applicable.
- Update fixtures, tests, and current documentation that rely on the old four-level enum.
- Keep `InfoboxSummary` disabled; it is not part of this rework.

## Acceptance criteria

1. Each information field defaults to `-` and is editable by the GM.
2. Detailed and Politics information can be enabled independently, subject to Basic Scan.
3. Deep Politics requires Politics Scan.
4. Player preview reveals only sections enabled for that entity; GM preview can inspect and edit every section.
5. Visibility symbols accurately reflect the information state, use the specified eye/beaker/flag/X components, and are generated from the new assets.
6. GM mode has a GM information tab; player mode reserves a matching blank area of equal dimensions.
7. No player view exposes information for an invisible entity or a disabled scan section.
