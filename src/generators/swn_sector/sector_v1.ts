import seedrandom from "seedrandom";
import rawWorldAttributes from "../../../swn_sector/world_attributes.json";
import rawWorldTags from "../../../swn_sector/world_tags.json";

export const SECTOR_V1_GRID = {
  columns: 8,
  rows: 10,
} as const;

export const WORLD_ATTRIBUTE_IDS = [
  "atmosphere",
  "temperature",
  "biosphere",
  "population",
  "tech_level",
] as const;

export type WorldAttributeId = typeof WORLD_ATTRIBUTE_IDS[number];

export type SectorHex = {
  column: number;
  row: number;
};

export type WorldTagReference = {
  roll: number;
  tag: string;
};

export type WorldAttributeResult = {
  roll: number;
  result: string;
};

export type InhabitedWorldV1 = {
  id: string;
  order: number;
  isPrimary: boolean;
  name: string;
  tags: readonly [WorldTagReference, WorldTagReference];
  attributes: Record<WorldAttributeId, WorldAttributeResult>;
};

export type StarSystemV1 = {
  id: string;
  hex: SectorHex;
  worlds: InhabitedWorldV1[];
};

export type SectorV1 = {
  version: "v1";
  seed: string;
  starCount: number;
  systems: StarSystemV1[];
};

type RawWorldTag = {
  roll: number;
  tag: string;
};

type RawWorldTags = {
  tags: RawWorldTag[];
};

type RawAttributeRow = {
  roll: number | string;
  result: string;
};

type RawAttributeTable = {
  id: WorldAttributeId;
  rows: RawAttributeRow[];
};

type RawWorldAttributes = {
  tables: RawAttributeTable[];
};

const worldTags = rawWorldTags as RawWorldTags;
const worldAttributes = rawWorldAttributes as RawWorldAttributes;

function rollDie(rng: seedrandom.PRNG, sides: number): number {
  return Math.floor(rng() * sides) + 1;
}

function pick<T>(rng: seedrandom.PRNG, values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error("Cannot choose from an empty table");
  }
  return values[Math.floor(rng() * values.length)];
}

function matchesRoll(rolled: number, sourceRoll: number | string): boolean {
  if (typeof sourceRoll === "number") {
    return rolled === sourceRoll;
  }

  const [start, end] = sourceRoll.split("-").map(Number);
  return Number.isInteger(start) && Number.isInteger(end)
    && rolled >= start
    && rolled <= end;
}

function resultForRoll(table: RawAttributeTable, rolled: number): string {
  const row = table.rows.find(candidate => matchesRoll(rolled, candidate.roll));
  if (row === undefined) {
    throw new Error(`No result for ${rolled} on ${table.id}`);
  }
  return row.result;
}

function attributeTable(id: WorldAttributeId): RawAttributeTable {
  const table = worldAttributes.tables.find(candidate => candidate.id === id);
  if (table === undefined) {
    throw new Error(`Missing ${id} attribute table`);
  }
  return table;
}

function tagToken(tag: string): string {
  const normalized = tag
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized === "" ? "Tag" : normalized;
}

function worldCountForSystem(rng: seedrandom.PRNG): number {
  const percentile = rollDie(rng, 100);
  if (percentile <= 85) {
    return 1;
  }
  if (percentile <= 95) {
    return 2;
  }
  return 3;
}

function rollDistinctTags(rng: seedrandom.PRNG): readonly [WorldTagReference, WorldTagReference] {
  const first = pick(rng, worldTags.tags);
  let second = pick(rng, worldTags.tags);
  while (second.roll === first.roll) {
    second = pick(rng, worldTags.tags);
  }
  return [
    { roll: first.roll, tag: first.tag },
    { roll: second.roll, tag: second.tag },
  ];
}

function rollAttributes(rng: seedrandom.PRNG): Record<WorldAttributeId, WorldAttributeResult> {
  return Object.fromEntries(WORLD_ATTRIBUTE_IDS.map((id) => {
    const roll = rollDie(rng, 6) + rollDie(rng, 6);
    return [id, { roll, result: resultForRoll(attributeTable(id), roll) }];
  })) as Record<WorldAttributeId, WorldAttributeResult>;
}

function buildWorld(
  rng: seedrandom.PRNG,
  systemId: string,
  order: number,
): InhabitedWorldV1 {
  const tags = rollDistinctTags(rng);
  const xyz = String(rollDie(rng, 1_000) - 1).padStart(3, "0");
  return {
    id: `${systemId}-world-${String(order).padStart(2, "0")}`,
    order,
    isPrimary: order === 1,
    name: `${tagToken(tags[0].tag)}_${tagToken(tags[1].tag)}_${xyz}`,
    tags,
    attributes: rollAttributes(rng),
  };
}

function randomEmptyHex(rng: seedrandom.PRNG, occupied: Set<string>): SectorHex {
  while (true) {
    const column = rollDie(rng, SECTOR_V1_GRID.columns);
    const row = rollDie(rng, SECTOR_V1_GRID.rows);
    const key = `${column}:${row}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      return { column, row };
    }
  }
}

/** Generates the simplified, fully automatic Sector Creation Flow V1. */
export function generateSectorV1(seed: string): SectorV1 {
  const rng = seedrandom(seed);
  const starCount = rollDie(rng, 10) + 20;
  const occupied = new Set<string>();
  const systems: StarSystemV1[] = Array.from(
    { length: starCount },
    (_, systemIndex) => ({
      id: `system-${String(systemIndex + 1).padStart(2, "0")}`,
      hex: randomEmptyHex(rng, occupied),
      worlds: [],
    }),
  );

  for (const system of systems) {
    const worldCount = worldCountForSystem(rng);
    system.worlds = Array.from(
      { length: worldCount },
      (_, worldIndex) => buildWorld(rng, system.id, worldIndex + 1),
    );
  }

  return {
    version: "v1",
    seed,
    starCount,
    systems,
  };
}
