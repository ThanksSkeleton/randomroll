import { describe, expect, it } from "vitest";
import { build_super_export } from "../generators/supers/supers_impl";
import { default_build } from "../generators/dcc/dcc_impl";

import { type ItemsNice, type ItemsRow, toItemsNice } from "../table_data/Items";
import rawItems from "../table_data/Items.json";

import { type ProfessionsRow } from "../table_data/Professions";
import rawProfessions from "../table_data/Professions.json";

import { toWeaponsNice, type WeaponsNice, type WeaponsRow } from "../table_data/Weapons";
import rawWeapons from "../table_data/Weapons.json";

const items: ItemsRow[] = rawItems;
const itemsNice: ItemsNice[] = items.map(toItemsNice);

const professions: ProfessionsRow[] = rawProfessions;

const weapons: WeaponsRow[] = rawWeapons;
const weaponsNice: WeaponsNice[] = weapons.map(toWeaponsNice);

function nonEmpty(value: string): boolean {
  return value.trim() !== "";
}

describe("DCC profession data integrity", () => {
  it("all weapons referenced by professions exist in weapons", () => {
    const weaponNames = new Set(weaponsNice.map((w) => w.Weapon));

    const missingWeapons = professions
      .map((p) => p.Weapon)
      .filter(nonEmpty)
      .filter((weapon) => !weaponNames.has(weapon));

    expect(missingWeapons).toEqual([]);
  });

  it("all profession trade goods exist in items", () => {
    const itemNames = new Set(itemsNice.map((i) => i.Item));

    const missingTradeGoods = professions
      .map((p) => p.TradeGood)
      .filter(nonEmpty)
      .filter((tradeGood) => !itemNames.has(tradeGood));

    expect(missingTradeGoods).toEqual([]);
  });

  it("all weapons not assigned to a specific profession are random", () => {
    const professionWeapons = new Set(
      professions
        .map((p) => p.Weapon)
        .filter(nonEmpty),
    );

    const nonRandomUnassignedWeapons = weaponsNice
      .filter((w) => !professionWeapons.has(w.Weapon))
      .filter((w) => !w.Random)
      .map((w) => w.Weapon);

    expect(nonRandomUnassignedWeapons).toEqual([]);
  });

  it("all items not assigned to a specific profession are random", () => {
    const professionTradeGoods = new Set(
      professions
        .map((p) => p.TradeGood)
        .filter(nonEmpty),
    );

    const nonRandomUnassignedItems = itemsNice
      .filter((i) => !professionTradeGoods.has(i.Item))
      .filter((i) => !i.Random)
      .map((i) => i.Item);

    expect(nonRandomUnassignedItems).toEqual([]);
  });
});

describe("All UTs", () => {

  it("IATW Powers test", () => {
      let output = build_super_export("TEST", 200);
      console.debug(output);
      // expect(output[0][0]).toBe("Daichi");
      // expect(output[1][0]).toBe("Hiroshi");
      // expect(output[2][0]).toBe("Satoshi");
      // expect(output[0][1]).toBe("Mars");
      // expect(output[0][2]).toBe("grounded");
  });

  it("DCC Students test", () => {
      let output = default_build("TEST");
      console.debug(output);
      // expect(output[0][0]).toBe("Daichi");
      // expect(output[1][0]).toBe("Hiroshi");
      // expect(output[2][0]).toBe("Satoshi");
      // expect(output[0][1]).toBe("Mars");
      // expect(output[0][2]).toBe("grounded");
  });
});
