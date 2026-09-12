import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SECTOR_V1_GRID } from "../generators/swn_sector/sector_v1";
import { generateSectorV2, isV2WorldValid } from "../generators/swn_sector/sector_v2";

const ARTIFACT_PATH = resolve("/tmp/randomroll-swn-sector-v2.json");
const ARTIFACT_SEED = "swn-sector-v2-artifact";

describe("SWN sector V2", () => {
  it("generates and writes a valid deterministic no-alien sector artifact", () => {
    const sector = generateSectorV2(ARTIFACT_SEED);
    const repeatedSector = generateSectorV2(ARTIFACT_SEED);

    mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify(sector, null, 2)}\n`);

    expect(repeatedSector).toEqual(sector);
    expect(sector.version).toBe("v2");
    expect(sector.starCount).toBeGreaterThanOrEqual(21);
    expect(sector.starCount).toBeLessThanOrEqual(30);
    expect(sector.systems).toHaveLength(sector.starCount);

    const occupiedHexes = new Set<string>();
    for (const system of sector.systems) {
      expect(system.hex.column).toBeGreaterThanOrEqual(1);
      expect(system.hex.column).toBeLessThanOrEqual(SECTOR_V1_GRID.columns);
      expect(system.hex.row).toBeGreaterThanOrEqual(1);
      expect(system.hex.row).toBeLessThanOrEqual(SECTOR_V1_GRID.rows);
      occupiedHexes.add(`${system.hex.column}:${system.hex.row}`);

      expect(system.worlds.length).toBeGreaterThanOrEqual(1);
      expect(system.worlds.length).toBeLessThanOrEqual(3);
      expect(system.worlds.filter(world => world.isPrimary)).toHaveLength(1);

      for (const world of system.worlds) {
        expect(world.hasAliens).toBe(false);
        expect(world.tags[0].roll).not.toBe(world.tags[1].roll);
        expect(world.tags.map(tag => tag.tag)).not.toContain("Primitive Aliens");
        expect(world.tags.map(tag => tag.tag)).not.toContain("Xenophiles");
        expect(world.name).toMatch(/^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+_\d{3}$/);
        expect(Object.values(world.attributes).every(attribute =>
          attribute.roll >= 2 && attribute.roll <= 12 && attribute.result !== "" && attribute.alien !== true,
        )).toBe(true);
        expect(world.calculatedHab).toBe(Math.min(
          world.attributes.atmosphere.hab,
          world.attributes.temperature.hab,
          world.attributes.biosphere.hab,
        ));
        expect(world.calculatedHab).toBeGreaterThanOrEqual(Math.max(
          world.attributes.population.hab,
          world.attributes.tech_level.hab,
        ));
        expect(isV2WorldValid(world)).toBe(true);
      }
    }
    expect(occupiedHexes.size).toBe(sector.starCount);
  });

  it("can generate worlds when ALIEN-dependent entries are enabled", () => {
    const sector = generateSectorV2("swn-sector-v2-aliens", { hasAliens: true });
    expect(sector.systems.flatMap(system => system.worlds).every(world =>
      world.hasAliens && isV2WorldValid(world),
    )).toBe(true);
  });
});
