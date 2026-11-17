Create sector JSON export

Vault page naming and duplicate handling are tracked in [M1_Obsidian_Naming.md](M1_Obsidian_Naming.md).

## Sector JSON export steps

1. Create an API that returns a JSON sector for a given seed, using the default creation parameters.
2. Create an API that calls the seeded API with a random seed.
3. Create a Git-ignored `obsidian_test/` folder and put the JSON output in that folder.
4. Write the script that converts sector JSON into an Obsidian vault in TypeScript.

## High-level vault model

Processing the exported JSON into an Obsidian vault is a separate process.

- A sector organizes its systems, routes, and polities.
- A system organizes its planets and moons as peers, along with other system entities. Its star is part of the system, not a separate note.
- A moon links to its parent planet. This preserves the physical relationship without making the moon politically subordinate to that planet.
- A point of interest belongs beneath its host and also links to its system.
- A route links to both endpoint systems.
- A polity links to its homeworld and to every object where it has a claim.
- Culture summaries belong beneath their inhabited planets or moons.
- Conquest history is outside the current vault plan.
