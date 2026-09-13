import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const pdf = resolve(root, "../temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf");
const source = {
  document: "Stars Without Number: Revised Edition — Free Edition",
  file: "temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf",
  pdfPages: "133–175",
  printedPages: "129–171",
  extractedOn: "2026-09-12",
};

const tags = [
  "Abandoned Colony", "Alien Ruins", "Altered Humanity", "Anarchists", "Anthropomorphs",
  "Area 51", "Badlands World", "Battleground", "Beastmasters", "Bubble Cities",
  "Cheap Life", "Civil War", "Cold War", "Colonized Population", "Cultural Power",
  "Cybercommunists", "Cyborgs", "Cyclical Doom", "Desert World", "Doomed World",
  "Dying Race", "Eugenic Cult", "Exchange Consulate", "Fallen Hegemon", "Feral World",
  "Flying Cities", "Forbidden Tech", "Former Warriors", "Freak Geology", "Freak Weather",
  "Friendly Foe", "Gold Rush", "Great Work", "Hatred", "Heavy Industry", "Heavy Mining",
  "Hivemind", "Holy War", "Hostile Biosphere", "Hostile Space", "Immortals", "Local Specialty",
  "Local Tech", "Major Spaceyard", "Mandarinate", "Mandate Base", "Maneaters", "Megacorps",
  "Mercenaries", "Minimal Contact", "Misandry/Misogyny", "Night World", "Nomads", "Oceanic World",
  "Out of Contact", "Outpost World", "Perimeter Agency", "Pilgrimage Site", "Pleasure World",
  "Police State", "Post-Scarcity", "Preceptor Archive", "Pretech Cultists", "Primitive Aliens",
  "Prison Planet", "Psionics Academy", "Psionics Fear", "Psionics Worship", "Quarantined World",
  "Radioactive World", "Refugees", "Regional Hegemon", "Restrictive Laws", "Revanchists",
  "Revolutionaries", "Rigid Culture", "Rising Hegemon", "Ritual Combat", "Robots", "Seagoing Cities",
  "Sealed Menace", "Secret Masters", "Sectarians", "Seismic Instability", "Shackled World",
  "Societal Despair", "Sole Supplier", "Taboo Treasure", "Terraform Failure", "Theocracy",
  "Tomb World", "Trade Hub", "Tyranny", "Unbraked AI", "Urbanized Surface", "Utopia",
  "Warlords", "Xenophiles", "Xenophobes", "Zombies",
];

function decodeHtml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
}

function pageLines(pdfPage) {
  const result = spawnSync("pdftotext", ["-f", String(pdfPage), "-l", String(pdfPage), "-bbox-layout", pdf, "-"], { encoding: "utf8" });
  const html = result.stdout;
  if (!html || result.status !== 0) {
    throw result.error ?? new Error(`pdftotext failed for PDF page ${pdfPage}`);
  }
  return [...html.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([\s\S]*?)<\/line>/g)]
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      text: decodeHtml([...match[3].matchAll(/<word[^>]*>([\s\S]*?)<\/word>/g)].map(word => word[1]).join(" ")),
    }));
}

function joinLines(lines) {
  return lines.join(" ").replace(/- ([a-z])/g, "$1").replace(/\s+/g, " ").trim();
}

function tagCards() {
  const tagByName = new Map(tags.map((tag, index) => [tag, index + 1]));
  const output = [];
  for (let pdfPage = 137; pdfPage <= 163; pdfPage += 1) {
    const lines = pageLines(pdfPage);
    for (const isLeft of [true, false]) {
      const column = lines
        .filter(line => isLeft ? line.x < 270 : line.x >= 270)
        .sort((a, b) => a.y - b.y);
      const titleIndices = column
        .map((line, index) => ({ index, title: line.text }))
        .filter(({ title }) => tagByName.has(title));
      for (let cardIndex = 0; cardIndex < titleIndices.length; cardIndex += 1) {
        const start = titleIndices[cardIndex];
        const end = titleIndices[cardIndex + 1]?.index ?? column.length;
        const card = column.slice(start.index + 1, end);
        const fieldStarts = card
          .map((line, index) => ({ index, marker: /^([EFCTP])(?:\s|$)/.exec(line.text)?.[1] }))
          .filter(({ marker }) => marker !== undefined);
        const description = joinLines(card.slice(0, fieldStarts[0]?.index ?? card.length).map(line => line.text));
        const prompts = Object.fromEntries(fieldStarts.map((field, index) => {
          const endIndex = fieldStarts[index + 1]?.index ?? card.length;
          const first = card[field.index].text.replace(/^[EFCTP](?:\s+|$)/, "");
          return [field.marker, joinLines([first, ...card.slice(field.index + 1, endIndex).map(line => line.text)])];
        }));
        if (Object.keys(prompts).length !== 5) {
          throw new Error(`Expected five prompt fields for ${start.title} on PDF page ${pdfPage}`);
        }
        output.push({
          roll: tagByName.get(start.title),
          tag: start.title,
          description,
          prompts: {
            enemies: prompts.E,
            friends: prompts.F,
            complications: prompts.C,
            things: prompts.T,
            places: prompts.P,
          },
          source: { ...source, pdfPage, printedPage: pdfPage - 4 },
        });
      }
    }
  }
  return output.sort((a, b) => a.roll - b.roll);
}

const worldAttributes = {
  source,
  dice: "2d6",
  tables: [
    { id: "atmosphere", printedPage: 160, rows: [[2, "Corrosive, damaging to foreign objects"], [3, "Inert gas, useless for respiration"], [4, "Airless or thin to the point of suffocation"], ["5-9", "Breathable mix"], [10, "Thick, but breathable with a pressure mask"], [11, "Invasive, penetrating suit seals"], [12, "Both corrosive and invasive in its effects"]] },
    { id: "temperature", printedPage: 162, rows: [[2, "Frozen, locked in perpetual ice"], [3, "Cold, dominated by glaciers and tundra"], ["4-5", "Variable cold with temperate places"], ["6-8", "Temperate, Earthlike in its ranges"], ["9-10", "Variable warm, with temperate places"], [11, "Warm, tropical and hotter in places"], [12, "Burning, intolerably hot on its surface"]] },
    { id: "biosphere", printedPage: 164, rows: [[2, "Remnant biosphere"], [3, "Microbial life forms exist"], ["4-5", "No native biosphere"], ["6-8", "Human-miscible biosphere"], ["9-10", "Immiscible biosphere"], [11, "Hybrid biosphere"], [12, "Engineered biosphere"]] },
    { id: "population", printedPage: 166, rows: [[2, "Failed colony"], [3, "Outpost"], ["4-5", "Fewer than a million inhabitants"], ["6-8", "Several million inhabitants"], ["9-10", "Hundreds of millions of inhabitants"], [11, "Billions of inhabitants"], [12, "Alien inhabitants"]] },
    { id: "tech_level", printedPage: 168, rows: [[2, "TL0, neolithic-level technology"], [3, "TL1, medieval technology"], ["4-5", "TL2, early Industrial Age tech"], ["6-8", "TL4, modern postech"], ["9-10", "TL3, tech like that of present-day Earth"], [11, "TL4+, postech with specialties"], [12, "TL5, pretech with surviving infrastructure"]] },
  ].map(table => ({ ...table, pdfPage: table.printedPage + 4, rows: table.rows.map(([roll, result]) => ({ roll, result })) })),
};

const systemPoints = {
  source,
  v4: {
    orbitalPositionCategories: ["TooHot", "Goldilocks", "TooCold_1", "IngressEgress", "TooCold_3"],
    requiredLocations: [{ kind: "EgressIngressRegion", orbitalPositionCategory: "IngressEgress" }],
    extraWorlds: {
      countDice: "1d6",
      minimumByOrbitalPosition: { TooHot: 1, TooCold_1: 1 },
      maximumByOrbitalPosition: { TooCold_3: 1 },
      goldilocksOpenSlotExtraChance: 0.5,
      eligibleArchetypes: ["Mercurian", "Europan / Plutonic", "Lunar", "Ioan", "Titanian", "Martian", "Venusian", "Jovian", "Neptunian", "KupierBelt", "AsteroidBelt", "GasCloud"],
      allowedOrbitalPositionCategories: {
        TerrestrialPlanet: ["TooHot", "TooCold_1", "TooCold_3"],
        GasGiant: ["TooHot", "TooCold_1", "TooCold_3"],
        AsteroidBelt: ["TooHot", "TooCold_1"],
        GasCloud: ["TooCold_1", "TooCold_3"],
        KupierBelt: ["TooCold_3"],
      },
      moonRules: {
        terrestrialExtraWorldMayOrbitGasGiant: true,
        terrestrialExtraWorldMoonChance: "same as world_attributes_2 gas_giant_moon table",
        primaryPlanetMoonCreatesParentGasGiant: true,
        parentGasGiantMayUseGoldilocks: true,
      },
    },
    pointsOfInterest: {
      minimumIngressPoints: 1,
      minimumEgressPoints: 1,
      otherCountDice: "1d4+1",
      independentOrbit: { kind: "IndependentOrbit", createdByPoint: "Deep-space station", onlyContainsPoint: "Deep-space station", allowedOrbitalPositionCategories: ["TooHot", "TooCold_1", "TooCold_3"] },
    },
  },
  extraWorlds: {
    source: "V3 extra-world archetype table supplied by the user",
    archetypes: [
      ["Mercurian", "Metal-rich, airless", "TerrestrialPlanet"],
      ["Europan / Plutonic", "Ice/water-rich", "TerrestrialPlanet"],
      ["Lunar", "Rocky, airless", "TerrestrialPlanet"],
      ["Ioan", "Volcanic rocky", "TerrestrialPlanet"],
      ["Titanian", "Hydrocarbon/organic-rich volatile world", "TerrestrialPlanet"],
      ["Martian", "Small rocky world with a thin atmosphere", "TerrestrialPlanet"],
      ["Venusian", "Earth-sized rocky world with a massive atmosphere", "TerrestrialPlanet"],
      ["Jovian", "H/He gas giant", "GasGiant"],
      ["Neptunian", "Volatile-rich ice giant", "GasGiant"],
      ["KupierBelt", "KupierBelt", "OtherObject"],
      ["AsteroidBelt", "AsteroidBelt", "OtherObject"],
      ["GasCloud", "GasCloud", "OtherObject"],
    ].map(([archetype, description, category]) => ({ archetype, description, category })),
  },
  secondaryWorld: {
    printedPage: 170,
    pdfPage: 174,
    origin: {
      dice: "d8",
      rows: [
        "Recent colony from the primary world",
        "Refuge for exiles from primary",
        "Founded ages ago by a different group",
        "Founded long before the primary world",
        "Lost ancient colony of the primary",
        "Colony recently torn free of the primary",
        "Long-standing cooperative colony world",
        "Recent interstellar colony from elsewhere",
      ].map((result, index) => ({ roll: index + 1, result })),
    },
    relationship: {
      dice: "d8",
      rows: [
        "Confirmed hatred of each other",
        "Active cold war between them",
        "Old grudges or resentments",
        "Cultural disgust and avoidance",
        "Polite interchange and trade",
        "Cultural admiration for primary",
        "Long-standing friendship",
        "Unflinching mutual loyalty",
      ].map((result, index) => ({ roll: index + 1, result })),
    },
    contactPoint: {
      dice: "d8",
      rows: [
        "Trade in vital goods",
        "Shared religion",
        "Mutual language",
        "Entertainment content",
        "Shared research",
        "Threat to both of them",
        "Shared elite families",
        "Exploiting shared resource",
      ].map((result, index) => ({ roll: index + 1, result })),
    },
  },
  otherPoint: {
    printedPage: 171,
    pdfPage: 175,
    rows: [
      [1, "Deep-space station", "OwnOrbit", ["Dangerously odd transhumans", "Freeze-dried ancient corpses", "Secretive military observers", "Eccentric oligarch and minions", "Deranged but brilliant scientist"], ["Systems breaking down", "Foreign sabotage attempt", "Black market for the elite", "Vault for dangerous pretech", "Supply base for pirates"]],
      [2, "Asteroid base", "AsteroidBelt", ["Zealous religious sectarians", "Failed rebels from another world", "Wage-slave corporate miners", "Independent asteroid prospectors", "Pirates masquerading as otherwise"], ["Life support is threatened", "Base needs a new asteroid", "Dug out something nasty", "Fighting another asteroid", "Hit a priceless vein of ore"]],
      [3, "Remote moon base", "Any NonPrimary Terrestrial Planet", ["Unlucky corporate researchers", "Reclusive hermit genius", "Remnants of a failed colony", "Military listening post", "Lonely overseers and robot miners"], ["Something dark has awoken", "Criminals trying to take over", "Moon plague breaking out", "Desperate for vital supplies", "Rich but badly-protected"]],
      [4, "Ancient orbital ruin", "Any NonPrimary Planet", ["Robots of dubious sentience", "Trigger-happy scavengers", "Government researchers", "Military quarantine enforcers", "Heirs of the original alien builders"], ["Trying to stop it awakening", "Meddling with strange tech", "Impending tech calamity", "A terrible secret is unearthed", "Fighting outside interlopers"]],
      [5, "Research base", "Any NonPrimary Planet", ["Experiments that have gotten loose", "Scientists from a major local corp", "Black-ops governmental researchers", "Secret employees of a foreign power", "Aliens studying the human locals"], ["Perilous research underway", "Hideously immoral research", "Held hostage by outsiders", "Science monsters run amok", "Selling black-market tech"]],
      [6, "Asteroid belt", "AsteroidBelt", ["Grizzled belter mine laborers", "Ancient automated guardian drones", "Survivors of destroyed asteroid base", "Pirates hiding out among the rocks", "Lonely military patrol base staff"], ["Ruptured rock released a peril", "Foreign spy ships hide there", "Gold rush for new minerals", "Ancient ruins dot the rocks", "War between rival rocks"]],
      [7, "Gas giant mine", "GasGiant Planet", ["Miserable gas-miner slaves or serfs", "Strange robots and their overseers", "Scientists studying the alien life", "Scrappers in the ruined old mine", "Impoverished separatist group"], ["Things are emerging below", "They need vital supplies", "The workers are in revolt", "Pirates secretly fuel there", "Alien remnants were found"]],
      [8, "Refueling station", "GasGiant Planet", ["Half-crazed hermit caretaker", "Sordid purveyors of decadent fun", "Extortionate corporate minions", "Religious missionaries to travelers", "Brainless automated vendors"], ["A ship is in severe distress", "Pirates have taken over", "Has corrupt customs agents", "Foreign saboteurs are active", "Deep-space alien signal"]],
    ].map(([roll, point, locationType, occupants, situations]) => ({
      roll,
      point,
      locationType,
      occupants: occupants.map((result, index) => ({ roll: index < 4 ? `${index * 2 + 1}-${index * 2 + 2}` : "9-10", result })),
      situations: situations.map((result, index) => ({ roll: index < 4 ? `${index * 2 + 1}-${index * 2 + 2}` : "9-10", result })),
    })),
  },
};

mkdirSync(root, { recursive: true });
writeFileSync(resolve(root, "world_tags.json"), `${JSON.stringify({ source, dice: "d100", tags: tagCards() }, null, 2)}\n`);
writeFileSync(resolve(root, "world_attributes.json"), `${JSON.stringify(worldAttributes, null, 2)}\n`);
writeFileSync(resolve(root, "system_points_of_interest.json"), `${JSON.stringify(systemPoints, null, 2)}\n`);
