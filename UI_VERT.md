# Screen Space Reclaim — `swn_sector`

## Restatement

For the `swn_sector` usability pass, reclaim vertical space by making the sector wider and consolidating controls into a left sidebar.

The changes are:

- Change the sector layout to 12 columns × 6 rows.
- Move GM Edit controls into the left sidebar.
- Move Stage Navigation controls into the left sidebar.
- Move the Temperate Overlay control into the sidebar.
- Reduce the height of the top section.
- Remove the existing header Stage Navigation and GM Edit bars.
- Replace the current navigation/action controls with compact black-and-white symbolic icons.
- Preserve each control’s existing color behavior.
- Show a mouseover label when hovering over any interactive icon.
- Rename “Travel To” to “View System.”

## Sub-spec: Screen Space Reclaim — Symbolic Navigation Controls

### Objective

Create a compact, symbolic control system that reduces vertical UI consumption while retaining discoverability and existing interaction behavior.

### Layout

- Sector canvas: 12×6 grid, expressed as width × height.
- Left sidebar contains:
  - Stage Navigation controls
  - GM Edit controls
  - Temperate Overlay control
  - Any required divider/separator
- Existing header Stage Navigation and GM Edit bars are removed.
- Top section is reduced to the smallest practical height without clipping content or reducing usability.

### Icon set

All icons should be black-and-white, symbolic, visually consistent, and suitable for compact sidebar display.

| Control | Symbol |
|---|---|
| Select Ship | Rocket ship |
| View System | Eye |
| Sector View | Three connected hexes |
| System View | One larger hex |
| Symbolic View | Half-circle on the left; one small and one medium circle on the right |
| Map View | Center circle orbited by two circles |
| Temperate Overlay | Tree |
| Divider | Small horizontal line |
| GM Lock | Padlock |
| Move Ship | Rocket ship with a right-pointing arrow |
| Visibility: None | Eye with an X |
| Visibility: Basic | Eye with Roman numeral I |
| Visibility: Cultural Partial | Eye with Roman numeral II |
| Visibility: Cultural Full | Eye with Roman numeral III |
| Delete Target | Box with an X |

### Interaction and labeling

- Every interactive icon has a mouseover label.
- Tooltip labels use the current control names, including:
  - “View System” instead of “Travel To”
  - “Visibility: None”
  - “Visibility: Basic”
  - “Visibility: Cultural Partial”
  - “Visibility: Cultural Full”
  - “Delete Target”
- The divider is decorative/non-interactive and does not require a tooltip.
- Existing click behavior, enabled/disabled states, selection states, and visibility rules should be preserved.

### Color behavior

- Icons inherit the existing coloring rules of their corresponding fields and controls.
- Black-and-white refers to the base symbolic artwork; state-based coloring remains available where the current UI uses it.
- Hover, active, disabled, locked, and destructive states should continue to communicate the same meaning as they do currently.

### Acceptance criteria

- The sector visibly uses a 12×6 layout.
- No header Stage Navigation or GM Edit bars remain.
- Stage Navigation, GM Edit, and Temperate Overlay controls are accessible from the left sidebar.
- The top section occupies less vertical space than the current layout.
- All listed controls have corresponding symbolic icons.
- All interactive icons expose clear hover labels.
- Existing control behavior and color/state semantics remain intact.
- The new controls do not obscure or materially reduce the usable sector area.
