# Sector JSON to Obsidian vault

Convert a generated sector JSON file into a new folder of Markdown notes:

```sh
node --import tsx swn_sector/Obsidian/convert.ts obsidian_test/sector-one-seed.json obsidian_test/sector-one-seed-vault
```

Open the output folder as a vault in Obsidian. The converter refuses to replace an existing folder so that edits made in Obsidian are preserved. Conquest history is omitted from the notes; the source JSON remains unchanged.
