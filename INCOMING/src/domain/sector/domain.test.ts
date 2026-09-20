import { describe, expect, it } from "vitest";
import { createInitialSectors } from "../../data";
import { applySectorEdits, deleteSectorObject, relocatePlayerShip, updateObjectVisibility } from "./operations";
import { findDetails, findObject, resolveTravelDestination } from "./selectors";
import { validateSector } from "./validation";
import { VisibilityLevel } from "./model";

describe("sector domain", () => {
  it("updates visibility immutably and reports unknown objects explicitly", () => {
    const [sector] = createInitialSectors();
    const world = sector.Systems[1].Worlds[0];
    const result = updateObjectVisibility(sector, world.Id, VisibilityLevel.CULTURE_FULL);

    expect(result).toEqual({ ok: true, value: expect.anything() });
    if (!result.ok) throw new Error("expected visibility update to succeed");
    expect(findDetails(result.value, world.Id)?.VisibilityLevel).toBe(VisibilityLevel.CULTURE_FULL);
    expect(findDetails(sector, world.Id)?.VisibilityLevel).not.toBe(VisibilityLevel.CULTURE_FULL);
    expect(updateObjectVisibility(sector, "missing", VisibilityLevel.BASIC_SCAN)).toEqual({ ok: false, reason: "object-not-found" });
    expect(validateSector(result.value)).toEqual([]);
  });

  it("relocates the ship only to a system or world and preserves its source sector", () => {
    const [sector] = createInitialSectors();
    const world = sector.Systems[1].Worlds[0];
    const result = relocatePlayerShip(sector, world.Id);

    expect(result).toEqual({ ok: true, value: expect.anything() });
    if (!result.ok) throw new Error("expected ship relocation to succeed");
    expect(result.value.PlayerShip.CurrentSystemId).toBe(sector.Systems[1].Id);
    expect(result.value.PlayerShip.CurrentLocationId).toBe(world.Id);
    expect(sector.PlayerShip.CurrentSystemId).not.toBe(sector.Systems[1].Id);
    expect(relocatePlayerShip(sector, sector.PlayerShip.Id)).toEqual({ ok: false, reason: "move-prohibited" });
    expect(validateSector(result.value)).toEqual([]);
  });

  it("cascades deletion without mutating its input and returns a failure for prohibited deletion", () => {
    const [sector] = createInitialSectors();
    const system = sector.Systems.find((candidate) => candidate.Worlds.some((world) => world.MoonOf !== null))!;
    const world = system.Worlds.find((candidate) => candidate.MoonOf === null && system.Worlds.some((moon) => moon.MoonOf === candidate.Id))!;
    const result = deleteSectorObject(sector, world.Id);

    if (!result.ok) throw new Error("expected deletion to succeed");
    expect(findObject(result.value, world.Id)).toBeUndefined();
    expect(findObject(sector, world.Id)).toBeDefined();
    expect(deleteSectorObject(sector, sector.PlayerShip.Id)).toEqual({ ok: false, reason: "deletion-prohibited" });
    expect(validateSector(result.value)).toEqual([]);
  });

  it("applies edits and resolves route travel through focused domain functions", () => {
    const [sector] = createInitialSectors();
    const system = sector.Systems[0];
    const route = sector.Routes.find((candidate) => candidate.SystemId1 === system.Id || candidate.SystemId2 === system.Id)!;
    const edited = applySectorEdits(sector, { sectorName: "Edited Sector", details: { [system.Id]: { NiceName: "Edited System" } } });

    expect(edited.SectorName).toBe("Edited Sector");
    expect(findDetails(edited, system.Id)?.NiceName).toBe("Edited System");
    expect(sector.SectorName).toBe("Sector1");
    const destination = resolveTravelDestination(sector, route.Id, system.Id);
    expect(destination?.Id).toBe(route.SystemId1 === system.Id ? route.SystemId2 : route.SystemId1);
  });
});
