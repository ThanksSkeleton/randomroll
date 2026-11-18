Create sector JSON export

Vault page naming and duplicate handling are tracked in [M1_Obsidian_Naming.md](M1_Obsidian_Naming.md).

## Sector JSON export steps

1. Create an API that returns a JSON sector for a given seed, using the default creation parameters.
2. Create an API that calls the seeded API with a random seed.
3. Create a Git-ignored `obsidian_test/` folder and put the JSON output in that folder.
4. Write the script that converts sector JSON into an Obsidian vault in TypeScript.

## High-level vault model

Processing the exported JSON into an Obsidian vault is a separate process.

- `SectorHub` and `UnseenSectorHub` are peer navigation pages. `SectorHub` lists visible WorldPolities; `UnseenSectorHub` lists unseen WorldPolities.
- Each WorldPolity page is the main place to edit its combined inhabited-world, polity, and culture information. It links to the objects that polity claims. A contested object may be linked from more than one WorldPolity.
- WorldInfo, system, route, and POI pages may be organized flexibly. Their links matter more than a strict folder hierarchy.
- A system page lists its planets, moons, and other entities. Its star is part of the system, not a separate page.
- A moon links to its parent planet without being nested beneath that planet.
- A point of interest links to its host and to its system.
- A route links to both endpoint systems.
- A WorldPolity links to its homeworld and to every object where it has a claim.
- Conquest history is outside the current vault plan.

## Desired vault pages

Generated page files and paths do not display GUIDs. The converter may use source IDs internally to resolve relationships, but it must fail on duplicate output paths rather than append IDs or overwrite a page. Names are unique within each generated entity type as described in the naming sub-spec; a WorldPolity and its WorldInfo may intentionally share a name.

### SectorHub and UnseenSectorHub

- `SectorHub` is the central navigation page. It lists visible WorldPolities and links to their pages for editing. It also lists visible systems.
- `UnseenSectorHub` is a peer page that lists unseen WorldPolities.
- The hubs are indexes, not the root of a required folder tree. LoreBuilder content belongs on each WorldPolity page rather than being duplicated on a hub.
- Hub membership follows the homeworld's current `Visibility.BasicScan`: a WorldPolity is visible exactly when its inhabited homeworld is player-visible. `SectorHub` lists systems whose own `BasicScan` is enabled. Claiming a visible world does not reveal a polity whose homeworld is unseen. Primary/Secondary/Tertiary culture realization tiers only describe generation coverage and must not determine hub membership. The converter takes a snapshot of these flags at export time.

### WorldPolity

Create one WorldPolity page for each inhabited world and its generated polity. This is the main page for that world's political and cultural material. Show:

- The actual polity flag graphic, cultural template, and readable tech-level and population descriptions.
- Both World Tags with their descriptions; outsider opinion; PC interest; and biggest conflict.
- Independence as **Independent**, **Claimed by** a linked WorldPolity, or **Contested by** linked WorldPolities, according to the homeworld's current claims.
- A link to its homeworld's WorldInfo page.
- Claimed inhabited worlds other than its homeworld, and contested inhabited worlds, linking to their WorldPolity pages.
- A homeworld city list with a named capital and two secondary cities.
- `capitalCity` and `secondaryCities` are generated from the homeworld's cultural place-name pool and are distinct from one another and the homeworld name. `majorStarport.name` is the starport's own name; it is generated independently and need not match the capital.
- Spaceport information and links to relevant Garrison POIs.
- Other claimed and contested objects, including uninhabited worlds, each identified by name, type, and system.
- A `LoreBuilderForWorldPolity` section containing the full expanded `details.culture-world` content from the culture tab, including its NPC/location bank, adventure components, security information, and habitable-POI readouts. This is a section of the WorldPolity page, not another page type.

### WorldInfo

Create a WorldInfo page for each planet or moon to hold the less prominent physical detail. Show a link to its system; for an inhabited world, link to its homeworld WorldPolity; and show its current sole claimant or contested claimants. Include the procedural name, orbit and orbital angle, size, composition, surface water, atmosphere, and readable native biosphere. Show a readable Terran biosphere when the world is inhabited. A moon also links to its parent planet without being nested under it.

### System, POI, and Route

- A system page is primarily a list of its objects. Keep the star's information on that page.
- A POI page links to its host and system. Garrison POIs are also reachable from the relevant WorldPolity.
- A route, previously called a Warp Gate in the proposed page list, links to both endpoint systems. Route portals are endpoint details rather than separate pages.
- Claimed-object entries on WorldPolity pages link to their corresponding object or system pages. The physical folder layout for these notes is not prescribed.

## Tasks for the next work conversation

1. Completed: culture realization tiers do not define player visibility. Partition WorldPolities by their homeworld's `Visibility.BasicScan`; list systems by their own `BasicScan`.
2. Completed: culture generation stores `capitalCity` and two `secondaryCities`; validation, culture display, and Obsidian conversion carry them through.
3. Completed: sector JSON stores generated culture facts, including the NPC/location bank. All random draws happen during generation. The converter derives readable ratings, World Tag descriptions, and effective habitable-POI details from existing rules and renders each polity flag as an SVG asset from stored colors.
