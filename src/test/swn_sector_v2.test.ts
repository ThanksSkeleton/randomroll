import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SECTOR_V1_GRID } from "../generators/swn_sector/sector_v1";
import { generateSectorV3, isV2WorldValid, isV3SystemValid } from "../generators/swn_sector/sector_v2";

const ARTIFACT_PATH = resolve("/tmp/randomroll-swn-sector-v3.json");
const ARTIFACT_SEED = "swn-sector-v3-artifact";

describe("SWN sector V3", () => {
  it("generates and writes a valid deterministic no-alien sector artifact", () => {
    const sector = generateSectorV3(ARTIFACT_SEED);
    const repeatedSector = generateSectorV3(ARTIFACT_SEED);

    mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify(sector, null, 2)}\n`);

    expect(repeatedSector).toEqual(sector);
    expect(sector.version).toBe("v3");
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
      expect(system.primaryStar.hab).toBeGreaterThanOrEqual(Math.max(
        ...system.worlds.map(world => world.calculatedHab),
      ));
      expect(system.primaryStar.habitableSlots).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(system.primaryStar.habitableSlots)).toBe(true);
      expect(system.primaryStar.habitableSlots).toBeGreaterThanOrEqual(system.worlds.length);
      expect(system.worlds.map(world => world.orbitSlot)).toEqual([2, 1, 3].slice(0, system.worlds.length));
      expect(isV3SystemValid(system)).toBe(true);

      for (const world of system.worlds) {
        expect(world.hasAliens).toBe(false);
        expect(world.tags[0].roll).not.toBe(world.tags[1].roll);
        expect(world.tags.map(tag => tag.tag)).not.toContain("Primitive Aliens");
        expect(world.tags.map(tag => tag.tag)).not.toContain("Xenophiles");
        expect(world.name).toMatch(/^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+_\d{3}$/);
        expect(Object.values(world.attributes).every(attribute =>
          attribute.roll >= 1
            && attribute.roll <= 100
            && attribute.result !== ""
            && attribute.alien !== true,
        )).toBe(true);
        expect(world.calculatedHab).toBe(Math.min(
          world.attributes.atmosphere.hab ?? -1,
          world.attributes.temperature.hab ?? -1,
          world.attributes.terran_biosphere.hab ?? -1,
          world.planetDetails.terrestrialSize.hab,
          ...(world.planetDetails.bulkComposition === undefined ? [] : [world.planetDetails.bulkComposition.hab]),
        ));
        expect(world.calculatedHab).toBeGreaterThanOrEqual(Math.max(
          world.attributes.population.habRequired ?? -1,
          world.attributes.tech_level.habRequired ?? -1,
          world.attributes.terran_biosphere.habRequired ?? -1,
        ));
        expect(world.planetDetails.terrestrialSize.roll).toBeGreaterThanOrEqual(1);
        expect(world.planetDetails.terrestrialSize.roll).toBeLessThanOrEqual(100);
        expect(["Luna", "Mars", "Earth", "Super-Earth"]).toContain(world.planetDetails.terrestrialSize.result);
        expect(world.planetDetails.terrestrialSize.hab).toBeGreaterThanOrEqual(1);
        expect(world.planetDetails.terrestrialSize.hab).toBeLessThanOrEqual(3);
        if (world.isPrimary) {
          expect(world.planetDetails.bulkComposition).toBeDefined();
        } else {
          expect(world.planetDetails.bulkComposition).toBeUndefined();
        }
        expect(isV2WorldValid(world)).toBe(true);
      }
    }
    expect(occupiedHexes.size).toBe(sector.starCount);
  }, 15_000);

  it("can generate worlds when ALIEN-dependent entries are enabled", () => {
    const sector = generateSectorV3("swn-sector-v3-aliens", { hasAliens: true });
    expect(sector.systems.flatMap(system => system.worlds).every(world =>
      world.hasAliens && isV2WorldValid(world),
    )).toBe(true);
  }, 15_000);
});
