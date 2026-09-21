import { expect, test } from "vitest";
import { generateInhabitedPlanet } from "./generate_inhabited_planet";
import { directOrbitTemperatures } from "./generation_rules";

function world(seed: string, forcedTags?: Parameters<typeof generateInhabitedPlanet>[0]["forcedTags"]) {
  return generateInhabitedPlanet({
    seed,
    entityPath: "system:01:inhabited:01",
    starType: "G-type",
    starHabitability: 3,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
    forcedTags,
  });
}

test("builds deterministic complete inhabited terrestrial planets", () => {
  expect(world("inhabited-deterministic")).toEqual(world("inhabited-deterministic"));
  const planet = world("inhabited-complete");
  expect(planet.Kind).toBe("Planet");
  expect(planet.InhabitedInfo).not.toBe(false);
  expect(planet.Size).not.toBe("Jupiter");
  expect(planet.Size).not.toBe("Neptune");
});

test("filters compact-remnant worlds to usable direct-orbit temperatures", () => {
  const planet = generateInhabitedPlanet({
    seed: "compact-remnant",
    entityPath: "system:01:inhabited:01",
    starType: "White dwarf",
    starHabitability: 0,
    orbit: { AU: 1, AngleDegrees: 0, ParentObjectId: null },
  });
  expect(directOrbitTemperatures("White dwarf")).toContain(planet.Temperature);
  expect(planet.Temperature).not.toBe("Temperate");
  expect(planet.InhabitedInfo).not.toBe(false);
  expect(planet.InhabitedInfo === false ? undefined : planet.InhabitedInfo.TotalHab).toBe(0);
});

test("constructively enforces tag semantics", () => {
  const tomb = world("tomb-world", ["Tomb World", "Outpost World"]);
  const info = tomb.InhabitedInfo;
  expect(info).not.toBe(false);
  if (info === false) throw new Error("Expected inhabited information");
  expect(info.Population).toBe("Fewer than 500");
  expect(info.TechLevel).toMatch(/postech|Pretech/);

  const industrial = world("industry-world", ["Heavy Industry", "Major Spaceyard"]);
  if (industrial.InhabitedInfo === false) throw new Error("Expected inhabited information");
  expect(industrial.InhabitedInfo.TechLevel).not.toMatch(/Neolithic|Medieval|Early Industrial/);
});

test("rejects incompatible water requirements before construction", () => {
  expect(() => world("incompatible-water", ["Desert World", "Oceanic World"])).toThrow("No feasible forced tag pair");
});
