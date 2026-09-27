# Route portrait review queue

Open /randomroll/swn_sector/portrait_review/ on the local Vite server (npm run dev). This is an asset-production page, not part of the player UI.

The route source PNGs are kept under public/swn_sector/portraits/sources/Route/. This queue reviews only the three route portraits. Route portraits represent spike travel or a navigational connection, not either endpoint system.

Only one source appears at a time. Its base image and color A/B previews are shown at the application's 300 × 170 size. A and B each have hue, saturation, and value controls. CSS hue-rotate, saturate, and brightness approximate HSV for the preview. The flipped variant is generated downstream and has no separate preview or controls here.

Accept records the current source and its A/B HSV values, then advances. Skip marks it skipped and advances without including it in the total manifest; skipping a previously accepted source removes it. Back moves to the previous source without changing its decision. Decisions, dial values, and queue position persist in browser localStorage. You can revisit any source by looping or going back, then change its decision or settings.

Get Total Manifest reveals JSON containing only a mapping from accepted source paths to two HSV triplets. Copy JSON and Download JSON are available there. The manifest contains no CSS blocks or derived-variant entries; later pipeline code can generate base, flip, A, A flip, B, and B flip from each accepted source.

The queue's compact total manifest contains accepted route source paths and A/B HSV settings. It does not overwrite the other portrait variant files automatically.
