import { generateSectorV3, type InhabitedWorldV2, type SectorV3, type StarSystemV3 } from "./sector_v2";

const DEFAULT_SEED = "swn-sector-v3-artifact";

const STAR_COLORS: Record<string, string> = {
  "A-type": "#b7d9ff",
  "F-type": "#fff2d1",
  "G-type": "#ffe889",
  "K-type": "#ffbd72",
  "M-type": "#ff765e",
  Giant: "#ff9868",
  "White dwarf": "#eaf4ff",
  "Neutron star": "#9dc9ff",
  "Stellar-mass black hole": "#17151d",
};

type VisualWorld = InhabitedWorldV2 & {
  planetDetails: InhabitedWorldV2["planetDetails"] & {
    bulkComposition?: { color?: string };
  };
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function sizeClass(world: VisualWorld): string {
  const size = world.planetDetails.terrestrialSize.result;
  if (size === "Luna") return "planet--luna";
  if (size === "Mars") return "planet--mars";
  if (size === "Super-Earth") return "planet--super-earth";
  if (size === "Earth") return "planet--earth";
  return "planet--earth";
}

function planetColor(world: VisualWorld): string {
  return world.planetDetails.bulkComposition?.color ?? "#87a4c1";
}

function worldSummary(world: InhabitedWorldV2): string {
  const attributes = Object.entries(world.attributes)
    .map(([id, value]) => `${id.replace("_", " ")}: ${value.result}`)
    .join(" · ");
  return `${world.name}\n${world.tags.map(tag => tag.tag).join(" / ")}\n${world.planetDetails.terrestrialSize.result}-sized (Size Hab ${world.planetDetails.terrestrialSize.hab}) · Environmental Hab ${world.calculatedHab} · ${attributes}`;
}

function systemDetails(system: StarSystemV3): string {
  const worlds = system.worlds.map(worldSummary).join("\n\n");
  return `${system.id} · ${system.primaryStar.result}\nStar Hab ${system.primaryStar.hab} · ${system.primaryStar.habitableSlots} habitable slots\n\n${worlds}`;
}

function renderSystem(system: StarSystemV3): HTMLElement {
  const row = element("article", "system-row");
  row.tabIndex = 0;

  const starColumn = element("div", "star-column");
  const star = element("div", "star-symbol");
  star.style.setProperty("--star-color", STAR_COLORS[system.primaryStar.result] ?? "#ffffff");
  star.textContent = system.primaryStar.result === "Stellar-mass black hole" ? "●" : "✦";
  star.title = `${system.primaryStar.result}; Hab ${system.primaryStar.hab}; ${system.primaryStar.habitableSlots} habitable slots`;
  const starCaption = element("span", "star-caption");
  starCaption.textContent = system.primaryStar.result;
  starColumn.append(star, starCaption);

  const slots = element("div", "planet-slots");
  for (let index = 0; index < 3; index += 1) {
    const slot = element("div", "planet-slot");
    const orbitSlot = index + 1;
    const world = system.worlds.find(candidate => candidate.orbitSlot === orbitSlot) as VisualWorld | undefined;
    if (world !== undefined) {
      const planet = element("button", `planet ${sizeClass(world)}`);
      planet.type = "button";
      planet.style.backgroundColor = planetColor(world);
      planet.textContent = String(world.orbitSlot);
      planet.title = worldSummary(world);
      slot.append(planet);
    }
    slots.append(slot);
  }

  const label = element("div", "label-box");
  const heading = element("h2");
  heading.textContent = system.id;
  label.append(heading);
  for (const world of system.worlds) {
    const entry = element("p", "world-label");
    const name = element("strong");
    name.textContent = `${world.order}. ${world.name}`;
    const tags = element("span");
    tags.textContent = world.tags.map(tag => tag.tag).join(" · ");
    entry.append(name, tags);
    label.append(entry);
  }

  const detail = element("pre", "detail-card");
  detail.textContent = systemDetails(system);
  row.append(starColumn, slots, label, detail);
  return row;
}

function renderSector(root: HTMLElement, sector: SectorV3): void {
  const rows = root.querySelector<HTMLElement>("#system-rows");
  if (rows === null) return;
  rows.replaceChildren(...sector.systems.map(renderSystem));
  const count = root.querySelector<HTMLElement>("#system-count");
  if (count !== null) count.textContent = `${sector.starCount} systems`;
}

function createApp(root: HTMLElement): void {
  const style = document.createElement("style");
  style.textContent = `
    :root { color: #dce9f8; background: #08111f; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; } body { margin: 0; min-width: 720px; }
    main { max-width: 1280px; margin: 0 auto; padding: 32px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 24px; border-bottom: 1px solid #294563; padding-bottom: 20px; }
    h1 { margin: 0; font-size: 1.65rem; letter-spacing: .03em; } header p { margin: 6px 0 0; color: #90a9c4; }
    form { display: flex; gap: 8px; } input, button { font: inherit; } input { width: 220px; padding: 8px 10px; color: inherit; background: #10233a; border: 1px solid #426789; border-radius: 5px; }
    form button { padding: 8px 12px; color: #08111f; background: #9ed8ff; border: 0; border-radius: 5px; cursor: pointer; }
    #system-rows { display: grid; gap: 10px; margin-top: 20px; }
    .system-row { position: relative; display: grid; grid-template-columns: 150px minmax(250px, .8fr) minmax(420px, 1.5fr); align-items: center; gap: 20px; min-height: 100px; padding: 14px 18px; background: #0d1a2c; border: 1px solid #203c59; border-radius: 8px; outline: none; }
    .system-row:hover, .system-row:focus { border-color: #74bdf0; background: #102139; }
    .star-column { display: grid; justify-items: center; gap: 4px; min-width: 0; } .star-symbol { color: var(--star-color); font-size: 3rem; line-height: 1; text-shadow: 0 0 13px var(--star-color); } .star-caption { font-size: .75rem; color: #b8c9dd; text-align: center; }
    .planet-slots { display: flex; align-items: center; justify-content: space-around; min-height: 72px; border-left: 1px solid #294563; border-right: 1px solid #294563; }
    .planet-slot { width: 64px; height: 64px; display: grid; place-items: center; }
    .planet { border: 2px solid rgba(230,245,255,.72); border-radius: 50%; color: #06111c; font-weight: 800; box-shadow: inset -7px -6px 0 rgba(0,0,0,.24), 0 0 12px rgba(135,164,193,.32); cursor: help; } .planet--luna { width: 20px; height: 20px; font-size: 9px; } .planet--mars { width: 29px; height: 29px; font-size: 10px; } .planet--earth { width: 39px; height: 39px; font-size: 12px; } .planet--super-earth { width: 52px; height: 52px; font-size: 14px; }
    .label-box h2 { margin: 0 0 8px; font-size: .95rem; color: #8fd3ff; } .world-label { display: grid; gap: 2px; margin: 5px 0; font-size: .8rem; } .world-label span { color: #9bb0c8; }
    .detail-card { position: absolute; z-index: 2; right: 16px; top: calc(100% + 4px); width: min(760px, calc(100vw - 64px)); margin: 0; padding: 14px; white-space: pre-wrap; color: #e6f4ff; background: #132942; border: 1px solid #79bce9; border-radius: 6px; box-shadow: 0 14px 34px #020810cc; font: .78rem/1.45 ui-monospace, monospace; opacity: 0; pointer-events: none; transform: translateY(-4px); transition: opacity .14s, transform .14s; }
    .system-row:hover .detail-card, .system-row:focus .detail-card { opacity: 1; transform: translateY(0); }
    .legend { margin: 18px 0 0; color: #8fa8c2; font-size: .8rem; } code { color: #bce4ff; }
  `;
  document.head.append(style);

  const header = element("header");
  const title = element("div");
  const h1 = element("h1"); h1.textContent = "Sector V3 · System Rows";
  const subtitle = element("p"); subtitle.innerHTML = "Hover a row or planet for the generated details. <span id=\"system-count\"></span>";
  title.append(h1, subtitle);
  const form = element("form");
  const seed = element("input") as HTMLInputElement;
  seed.value = DEFAULT_SEED; seed.name = "seed"; seed.setAttribute("aria-label", "Sector seed");
  const generate = element("button"); generate.type = "submit"; generate.textContent = "Generate";
  form.append(seed, generate); header.append(title, form);
  const rows = element("section"); rows.id = "system-rows"; rows.setAttribute("aria-live", "polite");
  const legend = element("p", "legend"); legend.textContent = "Worlds are assigned the middle orbit first (slot 2), then the inner orbit (slot 1), then the outer orbit (slot 3). Empty orbit positions are not shown. Planet size is generated from the V3 terrestrial-size table; bulk-composition color will replace the neutral-color fallback when that field is generated.";
  root.replaceChildren(header, rows, legend);

  const generateSector = (): void => renderSector(root, generateSectorV3(seed.value || DEFAULT_SEED));
  form.addEventListener("submit", event => { event.preventDefault(); generateSector(); });
  generateSector();
}

const root = document.querySelector<HTMLElement>("#app");
if (root === null) throw new Error("Missing visualizer app root");
createApp(root);
