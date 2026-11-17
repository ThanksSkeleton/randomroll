# Organize SWN sector use cases

> "Planning mode" only for all of the below. \
> \
> GOALS OF THIS CONVERSATION: A) To organize the thoughts below B) Compare with the current state of the project\
> NON-GOAL OF THIS CONVERSATION: Actually decide what to do, or actually do anything.\
> \
> Ok. My current concern with the swn sector subproject is that it has been so far driven by my own "That Would be Cool". That's an ok strategy for small projects with obvious bounds but this one is becoming way too big, and I want to wrap it up so it can actually be used. I have a lot of ideas floating around so I wrote them down here.\
> \
> Let's work through the actual use cases for the SWN Sector tool. \
> \
> P = Player Facing (Not Me)\
> G = GM Facing (Only Me)\
> \
> P1a. Pregame: Presentation of the player's homeworlds, so they can pick one to be from for a manually created character.\
> P1b. Pregame: Presentation of several premade/precooked characters from those homeworlds, so they can just pick one.\
> P2a. Play (Start): Sector map / Planetary map showing only explored systems - hard facts\
> P2b. Play (Start): Sector map / Planetary Map showing only explored systems \
> \- lore\
> P3a. Play (Later): Sector map / Planetary map as more systems are added and fleshed out - hard facts\
> P3b. Play (Later): Sector map / Planetary map as more systems are added and fleshed out - lore\
> \
> GM1. Pregame: Sector Selection - Mass rolling of starting sectors\
> GM1.5 Pregame: Sector Edits - Make edits to hard data (reroll specific fields)\
> GM2. Pregame: Sector Study reviewing and coming up with ideas \
> GM3a. Pregame: Coming up with candidate first adventures - hard facts\
> GM3b. Pregame: Coming up with candidate first adventures - lore\
> GM4. Pregame: Collateral Asset List (Mass rolled names, tables) \
> GM5. Pregame: Storing Game World Information - Lore\
> GM6. Play: Updates to In game world due to player actions\
> GM7. Play (Later): Redesign or modification of sector to better fit players' approach - hard facts\
> GM8. Play (Later): Realize Systems as the players encounter them\
> GM8. Play (Later): Edit Realized Systems outside the starting worlds. \
> \
> So those are all the possible scenarios that this tool could conceivably cover. However I want to 1) reduce scope for first release (MVP) 2) possibly reduce scope permanently. Many of these are not worth the squeeze so to speak.\
> \
> As an alternative, I could also start including other technologies, Obsidian in particular. See the following options below \
> \
> A) All within randomroll - editable boxes in app, persistance, player display\
> B) Randomroll/Obsidian Hybrid - interconnect the app with Obsidian's data (somehow). I do lore edits in obsidian and those appear in the app.\
> C) Cut the lore aspects of the randomroll table. But do an import of the hard data into Obsidian. Present lore to the players outside the app.\
> D) Cut the lore aspects of the randomroll table. Obsidian is totally separate. Randomroll is purely a reference and Obsidian is "manual".\
> \
> \*\*\*\*\
> \
> Some Ideas for The Player Selection Stuff -\
> \
> I want there to be a planet Image display for the inhab homeworlds. It would be neat to have an art pipeline where the hard data features of the planet are piped into generative AI to generate the planet. This shouldn't be a 'live' feature and probably should not be performed for every planet in the sector.\
> \
> P1a can be a strict subset of P1b.\
> \*\*\*\*
>
> Let's get started. Any questions about the scope of the conversation? Do a quick inspection of the current state of the swn sector subproject and summarize it

<details><summary>4 previous messages</summary>

> I’ll inspect the SWN sector code and project notes, then summarize what exists against your use cases and scope options. I’ll keep this to planning and read-only inspection.
>
> <details><summary>Explored 8 files, a search, 2 lists, ran 2 commands</summary>
>
> - Ran `pwd && rg --files -g 'AGENTS.md' -g '!node_modules' -g '!vendor' | head -80`
>
> - Ran `git status --short && rg --files -g '!node_modules' -g '!vendor' | head -100`
>
> <details><summary>Explored 8 files, a search, 2 lists</summary>
>
> - Listed files
> - Searched for `swn|sector|planet|world|obsidian`
> - Read `./swn_sector/CURRENT_DOCS/SECTOR_PLAN_V2.md`
> - Read `./README.md`
> - Read `./package.json`
> - Read `./swn_sector/index.html`
> - Listed files in `swn_sector`
> - Read `./src/generators/swn_sector/Application/prototypeApplication.ts`
> - Read `./src/generators/swn_sector/Application/sector_operations.ts`
> - Read `./src/generators/swn_sector/UI/application/appState.ts`
> - Read `./src/generators/swn_sector/UI/App.tsx`
>
> </details>
>
> </details>
>
> The project has a working generator and map interface, including GM and player projections. One important gap is already clear from the code: edits live in memory, so a curated sector does not survive a reload. I’ll check the remaining workflows before mapping your list to the implementation.
>
> <details><summary>Explored 15 files, 3 searches, a list, ran a command</summary>
>
> <details><summary>Explored 16 files, 3 searches, a list</summary>
>
> - Read `./src/generators/swn_sector/UI/App.tsx`
> - Read `./src/generators/swn_sector/UI/features/sector-editor/GMEditBar.tsx`
> - Read `./src/generators/swn_sector/Application/sector_edits.ts`
> - Read `./src/generators/swn_sector/Generator/generate.ts`
> - Read `./src/generators/swn_sector/Application/initialSectors.ts`
> - Read `./src/generators/swn_sector/UI/features/navigation/AppChrome.tsx`
> - Searched for `localstorage|indexeddb|persist|export|import|obsidian|character|premade|adventure|lore|notes|reroll|portrait|starting world|visibility` in `swn_sector`
> - Read `./src/generators/swn_sector/UI/features/navigation/AppChrome.tsx`
> - Read `./src/generators/swn_sector/UI/features/object-inspector/DetailBar.tsx`
> - Read `./src/generators/swn_sector/UI/features/culture/CultureScreen.tsx`
> - Read `./src/generators/swn_sector/Shared/culture_realization_tiers.ts`
> - Read `./src/generators/swn_sector/Generator/generation_defaults.ts`
> - Searched for `localstorage|indexeddb|persist|obsidian|download|export|import|character|premade|adventure|reroll` in `swn_sector`
> - Searched for `portrait|Portrait` in `portrait_projection.ts`
> - Listed files in `portraits`
> - Read `./src/generators/swn_sector/UI/features/object-inspector/DetailBar.tsx`
> - Read `./src/generators/swn_sector/Projector/sector_projection.ts`
> - Read `./src/generators/swn_sector/Projector/portrait_projection.ts`
> - Read `./src/generators/swn_sector/Application/initialSectors.ts`
> - Read `./swn_sector/CURRENT_DOCS/STEP_3_STARTING_WORLD_SPEC.md`
>
> </details>
>
> - Ran `rg -n 'localStorage|indexedDB|download|Blob\(|FileReader|fetch\(|Obsidian|obsidian|export' src/generators/swn_sector --glob '!*.test.*' --glob '!*.json' | cut -c1-180 | head -45; rg -n 'StartingWorldId|StartingWorldMode|Intelligence|SectorName' src/generators/swn_sector/BaseDTO/merged_schema.ts | head -55; git status --short`
>
> <details><summary>Explored 3 files</summary>
>
> - Read `./src/generators/swn_sector/Projector/sector_projection.ts`
> - Read `./src/generators/swn_sector/BaseDTO/merged_schema.ts`
> - Read `./swn_sector/CURRENT_DOCS/CANONICAL_PROJECTION_REFACTOR_ROADMAP.md`
>
> </details>
>
> </details>
</details>

No scope questions yet. I understand this as a planning conversation: organize the use cases, compare them with the project, and leave MVP and permanent scope decisions open.

The code currently supports **generating and inspecting one sector**. It builds systems, worlds, routes, politics, a starting world, and some cultural detail. The GM can inspect sector and system maps, edit names and text fields, change visibility, move the ship, and delete some objects. See [generation](./src/generators/swn_sector/Generator/generate.ts), [the app](./src/generators/swn_sector/UI/App.tsx), and [edit commands](./src/generators/swn_sector/Application/prototypeApplication.ts).

| Your use cases | Current state |
| --- | --- |
| **P1: Choose a homeworld or premade character** | No player selection flow or premade character flow. Inhabited worlds currently show a “NO DATA” image placeholder; the portrait bank serves other object types. |
| **P2–P3: Player maps, facts, and lore** | Sector and system maps, visibility flags, and a player presentation mode exist. The GM/player switch is currently **disabled in the UI**. The shared display data can contain GM information, so the player mode is not an independent player access boundary. |
| **GM1–GM2: Roll, select, edit, and study sectors** | Full-sector reroll and rich inspection exist. The app holds one sector at a time; there is no mass-roll comparison or sector selection flow. Hard-data editing is limited, with no selective field reroll. |
| **GM3–GM5: Adventure material, collateral, and lore** | A GM-only culture screen shows generated NPC/location names and adventure components. Entity text and GM notes are editable. There is no broader campaign lore workspace. |
| **GM6–GM8: Changes during play and later realization** | Visibility, ship location, and some objects can be changed. Cultural detail is generated for the starting area during sector generation; there is no later “realize this system” workflow. |

The largest practical gap across these uses is **persistence**: sector state is held in memory, and reloading regenerates from the URL seed rather than restoring edits. I found no Obsidian integration or sector import/export path. [Application state](./src/generators/swn_sector/Application/prototypeApplication.ts:39) and [the current architecture roadmap](./swn_sector/CURRENT_DOCS/CANONICAL_PROJECTION_REFACTOR_ROADMAP.md) both reflect that prototype status.

One useful planning distinction is that the [existing sector plan](./swn_sector/CURRENT_DOCS/SECTOR_PLAN_V2.md) describes persistence, player disclosure, and later editing as intended capabilities; it also explicitly excludes selective rerolls. Your new use cases are a chance to reassess that plan against what you need for a usable release. I made no changes.

> I have not actually used Obsidian before. Give me a brief overview of the obsidian data format

<details><summary>2 previous messages</summary>

> I’ll check Obsidian’s current documentation and give you a short overview focused on how its files would fit with Randomroll.
>
> <details><summary>Searched the web</summary>
>
> Searched the web for `site:help.obsidian.md vault markdown files attachments properties YAML frontmatter Obsidian ...`
>
> Searched the web for `Obsidian help how Obsidian stores data vault local folder markdown notes ...`
>
> </details>
</details>

Obsidian stores a **vault** as an ordinary folder on your computer. Notes are plain-text Markdown (`.md`) files; images and other attachments are separate files in that folder. Obsidian’s settings live in a `.obsidian` subfolder. There is no special database you have to import into. [Obsidian data storage](https://obsidian.md/help/data-storage), [attachments](https://obsidian.md/help/attachments)

A world note could look like this:

```md
---
world_id: world-123
tech_level: 4
tags:
  - frontier
  - mining
---

# Kestrel

Kestrel exports rare metals. Its governor distrusts [[The Meridian League]].

![[kestrel.png]]
```

The section between `---` lines is **YAML properties**: structured fields a tool could read. The rest is freeform prose. `[[The Meridian League]]` links to another note, and `![[kestrel.png]]` embeds an image. Obsidian also supports ordinary Markdown links if portability matters. [Properties](https://obsidian.md/help/properties), [internal links](https://obsidian.md/help/links)

For your sector question, the key point is that Randomroll could generate or read these files using normal file formats. The harder design question would be which fields Randomroll owns and which you edit in Obsidian; the file format itself is straightforward.

> ok. Let me put forth a milestone proposal plan:
>
> Milestone 0 - Cleanup\
> \- Remove/"null out" the remaining UI elements for editing\
> \- Implement and test "Global Realization"\
> \- Create player and GM sector view endpoints\
> Milestone 1 - MVP - Seeded External Obsidian for Lore- Zero Persistent Layer in App\
> \- Realize every system up front during generation\
> \- P1a, P1b - Endpoints \
> \-- No Homeworld Planet Display in app\
> \-- No Lore in app\
> \- P2a, P3a - Vision tag on homeworlds. Hardcoded which planets are visible, making new planets visible requires a code change and push\
> \- GM1, GM2, GM3a, GM4 in scope\
> \- Obsidian: one time, unidirectional App => Obsidian import of sector\
> \- Obsidian: Create Format - Hard Data, Player Facing Lore, GM Notes\
> Milestone 1.5 - Extra Features\
> \- Habitable World Image Generation Pipeline \
> \-- Additional Habitable world traits, mappings, for templated planet prompt for LLMs\
> \-- Combine Fixed Prompt with any Lore-Specific Specialization (manually mix)\
> \- Integrate Generated World with Player Picker, Sector Map\
> Milestone 2 - Bidirectional Obsidian - Speculative\
> \- Obsidian is GM Note Editor/Browser\
> \- Obsidian is GM Lore Editor\
> \- App is Player/GM Hard Data Display\
> \- App is Player Lore Display\
> Milestone 3+ - Unknown\
> \- Persistence? Maybe.

This is a much tighter shape for a first release. It gives Randomroll a bounded job: generate and display hard data, while Obsidian holds the writing. I’m treating the milestones as a proposal, not a decision.

| Milestone | What it would establish | Current gap |
| --- | --- | --- |
| **0 — Cleanup** | A display focused app, global realization, separate GM/player views | Editing controls remain. Culture is currently realized around the starting world and connected areas, rather than globally. |
| **1 — MVP** | Character and homeworld selection, hard-data maps, GM preparation tools, one-way Obsidian export | There is no character picker, mass sector comparison, Obsidian export, or durable visibility workflow yet. |
| **1.5 — Images** | A deliberate art pipeline for selected inhabited worlds | Inhabited worlds currently have an image placeholder. |
| **2 — Obsidian integration** | Obsidian-authored lore appears in the app | This would add synchronization and ownership rules absent from Milestone 1. |

A few boundaries need precise wording before this can become an implementation plan:

- **Milestone 0 and 1 overlap on realization.** “Implement and test global realization” could mean building the operation in 0, then making it the default generation path in 1.
- **“Endpoints” needs a definition.** The project is currently a Vite browser app. Separate pages, downloadable files, and HTTP APIs would have different implications.
- **A player endpoint needs a real data boundary.** The present player view is a presentation mode; its shared display object may contain GM data. Separate player delivery would need to account for that. [Architecture roadmap](./swn_sector/CURRENT_DOCS/CANONICAL_PROJECTION_REFACTOR_ROADMAP.md)
- **P1b is a distinct piece of work.** The existing culture data provides names and adventure components, but there is no premade character system. P1a can share its homeworld presentation, as you suggested.
- **“Vision tag on homeworlds” may be narrower than P2a/P3a.** Those cases also involve explored systems, routes, and possibly objects within systems. The proposal needs a definition of what a code change reveals.
- **The one-time Obsidian transfer needs a snapshot rule.** Once exported, edits in the vault would be independent of Randomroll until Milestone 2. That seems consistent with your proposal; it is useful to state explicitly.

The biggest scope question I see is whether **GM3a** means “show generated adventure ingredients” (partly present on the [culture screen](./src/generators/swn_sector/UI/features/culture/CultureScreen.tsx)) or “assemble candidate first adventures” (a new workflow). That distinction could materially change Milestone 1’s size.

> beyond additional work, is the plan inconsistent with what is currently in the app, or my initial message in this convo? Does anything not make any sense?

**No fatal contradiction.** The proposal makes sense as a scope reduction from your initial list. It postpones player lore, later system editing, and most campaign-state management. Milestone 1 resembles your option **C**: export hard data to Obsidian and present lore outside the app. Milestone 2 explores **B**.

There are three places where the wording currently implies more than the design provides:

1. **“Player endpoint” does not yet mean player-safe data.** The current player view only changes presentation; the shared display data can still contain GM information. A separately accessible player page would need its own data boundary. [Architecture roadmap](./swn_sector/CURRENT_DOCS/CANONICAL_PROJECTION_REFACTOR_ROADMAP.md)

2. **P3a says systems are “added and fleshed out” later, while Milestone 1 realizes all systems up front.** These fit together if P3a means *revealing already generated systems*. They conflict if it means generating or changing their hard facts during play.

3. **Seed plus code is the sector’s record under zero persistence.** If generation rules change after you export to Obsidian, the same seed may no longer reproduce the exported facts. The plan makes sense, but it needs a way to keep a campaign’s generated truth stable across code releases.

Two other points are scope choices, not inconsistencies. Removing editing UI deliberately drops **GM1.5** and much of **GM7–GM8**. And **P1b** can work without an app persistence layer if premade characters are supplied as fixed content, though the proposal has not said where those characters come from.

The only phrase I would clarify immediately is **“vision tag on homeworlds”**: P2a/P3a concern visible *systems and maps*, so planet visibility alone may not describe the intended reveal rule.

> ok. Take a look at the current swn_sector spec file, wherever it is, and compare it to the milesont plan
>
> Response annotation
>
> > “Player endpoint” does not yet mean player-safe data. The current player view only changes presentation; the shared display data can still contain GM information. A separately accessible player page would need its own data boundary. A
>
> User comment: Security in all its forms is going to be out of scope, this is a personal app used with friends, and seeing spoilers wrecks their own fun if they poke around.
>
> Response annotation
>
> > P3a says systems are “added and fleshed out” later, while Milestone 1 realizes all systems up front. These fit together if P3a means revealing already generated systems. They conflict if it means generating or changing their hard facts during play.
>
> User comment: P2a and P3a are collapsed into one if there is no realization distinction between explored and unexplored worlds, thats what I meant
>
> Response annotation
>
> > Seed plus code is the sector’s record under zero persistence. If generation rules change after you export to Obsidian, the same seed may no longer reproduce the exported facts. The plan makes sense, but it needs a way to keep a campaign’s generated truth stable across code releases.
>
> User comment: That's fine.
>
> Response annotation
>
> > The only phrase I would clarify immediately is “vision tag on homeworlds”: P2a/P3a concern visible systems and maps, so planet visibility alone may not describe the intended reveal rule.
>
> User comment: I mean the current sector visiblity rules - "homeworlds" and "home systems" are similar. Not trying to introduce a new concept.

<details><summary>2 previous messages</summary>

> I’ll locate the active sector plan and compare its commitments with your milestone proposal. I’ll use your clarifications: security is out of scope, P2a/P3a collapse when all systems are realized up front, seed drift is acceptable, and “vision” means the existing visibility rules.
>
> <details><summary>Explored 3 files, 2 searches, a list, ran 2 commands</summary>
>
> - Ran `git status --short && ls -lt swn_sector/CURRENT_DOCS | head -35`
>
> - Ran `rg -n 'supersedes|source of truth|current plan|active plan|MVP|milestone|out of scope' swn_sector/CURRENT_DOCS/*.md swn_sector/CURRENT_DOCS/*.txt | head -150`
>
> <details><summary>Explored 3 files, 2 searches, a list</summary>
>
> - Listed files in `swn_sector`
> - Searched for `(^|/)(spec|plan|goal|readme)|CURRENT_DOCS`
> - Read `./swn_sector/CURRENT_DOCS/VISIBILITY_REWORK_SPEC.md`
> - Read `./swn_sector/CURRENT_DOCS/DEFERRED_PART_5_DISCLOSURE_NAMES_ASSETS.md`
> - Read `./swn_sector/CURRENT_DOCS/SECTOR_PLAN_V2.md`
> - Searched for `realiz|known world|all worlds|selected|starting|adventure|asset|names|player|GM|edit|persist|export|visibility` in `Culture_Integration.md`
>
> </details>
>
> </details>
</details>

I found no single master `SPEC.md` for this subproject. The active roadmap is [SECTOR_PLAN_V2.md](./swn_sector/CURRENT_DOCS/SECTOR_PLAN_V2.md); it explicitly supersedes the older plan and points to detailed specs. Your milestone proposal would **replace parts of that roadmap**, rather than simply reorder it.

I’m using your clarifications throughout:

- :codex-annotation{index="1" id="42887006-c192-4dba-88ec-f369b5c498a7"} Security is out of scope. I’ll treat GM/player views as presentation for your group, not require a secure separation.
- :codex-annotation{index="2" id="bc9908eb-febd-413e-a646-b1b4b51d0c3a"} With every system realized up front, P2a and P3a become one hard-data viewing use case.
- :codex-annotation{index="3" id="aa968f86-70ce-40a7-b004-45c16bb7224c"} Seed results changing across code releases is an accepted tradeoff. See [Random Stability Is Not Required](../random-stablity-not-required.md).
- :codex-annotation{index="4" id="54691138-81cf-4cb3-8645-b8b86302ed87"} “Vision” refers to the existing visibility rules, not a new tag or mechanism.

| Topic | Current written plan | Milestone proposal |
| --- | --- | --- |
| **Persistence and editing** | Says generated results are persisted and manually edited; GM editing continues during play. | Removes editing UI and has no app persistence in MVP. **Direct change of direction.** |
| **Culture realization** | Leaves timing for detailed known worlds open. The later [culture integration spec](./swn_sector/CURRENT_DOCS/Culture_Integration.md) calls for completion of initially known worlds and later completion of others. | Realizes every system up front. **Direct change to that detailed spec.** |
| **Export** | Defers export until after culture and factions are considered. | Moves a one-time Obsidian transfer into MVP. **Changes sequence and purpose.** |
| **Player selection** | Selects one *campaign starting world* and puts the ship there. | Adds a choice of *character homeworlds* and premade characters. **New, compatible concept**, provided those two kinds of “starting world” stay distinct. |
| **Factions** | Gives factions an entire future design phase. | No faction milestone. **Dropped or deferred**, rather than contradicted. |
| **Images** | Intentionally uses placeholders for inhabited worlds. | Keeps that for MVP, then explores generated inhabited-world images in 1.5. **Compatible staging.** |

The plan already excludes **selective rerolls**, so omitting GM1.5 fits it. Its initial visibility rules also fit your use of the existing mechanism. What the old roadmap does *not* cover is mass sector comparison, premade characters, or Obsidian; those are additions to specify, not inconsistencies.

The most consequential rewrite is the plan’s central workflow: it currently describes **generate → curate in Randomroll → persist → edit and reveal during play**. Your proposal describes **generate and realize → transfer a snapshot to Obsidian → use Randomroll for hard-data display**, with later Obsidian integration only speculative. That is coherent, but the current roadmap would misstate the intended MVP until it is revised. I made no changes.

> clarifications. Ok. Move all the current docs into Archive, and create a mega_spec.md that summarizes the milestones (summary only). We will then start on the Milestone 0 spec
>
> Response annotation
>
> > Adds a choice of character homeworlds and premade characters. New, compatible concept, provided those two kinds of “starting world” stay distinct.
>
> User comment: The intent here is that what I think are called "secondary worlds" (one jump away) can be selected as a PC homeworld
>
> Response annotation
>
> > No faction milestone. Dropped or deferred, rather than contradicted.
>
> User comment: Yes. Whatever is done with factions it can fit into Milestone 2+

<details><summary>7 previous messages</summary>

> I’ll move the contents of `swn_sector/CURRENT_DOCS` into the existing `swn_sector/ARCHIVE`, then add `swn_sector/mega_spec.md` as a short milestone summary. I’ll include your clarifications about one-jump PC homeworlds and factions in Milestone 2 or later.
>
> <details><summary>Explored a search, 4 lists, ran 2 commands</summary>
>
> <details><summary>Explored 2 lists</summary>
>
> - Listed files in `CURRENT_DOCS`
> - Listed files in `ARCHIVE`
>
> </details>
>
> - Ran `git status --short && find swn_sector -maxdepth 2 -type d -printf '%p\n' | sort`
>
> - Ran `rg --files -g 'AGENTS.md' -g '!node_modules' -g '!vendor' /home/chris/projects/randomroll /home/chris/projects 2>/dev/null | head -70`
>
> <details><summary>Explored a search, 2 lists</summary>
>
> - Searched for `CURRENT_DOCS|SECTOR_PLAN_V2\.md|Culture_Integration\.md|STEP_3_STARTING_WORLD_SPEC\.md` in `.`
> - Listed files in `CURRENT_DOCS`
> - Listed files in `CURRENT_DOCS`
>
> </details>
>
> </details>
>
> `SECTOR_PLAN_V2.md` is the current roadmap, and there are no filename collisions with the existing archive. I’m moving the whole `CURRENT_DOCS` set as historical material and making the new file the only active milestone summary.
>
> <details><summary>Created a file, explored a file, a search, ran 3 commands</summary>
>
> - Ran `mv swn_sector/CURRENT_DOCS/* swn_sector/ARCHIVE/ && rmdir swn_sector/CURRENT_DOCS`
>
> - Wrote `./swn_sector/mega_spec.md` (+32 -0)
>
> - Ran `test ! -e swn_sector/CURRENT_DOCS && find swn_sector/ARCHIVE -maxdepth 1 -type f | wc -l && git status --short | head -90`
>
> <details><summary>Explored a file, a search</summary>
>
> - Read `./swn_sector/mega_spec.md`
> - Searched for `CURRENT_DOCS` in `.`
>
> </details>
>
> - Ran `ls -l swn_sector/*REPORT* swn_sector/ARCHIVE/*REPORT* 2>/dev/null || true; git diff --stat; git status --short | tail -8`
>
> </details>
>
> put the new specs into CURRENT_DOCS
>
> I’ll place `mega_spec.md` in a fresh `CURRENT_DOCS` directory, leaving the previous documents in `ARCHIVE`.
>
> <details><summary>Edited a file, ran 5 commands</summary>
>
> - Ran `mkdir -p swn_sector/CURRENT_DOCS && mv swn_sector/mega_spec.md swn_sector/CURRENT_DOCS/mega_spec.md`
> - Wrote `./swn_sector/CURRENT_DOCS/mega_spec.md` (+1 -1)
> - Ran `for file_path in swn_sector/CURRENT_DOCS/*; do test "$file_path" = swn_sector/CURRENT_DOCS/mega_spec.md || exit 1; done; git show HEAD:swn_sector/CURRENT_DOCS/SECTOR_PLAN_V2.md | cmp - swn_sector/ARCHIVE/SECTOR_PLAN_V2.md && git show HEAD:swn_sector/INHABITED_WORLDS_STATISTICS.html | cmp - swn_sector/ARCHIVE/INHABITED_WORLDS_STATISTICS.html && git show HEAD:swn_sector/VISIBILITY_LEVELS_REPORT.html | cmp - swn_sector/ARCHIVE/VISIBILITY_LEVELS_REPORT.html`
> - Ran `test -f swn_sector/CURRENT_DOCS/mega_spec.md && test ! -e swn_sector/mega_spec.md && find swn_sector/CURRENT_DOCS -maxdepth 1 -type f -printf '%f\n' && rg -n 'ARCHIVE|Milestone|one jump|faction' swn_sector/CURRENT_DOCS/mega_spec.md`
> - Ran `git status --short | awk '{print $1}' | sort | uniq -c && git status --short | tail -5`
> - Ran `git diff --name-only --diff-filter=D -- swn_sector | while IFS= read -r original_path; do archived_path="swn_sector/ARCHIVE/${original_path##*/}"; if ! git show "HEAD:$original_path" | cmp -s - "$archived_path"; then printf 'Mismatch: %s\n' "$original_path"; fi; done`
>
> </details>
</details>

The previous documents are in [ARCHIVE](./swn_sector/ARCHIVE), and the milestone summary is now [CURRENT_DOCS/mega_spec.md](./swn_sector/CURRENT_DOCS/mega_spec.md). The archived files match their original contents. No application code changed.

The summary includes one-jump inhabited worlds as PC homeworld options :codex-annotation{index="1" id="a7eb6d8d-e422-4c21-9b37-c540938a5f79"} and places any faction work in Milestone 2 or later :codex-annotation{index="2" id="63a5096d-6154-43a0-a3aa-467e584962bc"}. It stays at summary level; the detailed Milestone 0 spec is next.

> ok. Create Milestone_0.md spec

<details><summary>4 previous messages</summary>

> I’ll write `Milestone_0.md` in `CURRENT_DOCS`. I’ll check the current generation, editing, and page setup first so the spec names concrete changes and testable outcomes.
>
> <details><summary>Explored 7 files, a search</summary>
>
> - Read `./src/generators/swn_sector/Generator/culture.ts`
> - Read `./src/generators/swn_sector/Shared/culture_realization_tiers.ts`
> - Read `./src/generators/swn_sector/Generator/culture.test.ts`
> - Read `./swn_sector/CURRENT_DOCS/mega_spec.md`
> - Read `./vite.config.ts`
> - Read `./src/generators/swn_sector/UI/main.tsx`
> - Read `./swn_sector/index.html`
> - Searched for `edit|save|visibility|delete|moveShip|reroll|preview|isGmSession|role|culture|activeIndex|locked|GMEditBar|onReroll` in `App.tsx`
>
> </details>
>
> The current app is a static Vite page. Its edit controls are in the inspector and GM sidebar, while culture is completed only for selected nearby systems. I’ll specify Milestone 0 as two URL-addressable read views plus a tested global-realization operation; Milestone 1 can make that operation run during normal generation.
>
> <details><summary>Created a file, explored 4 files, a search, ran 2 commands</summary>
>
> <details><summary>Explored 3 files, a search</summary>
>
> - Read `./src/generators/swn_sector/UI/App.test.tsx`
> - Read `./src/generators/swn_sector/UI/visibility_presentation.test.tsx`
> - Searched for `checkAllInvariants|Culture|HPOI|HabitablePoints|StartingWorldId|Visibility` in `generated_sector_invariants.ts`
> - Read `./src/generators/swn_sector/Generator/generated_sector_invariants.ts`
>
> </details>
>
> - Ran `rg -n 'swn_sector' index.html src | head -40; git status --short | tail -8`
>
> - Wrote `./swn_sector/CURRENT_DOCS/Milestone_0.md` (+55 -0)
>
> <details><summary>Explored a file</summary>
>
> - Read `./swn_sector/CURRENT_DOCS/Milestone_0.md`
>
> </details>
>
> - Ran `test -f swn_sector/CURRENT_DOCS/mega_spec.md && test -f swn_sector/CURRENT_DOCS/Milestone_0.md && find swn_sector/CURRENT_DOCS -maxdepth 1 -type f -printf '%f\n' | sort && git status --short | tail -7`
>
> </details>
</details>

Created [Milestone_0.md](./swn_sector/CURRENT_DOCS/Milestone_0.md). It specifies editing UI cleanup, a deterministic global-realization operation, separate GM and player URLs, and acceptance checks.

The spec keeps global realization as an explicit operation in Milestone 0; Milestone 1 makes it the default during generation. This was a documentation-only change, so I did not run code tests.
