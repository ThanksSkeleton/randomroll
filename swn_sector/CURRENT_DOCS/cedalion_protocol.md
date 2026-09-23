# Cedalion Protocol

A collaborative procedure for refining an already-built UI. It replaces repeated
rounds of "make it bigger — no, smaller — no, try 19" with a temporary panel of
direct controls, so the human searches the design space by eye instead of by
description.

The division of labor: the agent identifies which implementation properties
correspond to a complaint and builds a live control surface for them. The human
picks values by looking at the result. The agent then bakes the chosen values in
and removes the scaffolding.

This procedure applies to any component-based visual UI, not only HTML/CSS — for
example, a Godot scene's Control node theme overrides, StyleBoxFlat properties,
anchors/margins, or exported variables map onto this exactly the same way font
sizes and CSS variables do.

## Invocation

This procedure is **named and manually invoked** — it does not run silently, and
it is not triggered by keyword-matching a stray comment. Enter it only when:

- the human explicitly asks for it ("let's do Cedalion," "switch to the tuning
  protocol," "Cedalion but colors only," "Cedalion on the Godot UI"), or
- the agent proposes entering it and the human agrees.

A scoped invocation ("Cedalion but only colors") narrows *what* gets exposed —
skip building controls for anything outside the named scope — without changing
any other part of the mechanism below.

Before invocation, and for anything structural, conceptual, or open-ended even
mid-session (information architecture, navigation, new goals, general aesthetic
direction, tone of copy, wholesale layout changes), use ordinary conversational
iteration instead. If a request turns out to be structural after Cedalion is
already running, say so and drop back to ordinary iteration rather than forcing
it into a control.

State the mode change out loud in both directions: announce entering the
protocol by name, and announce when tooling is being cleaned up at the end. The
name is a coordination device — it's what lets a scoped shorthand like "Cedalion
but colors only" mean something without re-explaining the whole workflow.

## Session state

Once entered, maintain **one persistent tuning artifact** (panel, overlay, or
equivalent) for the entire session. Add or revise controls within that same
container as new feedback arrives — never spin up a second, separate panel for
a new piece of feedback while the first is still active.

The live artifact is the source of truth for current dial values, not the chat
history. If several rounds of feedback have occurred, the current state should
be readable directly off the artifact, not reconstructed from memory of the
conversation.

## Classifying feedback (intentionally loose)

These are heuristics governing how much initiative the agent takes before
asking, not a precise taxonomy. Rough agreement between agent and human is
enough — a misjudged category is cheap to correct and not worth deliberating
over.

**Expose immediately** — add a control without asking, for anything that maps
to a primitive or bounded numeric/color value: font size, weight, line height,
letter spacing, margin, padding, gap, width, height, offset, position, color,
opacity, border width, radius, shadow magnitude, animation timing — or, in
Godot terms, a Label's font size, a StyleBoxFlat's corner radius or border
width, a Control's anchor/margin values, a modulate color.

**Propose first** — briefly suggest a tuning interface and wait for acceptance
when building the alternatives takes real interpretation: font families,
alternate effects or styles, optional/toggleable elements, component variants,
alternate images or icon sets, palette/theme swaps, a small set of prepared
layout variants. If rejected, return to ordinary iteration for that item.

**Not tuneable, use ordinary iteration** — anything open-ended or structural:
information hierarchy, navigation model, content strategy, major layout
reconstruction, general aesthetic direction, prose tone.

Don't debate the boundary. Pick a plausible category and move; an unnecessary
proposal just gets rejected, and an unnecessary automatic control gets ignored
or removed later.

## Building the panel

For each new piece of feedback:

1. Identify the affected element(s) and the implementation properties most
   likely responsible.
2. Add a small, coherent set of controls to the shared panel covering the
   complaint. Group coupled properties together when adjusting them
   independently would be misleading.
3. Give each control a plain-language label tied to the visible result. Keep
   the exact property, selector, or token name attached to it internally, for
   the export step.
4. Pick a control type suited to the value: slider or numeric input for
   ranges, color picker for colors, toggle for booleans/presence, radio
   buttons or a labeled dropdown for a bounded set of variants. Use plain
   text labels for variants, not thumbnails or other image-based previews.
5. Apply changes live — no rebuild, no additional agent turn required to see
   the effect of a dial move.

Set numeric ranges wider than instinct says is "sensible" — deliberately
overshoot. Underscoped bounds are the most common failure in practice: the
human hits the end of a slider and now there's a whole extra round trip just
to ask for a wider range. A dial that goes further than anyone would
reasonably use costs nothing; a dial that can't reach the value someone
actually wants costs an iteration. Always pair every numeric slider with an
exact-value typed input, not only when it seems warranted — precise entry is
never conditional on whether the agent judged it necessary.

The human's visual judgment is already the deciding authority here; there's no
correctness or product-quality risk in giving them more range than they need,
only in giving them less.

Preserve the pre-tuning values so Reset has something to return to.

**Hard constraints on the panel itself:**

- Exactly one shared, always-visible, read-only JSON text box shows the
  complete current state of every control in the session. There is no
  "export" or "copy settings" button — the text updates the instant any dial
  moves. No per-component, per-group, or per-round text boxes.
- The human copies that text manually and pastes it back into the
  conversation. Do not build file downloads, URLs, API calls, or any other
  export mechanism — copy-paste through the visible text box is the only
  channel.
- Do not use multimodal/screenshot-based visual inspection to evaluate the UI
  during this protocol unless the human specifically asks for it. The human's
  eyes are the judgment mechanism here, not the agent's.
- Provide a Reset action that restores pre-tuning values.
- Keep the panel visually and structurally distinct from the product UI, and
  clearly marked as temporary development tooling.

Don't expose the whole stylesheet or theme, and don't build a general-purpose
visual editor — only what's needed to resolve the reported complaint.

## Code-quality tradeoffs while tuning

Treat the implementation as agent-maintained, not something the human will
read or edit directly. Prioritize rapid visual convergence, reliable
reproduction of the chosen result, and easy removal of tooling over source
elegance.

**Acceptable during this process:** duplicated styles, inelegant selectors or
node structures, extra wrapper elements, one-off local variables, imperfect
component abstraction.

**Never acceptable, at any point:** broken responsive/adaptive layouts,
inaccessible contrast or keyboard behavior, tuning controls that ship
accidentally, unused experimental variants left active, changes leaking into
unrelated components, a "baked" result that still secretly depends on runtime
tuning code, or a configuration that isn't deterministically reproducible from
the exported values.

## Baking accepted values

When the human pastes back a settings block, or says a given result is
correct:

1. Apply those values as the new permanent defaults in the implementation.
2. Prefer an existing design token, shared variable, or theme resource when
   the value has shared semantic scope; otherwise use a localized value.
3. Confirm the baked result matches the selected configuration and no longer
   depends on the tuning panel for that piece.
4. Leave unrelated, already-accepted styling untouched.

Baking a subset doesn't end the session — the panel can stay open with other
dials still live while accepted ones get folded in.

## Ending the session

The panel and JSON box come down only when the human explicitly says they're
done tuning — "looks good, ship it," "clean this up," or equivalent. That is
the sole exit condition; don't tear down tooling preemptively while dials are
still in play.

On exit:

1. Remove the panel, controls, event handlers, temporary state, dev-only
   styles, export/JSON logic, and any activation path for re-entering tuning.
2. Remove unused experimental alternatives, unless the human wants specific
   ones kept as intentional product variants.
3. Verify nothing at runtime still depends on the removed tuning code.
4. Re-check responsive/adaptive behavior, keyboard behavior, contrast, and any
   other states of the components that were touched.
5. Report the final baked values and confirm the tooling is fully removed.

The resulting source doesn't need to be exemplary human-maintained code — only
stable, reproducible from the exported values, and free of leftover
development controls.
