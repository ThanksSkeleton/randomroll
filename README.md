# RandomRoll

The project is RandomRoll: a small suite of related random-generation tools for hobbyist TTRPG use, built on a shared underlying framework.

The intended end products are:

DCC Character Sheet / Generator
Player-facing.
Produces a Dungeon Crawl Classics-style character sheet.
Supports custom professions.
Supports custom portraits.
Likely focused on fast character creation and table usability.
Masks NPC Generator
GM-facing.
Generates NPCs for Masks: A New Generation.
Output should be tabular, probably optimized for quick scanning during prep or play.
Current uploaded CSV tables appear especially relevant here: name tables, role/social class tables, appearance tables, and ambition tables.
Stars Without Number “Lite” Character Sheet / Generator
Player-facing.
Produces a simplified SWN-style character sheet.
Includes random generation.
Likely intended for fast solo or low-friction play rather than full character-build depth.

The shared foundation is the RandomRoll Framework. Its likely purpose is to provide reusable machinery for:

Defining random tables.
Rolling against CSV/table data.
Combining multiple table results into coherent outputs.
Supporting different “products” or “generators” from the same underlying system.
Keeping content modular so a table like APPEARANCE_The_First_Thing_Noticed.csv or AMBITION_Whats_the_Basic_Ambitions_Form.csv can be reused across tools.

The strongest current signal is that we are not merely making isolated random tables. We are building a framework-backed generator suite where individual tools share a common data and rendering architecture.

A compact project description would be:

RandomRoll is a modular TTRPG random-generation framework and tool suite. It will support player-facing character-sheet generators for DCC and Stars Without Number Lite, plus a GM-facing Masks NPC generator. The framework should ingest structured random tables, compose results into usable game artifacts, and render them in formats appropriate for play: character sheets, NPC tables, portraits, professions, roles, appearance traits, ambitions, and related narrative hooks.

The current uploaded files suggest the immediate working area is probably the Masks NPC generator, because the available data clusters around NPC-relevant categories: names, roles, appearance, ambition, obstacles, tools, and social involvement.