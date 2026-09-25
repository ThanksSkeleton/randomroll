# Step 2 portraits: handoff

## Current state

- The local review jig is at `/randomroll/swn_sector/portrait_review/` when running `npm run dev`. It queues one source at a time across the 66-image batch. The original Mercurian, Europan water, and Europan ice sources come first, followed by the new categories. Accept, Skip, and Back wrap through the queue; position, decisions, and HSV drafts persist in browser localStorage.
- The original nine source PNGs remain at `public/swn_sector/portraits/sources/`. The expanded current review batch now contains 66 sources, all 1500 × 850: the original Mercurian and Europan ice/water sources plus the remaining seven planet categories, nine star types, and asteroid belt, Kuiper belt, and gas cloud. IndependentStation and all manmade objects are held for a later batch.
- **Get Total Manifest** exposes a compact JSON mapping of accepted source paths to A/B HSV triplets. Skipped sources are omitted. Download or copy that JSON when tuning is done; no compact total manifest is checked in yet.
- The jig previews base, A, and B at 300 × 170. Each accepted source will produce six variants downstream: base, flip, A, A flip, B, B flip. The flip has no separate tuning.

## Next pass

1. Review and tune the expanded source portrait batch in the jig. Keep stable asset paths and the 300:170 aspect ratio.
2. Save the **total** compact HSV manifest into the repository when review is done. LocalStorage is only a review draft; it does not travel with the code.
3. Add the downstream translation from each accepted source plus A/B HSV to six stable variant IDs and CSS styles. Only accepted sources should enter a bank. Decide and enforce the completed-bank minimum before replacing the current starter banks.
4. Switch app consumption from the three expanded starter manifests in `src/generators/swn_sector/portrait_review/manifests/` to the translated compact data. `src/generators/swn_sector/planet_portraits.ts` currently covers only Mercurian and Europan ice/water planets; remaining planet types and the other object kinds still need assignments and inspector integration.

The portrait spec describes the full target. The queue README at `swn_sector/portrait_review/README.md` describes the current review controls.
