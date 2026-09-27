# SWN Sector Portrait Generation: Standalone Handoff

This document is for an image-generation operator who has no prior conversation or project context. Follow it as the complete brief for generating source portraits for the SWN (Stars Without Number) sector generator.

## 1. Project context

The project generates a fictional star sector containing stars, planets, routes, stations, and points of interest (POIs). Portrait images are small inspector illustrations shown when a player selects one of these generated objects. They are not maps, UI mockups, hero art, or full-screen scene illustrations.

The current art task is the structure-and-POI portrait batch: one bank for the `IndependentStation` system object and one bank for each of the ten POI categories listed below. The current working categories are `Asteroid base` and `Ancient orbital ruin`; each needs three final source images. The user asked for newly generated `01` and `02` images for these categories, replacing the earlier iterations. `03` is the latest image in each category and has been accepted as roughly on-style. All future generation must follow the same rules below.

## 2. Image-generation workflow rules

1. Generate every source image **from scratch**. Do not attach, edit, or reference prior generated images. Do not carry over their pose, silhouette, camera angle, layout, or composition. This applies to every iteration, including replacements and category variants.
2. Generate one image per requested source image. Do not make collages, contact sheets, grids, or multiple options inside one canvas.
3. Show each generated result to the user for review, and save the actual image file into the project. A chat preview by itself is not a delivered asset.
4. Use a landscape 30:17 aspect ratio. Final source files must be PNG, exactly 1500 × 850 pixels. Normalize/rescale the generated output if necessary while preserving the intended framing; reject portrait or square compositions rather than distorting them.
5. Use stable sequential filenames: `01.png`, `02.png`, `03.png` in the category directory. When replacing an iteration, replace that numbered file only after the new image is generated and inspected. Keep all source files in the project tree.
6. Generate exactly the number of assets requested in the current task. Each standard category ultimately needs three accepted source images; three images are not required in a single iteration unless requested.

## 3. Shared visual direction

Target **medium-hard science-fiction inflected design**: credible engineered structures, plausible supports and connections, visible material logic, practical lighting, and restrained details. Aim for cinematic documentary space photography, not concept-art fantasy.

- Prefer utilitarian, modular, space-rated construction: pressure modules, trusses, docking collars, radiator panels, antennas, cables, thermal blankets, seals, fasteners, and believable attachment points.
- Use natural sunlight, deep space shadow, and modest practical lights. Materials should read as metal, insulation, rock, ice, or glass as appropriate.
- Keep each image legible at 300 × 170 pixels. Give the category subject a strong silhouette and make it occupy a large portion of the frame unless the category explicitly calls for a distant/small object.
- Avoid ornate fantasy architecture, decorative spires, magical energy sources, impossible floating structures, unexplained glowing cores, excessive neon, and visual clutter.
- Do not include text, signs, readable labels, logos, or watermarks.
- Avoid unrelated planets, stars, structures, or spacecraft. A category may include the setting or activity specifically listed in its brief.
- For color-tuning compatibility, a predominantly restrained/desaturated image with one or a few distinct areas of color is useful. Keep color physically motivated (work lights, status lights, illuminated windows, atmospheric light); do not force neon or fantasy glow.

## 4. Composition and category briefs

### IndependentStation system object

Show a free-floating, human-made station against space. Keep it somewhat small in frame, unlike a close-up POI. Do not add nearby ships or other objects unless the user specifically requests them. No writing or signage.

### Ten POI categories

POI portraits use a close spacewalk viewpoint, as if a person outside the structure took the photograph. The POI itself should occupy a large fraction of the frame. POIs are human-relevant points of interest: some categories may show stations, ships, or human activity even when the object is not itself a human-built structure. Include such activity only when the category brief calls for it.

1. **Deep-space station** — Symmetric cylindrical station with spokes. Close framing; show credible modular construction and docking details.
2. **Asteroid base** — Embedded in an irregular airless asteroid, with docking ports and purpose-built space-rated extraction equipment. Name the equipment specifically: rock-anchored robotic drill heads or augers, braced articulated arms, sealed ore/sample hoppers, short enclosed conveyors or pneumatic transfer lines, and compact processing modules. Attach equipment to rock or structure and make it suitable for vacuum and microgravity. Never use generic “mining equipment” as the only description. Do not show terrestrial backhoes, bulldozers, dump trucks, wheels, vehicle cabins, or construction machinery parked on open-air cliffside terrain. The asteroid is a body in space, not an Earth-like landscape.
3. **Remote moon base** — Base on a nondescript lunar surface. Include visible solar panels and antennae; use plausible pressure modules and surface infrastructure.
4. **Ancient orbital ruin** — An obviously damaged orbital structure with an alien or exotic overall shape. Make the shape unusual through coherent engineering and proportions, not fantasy ornament. Show impact damage, exposed structure, broken modules, and age.
5. **Research base** — A complex of multiple structures on a nondescript lunar surface. Include landing pads and restrained exhaust stacks/pipes where appropriate; show plausible support buildings and connections.
6. **Asteroid belt POI** — Show one to three small mining ships interacting with asteroids. Ships and asteroids are both allowed; keep the activity legible and the POI focus clear.
7. **Comet base** — Embedded in a comet, with docking ports and purpose-built extraction equipment adapted to volatile ice and dust: anchored robotic drill/sampling heads, sealed collection hoppers, insulated transfer lines, and compact processing modules. No generic terrestrial construction vehicles or wheels.
8. **Comet belt POI** — Show one to three small mining ships interacting with comets. Keep ships small relative to the cometary environment and make the activity clear.
9. **Gas Mine** — A blocky, diamond-shaped human-made structure floating in a green glass-like cloud. Make it visibly engineered and readable against the cloud. The setting may remain ambiguous between a gas cloud and gas giant, as required by the category.
10. **Refueling station** — A free-floating cube-shaped station with cylindrical docking-port protrusions and very large gas tanks. Show credible connections between tanks and the station. No nearby ships unless specifically requested.

## 5. Current output locations and status

Project root: `/home/chris/projects/randomroll`

Source directory root: `public/swn_sector/portraits/sources/`

Use these category directories and filenames:

| Category | Directory |
| --- | --- |
| IndependentStation | `independent-station/` |
| Deep-space station | `deep-space-station/` |
| Asteroid base | `asteroid-base/` |
| Remote moon base | `remote-moon-base/` |
| Ancient orbital ruin | `ancient-orbital-ruin/` |
| Research base | `research-base/` |
| Asteroid belt POI | `asteroid-belt-poi/` |
| Comet base | `comet-base/` |
| Comet belt POI | `comet-belt-poi/` |
| Gas Mine | `gas-mine/` |
| Refueling station | `refueling-station/` |

Each directory uses `01.png`, `02.png`, and `03.png`. Note the separate category names `asteroid-belt/` and `asteroid-belt-poi/`: the former is a celestial-object portrait of a dense asteroid field; the latter is a POI with mining ships interacting with asteroids.

The project already contains earlier Asteroid Base and Ancient Orbital Ruin iterations at:

- `public/swn_sector/portraits/sources/asteroid-base/01.png` through `03.png`
- `public/swn_sector/portraits/sources/ancient-orbital-ruin/01.png` through `03.png`

The user wants fresh-from-scratch replacements for `01.png` and `02.png` in both categories. `03.png` is the current on-style reference for quality only; do not feed it to the image model or copy its composition. Preserve the project's 03 files unless the user later asks to replace them. Create any other category directory when that category's source generation begins.

## 6. Downstream review and use

The project has a local review page at `swn_sector/portrait_review/`. It is an asset-production tool, not part of the player-facing application. The page displays sources at 300 × 170 and is designed to review one source at a time. The current celestial queue may not yet include the structure/POI batch; adding the new sources to the queue is a separate project change and should not be assumed complete simply because files were saved.

The eventual target is three accepted source images per category. Each accepted source produces six runtime variants: original, horizontal flip, color A, color A plus flip, color B, and color B plus flip. Color A and B are tuned in the review page using hue, saturation, and value settings. Do not create flipped or color-adjusted copies during image generation; save only the clean base sources.

The game assigns portrait assets deterministically to generated objects and preserves assignments when sectors are saved or edited. The image-generation operator does not need to implement application code, edit manifests, or assign portraits unless separately requested.

## 7. Final delivery checklist

- Generated images were made independently from scratch without prior images as references.
- Each requested image is a single horizontal 30:17 portrait with a distinct composition from its sibling images.
- Subject/category details match the brief and read clearly at thumbnail size.
- No terrestrial construction vehicles appear in asteroid/comet bases; extraction equipment is explicitly space-rated and attached to the body/structure.
- Final PNG is exactly 1500 × 850.
- File is saved at the correct project path and numbered filename.
- The user has been shown the image for review, and delivery identifies the local file path.
