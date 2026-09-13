import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assignGoldilocksSlots, generateSectorV4, isV4SystemValid } from "../generators/swn_sector/sector_v4";

const ARTIFACT_PATH = resolve("/tmp/randomroll-swn-sector-v4.json");
const ARTIFACT_SEED = "swn-sector-v4-artifact";

describe("SWN sector V4", () => {
  it("assigns ordered Goldilocks slots from thermal orbit, with input order breaking ties", () => {
    expect([...assignGoldilocksSlots([{ id: "hot", thermalOrbit: "Hot" }], 1)]).toEqual([["hot", 1]]);
    expect([...assignGoldilocksSlots([{ id: "cold", thermalOrbit: "Cold" }], 2)]).toEqual([["cold", 2]]);
    expect([...assignGoldilocksSlots([
      { id: "glacial", thermalOrbit: "Cold" },
      { id: "volcanic", thermalOrbit: "Too Hot" },
    ], 2)]).toEqual([["glacial", 2]]);
    expect([...assignGoldilocksSlots([
      { id: "glacial", thermalOrbit: "Cold" },
      { id: "arid", thermalOrbit: "Hot" },
    ], 3)]).toEqual([["arid", 1], ["glacial", 3]]);
  });

  it("generates and writes a valid deterministic location and POI artifact", () => {
    const sector = generateSectorV4(ARTIFACT_SEED);
    expect(generateSectorV4(ARTIFACT_SEED)).toEqual(sector);

    mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
    writeFileSync(ARTIFACT_PATH, `${JSON.stringify(sector, null, 2)}\n`);

    expect(sector.version).toBe("v4");
    for (const system of sector.systems) {
      expect(isV4SystemValid(system)).toBe(true);
      expect(system.locations.filter(location => location.kind === "EgressIngressRegion")).toHaveLength(1);
      expect(system.locations.filter(location => location.kind === "ExtraWorld").length).toBeGreaterThanOrEqual(2);
      expect(system.locations.filter(location => location.kind === "ExtraWorld").length).toBeLessThanOrEqual(7);
      expect(system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooHot").length).toBeGreaterThanOrEqual(1);
      expect(system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooCold_1").length).toBeGreaterThanOrEqual(1);
      expect(system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "TooCold_3").length).toBeLessThanOrEqual(1);
      expect(system.locations.filter(location => location.kind === "ParentGasGiant" && system.locations.some(child =>
        child.parentLocationId === location.id && child.kind === "PrimaryPlanet")).every(location => location.pointIds.length === 0)).toBe(true);
      expect(system.locations.filter(location => location.kind === "ExtraWorld" && location.orbitalPositionCategory === "Goldilocks").every(location =>
        location.habitableSlot !== undefined)).toBe(true);
      for (const location of system.locations) {
        expect(location.au).toBeGreaterThanOrEqual(0);
        expect(location.orbitalOrder).toBeGreaterThan(0);
      }
      for (const category of ["TooHot", "Goldilocks", "TooCold_1", "IngressEgress", "TooCold_3"] as const) {
        const locations = system.locations.filter(location => location.orbitalPositionCategory === category);
        expect(locations.map(location => location.orbitalOrder)).toEqual(locations.map((_, index) => index + 1));
      }
      expect(system.pointsOfInterest.filter(point => point.kind === "Ingress Point")).toHaveLength(1);
      expect(system.pointsOfInterest.filter(point => point.kind === "Egress Point")).toHaveLength(1);
      const locationIds = new Set(system.locations.map(location => location.id));
      expect(system.pointsOfInterest.every(point => locationIds.has(point.locationId))).toBe(true);
      expect(system.locations.filter(location => location.kind === "IndependentOrbit").every(location =>
        ["TooHot", "TooCold_1", "TooCold_3"].includes(location.orbitalPositionCategory))).toBe(true);
      const worldsById = new Map(system.worlds.map(world => [world.id, world]));
      for (const location of system.locations.filter(location => location.kind === "PrimaryPlanet")) {
        const world = worldsById.get(location.worldId!);
        const thermalOrbits = world?.attributes.temperature.thermalOrbits;
        expect(thermalOrbits).toHaveLength(1);
        expect(location.orbitalPositionCategory).toBe(
          thermalOrbits?.[0] === "Too Hot" ? "TooHot"
            : thermalOrbits?.[0] === "Too Cold" ? "TooCold_1"
              : "Goldilocks",
        );
        if (location.orbitalPositionCategory === "TooHot") expect(world?.planetDetails.tidallyLocked).toBe(true);
      }
    }
  }, 15_000);
});
