# Celestial portrait review queue

Open /randomroll/swn_sector/portrait_review/ on the local Vite server (npm run dev). This is an asset-production page, not part of the player UI.

The source PNGs are kept under public/swn_sector/portraits/sources/. The queue starts with the original Mercurian, Europan/Plutonic water, and Europan/Plutonic ice sources, then continues through the additional planet types, all nine star types, and asteroid belts, Kuiper belts, and gas clouds. Each category has three sources, for 66 sources total. Independent stations, POIs, routes, and other manmade objects are out of this batch.

Only one source appears at a time. Its base image and color A/B previews are shown at the application's 300 × 170 size. A and B each have hue, saturation, and value controls. CSS hue-rotate, saturate, and brightness approximate HSV for the preview. The flipped variant is generated downstream and has no separate preview or controls here.

Accept records the current source and its A/B HSV values, then advances. Skip marks it skipped and advances without including it in the total manifest; skipping a previously accepted source removes it. Back moves to the previous source without changing its decision. Decisions, dial values, and queue position persist in browser localStorage. You can revisit any source by looping or going back, then change its decision or settings.

Get Total Manifest reveals JSON containing only a mapping from accepted source paths to two HSV triplets. Copy JSON and Download JSON are available there. The manifest contains no CSS blocks or derived-variant entries; later pipeline code can generate base, flip, A, A flip, B, and B flip from each accepted source.

The current app still reads the earlier expanded per-category manifests under src/generators/swn_sector/portrait_review/manifests/. The queue's compact total manifest is the output for the next pipeline step and does not overwrite those files automatically.
