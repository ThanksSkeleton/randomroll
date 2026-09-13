import { generateSectorV4, type PointOfInterestV4, type StarSystemV4, type SystemLocationV4 } from "./sector_v4";
import type { InhabitedWorldV2 } from "./sector_v2";

const DEFAULT_SEED = "swn-sector-v4-artifact";
const ZONES = ["TooHot", "Goldilocks", "TooCold_1", "IngressEgress", "TooCold_3"] as const;
const STAR_COLORS: Record<string, string> = { "A-type": "#b7d9ff", "F-type": "#fff2d1", "G-type": "#ffe889", "K-type": "#ffbd72", "M-type": "#ff765e", Giant: "#ff9868", "White dwarf": "#eaf4ff", "Neutron star": "#9dc9ff", "Stellar-mass black hole": "#17151d" };
const PLACEHOLDER_COLORS: Record<string, string> = { Mercurian: "#9da1a3", "Europan / Plutonic": "#8fc6dd", Lunar: "#f2f4f5", Ioan: "#ecd34d", Titanian: "#49aca8", Martian: "#b85f48", Venusian: "#866141" };

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] { const node = document.createElement(tag); if (className !== undefined) node.className = className; return node; }
function populationLevel(world: InhabitedWorldV2): number { const roll = world.attributes.population.roll; return roll <= 9 ? 1 : roll <= 31 ? 2 : roll <= 75 ? 3 : roll <= 94 ? 4 : 5; }
function worldSummary(world: InhabitedWorldV2): string { const a = Object.entries(world.attributes).map(([id, value]) => `${id.replaceAll("_", " ")}: ${value.result}`).join("\n"); const p = world.planetDetails; return `${world.name}\n\nTags: ${world.tags.map(tag => tag.tag).join(" · ")}\nHab: ${world.calculatedHab}  •  Population: ${populationLevel(world)}  •  TL: ${world.attributes.tech_level.tl ?? 0}\n\n${p.terrestrialSize.result}-sized; ${p.bulkComposition.result} composition\nSurface water: ${p.surfaceWaterPresent.result}\n${p.isGasGiantMoon ? "Gas-giant moon" : "Independent planet"}; ${p.tidallyLocked ? "tidally locked" : "not tidally locked"}\n\n${a}`; }
function locationCaption(location: SystemLocationV4, world?: InhabitedWorldV2): string { const orbit = `Orbit: ${location.au.toFixed(3)} AU · ${location.orbitalPositionCategory} object ${location.orbitalOrder}`; if (world !== undefined) return `${worldSummary(world)}\n\n${orbit}`; return `${location.archetype ?? location.kind}\n\n${location.category ?? "Special location"}\n${orbit}${location.parentLocationId === undefined ? "" : "\nMoon of a host planet"}`; }

function statusRow(label: string, value: string, className = ""): HTMLElement { const row = element("div", `status-row ${className}`); const key = element("span", "status-key"); key.textContent = label; const content = element("span", "status-value"); content.textContent = value; row.append(key, content); return row; }
function worldStatus(world: InhabitedWorldV2): HTMLElement { const status = element("div", "world-status"); const tl = world.attributes.tech_level.tl ?? 0; status.append(statusRow("H", String(world.calculatedHab), `status-row--hab status-row--hab-${world.calculatedHab}`), statusRow("P", "●".repeat(populationLevel(world))), statusRow("T", `${"★".repeat(Math.min(4, Math.floor(tl)))}${tl > 4 ? "+" : ""}`)); return status; }

function symbolFor(location: SystemLocationV4): HTMLElement {
  const archetype = location.archetype ?? location.kind; const symbol = element("span", "object-symbol"); symbol.setAttribute("aria-hidden", "true");
  if (location.kind === "PrimaryPlanet") { symbol.classList.add("object-symbol--inhabited"); symbol.style.background = "#73af8a"; }
  else if (PLACEHOLDER_COLORS[archetype] !== undefined) { symbol.classList.add("object-symbol--terrestrial"); symbol.style.background = PLACEHOLDER_COLORS[archetype]!; }
  else if (archetype === "Jovian") symbol.classList.add("object-symbol--jovian");
  else if (archetype === "Neptunian") symbol.classList.add("object-symbol--neptunian");
  else if (archetype === "KupierBelt" || archetype === "AsteroidBelt") { symbol.classList.add("object-symbol--belt"); if (archetype === "KupierBelt") symbol.classList.add("object-symbol--kuiper"); for (let i = 0; i < (archetype === "KupierBelt" ? 5 : 3); i += 1) symbol.append(element("i")); }
  else if (archetype === "GasCloud") symbol.classList.add("object-symbol--cloud"); else symbol.classList.add("object-symbol--orbit");
  return symbol;
}
function poiSymbol(point: PointOfInterestV4): HTMLElement { const poi = element("span", "poi-symbol"); poi.textContent = "★"; poi.tabIndex = 0; poi.setAttribute("aria-label", point.point); const card = element("span", "poi-tooltip"); card.textContent = point.kind === "Other" ? `${point.point}\n${point.occupant ?? ""}${point.situation === undefined ? "" : ` · ${point.situation}`}` : point.point; poi.append(card); return poi; }
function renderLocation(location: SystemLocationV4, worlds: Map<string, InhabitedWorldV2>, points: Map<string, PointOfInterestV4>): HTMLElement { const world = location.worldId === undefined ? undefined : worlds.get(location.worldId); const node = element("div", `orbital-object orbital-object--${location.kind}`); node.tabIndex = 0; node.setAttribute("aria-label", location.archetype ?? location.kind); node.append(symbolFor(location)); if (world !== undefined) node.append(worldStatus(world)); const caption = element("span", "object-caption"); caption.textContent = world?.name ?? (location.archetype === "IndependentOrbit" ? "Deep space" : location.archetype ?? location.kind); node.append(caption); const tooltip = element("pre", "object-tooltip"); tooltip.textContent = locationCaption(location, world); node.append(tooltip); const poiStack = element("span", "poi-stack"); for (const pointId of location.pointIds) { const point = points.get(pointId); if (point !== undefined) poiStack.append(poiSymbol(point)); } node.append(poiStack); return node; }
function renderLocationFamilies(locations: readonly SystemLocationV4[], worlds: Map<string, InhabitedWorldV2>, points: Map<string, PointOfInterestV4>): HTMLElement[] {
  const ids = new Set(locations.map(location => location.id));
  return locations.filter(location => location.parentLocationId === undefined || !ids.has(location.parentLocationId)).map(location => {
    const moons = locations.filter(candidate => candidate.parentLocationId === location.id);
    if (moons.length === 0) return renderLocation(location, worlds, points);
    const family = element("div", "orbital-family");
    const moonRow = element("div", "orbital-family__moons");
    family.append(renderLocation(location, worlds, points));
    moons.forEach(moon => moonRow.append(renderLocation(moon, worlds, points)));
    family.append(moonRow);
    return family;
  });
}
function renderIngressEgress(location: SystemLocationV4, points: Map<string, PointOfInterestV4>): HTMLElement { const stack = element("div", "ingress-egress"); stack.tabIndex = 0; stack.setAttribute("aria-label", `Warp point at ${location.au.toFixed(3)} AU`); const tooltip = element("span", "transit-tooltip"); tooltip.textContent = `Warp point\n${location.au.toFixed(3)} AU`; const ingress = element("div", "ingress-egress__half ingress-egress__half--ingress"); ingress.textContent = "Ingress"; const egress = element("div", "ingress-egress__half ingress-egress__half--egress"); egress.textContent = "Egress"; for (const id of location.pointIds) { const point = points.get(id); if (point?.kind === "Ingress Point") ingress.append(poiSymbol(point)); if (point?.kind === "Egress Point") egress.append(poiSymbol(point)); } stack.append(ingress, egress, tooltip); return stack; }

function renderSystem(system: StarSystemV4): HTMLElement {
  const row = element("article", "system-row");
  const worlds = new Map(system.worlds.map(world => [world.id, world]));
  const points = new Map(system.pointsOfInterest.map(point => [point.id, point]));
  const hasGoldilocks = system.locations.some(location => location.orbitalPositionCategory === "Goldilocks" && location.habitableSlot !== undefined);
  if (!hasGoldilocks) row.classList.add("system-row--no-goldilocks");
  const star = element("div", "star-column"); const icon = element("div", "star-symbol"); const isRemnant = ["White dwarf", "Neutron star", "Stellar-mass black hole"].includes(system.primaryStar.result); icon.textContent = isRemnant ? "" : "✦"; if (system.primaryStar.result === "M-type") icon.classList.add("star-symbol--m"); if (system.primaryStar.result === "Giant") icon.classList.add("star-symbol--giant"); if (isRemnant) icon.classList.add("star-symbol--remnant"); icon.style.setProperty("--star-color", STAR_COLORS[system.primaryStar.result] ?? "#fff"); icon.title = `${system.primaryStar.result}; Hab ${system.primaryStar.hab}; ${system.primaryStar.habitableSlots} Goldilocks slots`; const title = element("span", "system-name"); title.textContent = system.id; star.append(icon, title); row.append(star);
  const zones = !hasGoldilocks
    ? ZONES.filter(zone => zone !== "Goldilocks")
    : ZONES;
  for (const zoneName of zones) {
    const locations = system.locations.filter(location => location.orbitalPositionCategory === zoneName);
    if (zoneName === "TooCold_3" && locations.length === 0) continue;
    const zone = element("section", `orbit-zone orbit-zone--${zoneName}`);
    if (zoneName === "Goldilocks") {
      const occupiedSlots = [...new Set(locations.flatMap(location => location.habitableSlot === undefined ? [] : [location.habitableSlot]))];
      if (occupiedSlots.length === 0) continue;
      zone.style.flexGrow = String(occupiedSlots.length);
      for (const slot of occupiedSlots) {
        const slotNode = element("div", "goldilocks-slot");
        const slotLocations = locations.filter(location => location.habitableSlot === slot || (locations.some(child => child.parentLocationId === location.id && child.habitableSlot === slot)));
        renderLocationFamilies(slotLocations, worlds, points).forEach(family => slotNode.append(family));
        zone.append(slotNode);
      }
    } else if (zoneName === "IngressEgress") {
      const transit = locations[0];
      if (transit !== undefined) zone.append(renderIngressEgress(transit, points));
    } else {
      if (locations.length === 0) zone.classList.add("orbit-zone--empty");
      else zone.classList.add("orbit-zone--populated");
      const objects = element("div", "zone-objects");
      renderLocationFamilies(locations, worlds, points).forEach(family => objects.append(family));
      zone.append(objects);
    }
    row.append(zone);
  }
  return row;
}
function renderSector(root: HTMLElement, seed: string): void { const sector = generateSectorV4(seed); const rows = root.querySelector<HTMLElement>("#system-rows"); if (rows !== null) rows.replaceChildren(...sector.systems.map(renderSystem)); const count = root.querySelector<HTMLElement>("#system-count"); if (count !== null) count.textContent = `${sector.starCount} systems`; }

function createApp(root: HTMLElement): void {
  const style = document.createElement("style"); style.textContent = `
    :root { color:#eef3fa; background:#000; font-family:Inter,ui-sans-serif,system-ui,sans-serif; } * { box-sizing:border-box; } body { margin:0; min-width:1100px; background:#000; } main { max-width:1800px; margin:0 auto; padding:28px; } header { display:flex; justify-content:space-between; align-items:end; gap:24px; padding:0 0 18px; border-bottom:1px solid #2e343c; } h1 { margin:0; font-size:1.5rem; letter-spacing:.04em; } header p { margin:5px 0 0; color:#96a2b1; } form { display:flex; gap:8px; } input,button { font:inherit; } input { width:225px; padding:8px 10px; color:inherit; background:#101216; border:1px solid #4c5662; border-radius:4px; } form button { padding:8px 13px; border:0; border-radius:4px; color:#050607; background:#e5c953; cursor:pointer; }
    #system-rows { display:grid; gap:14px; margin-top:20px; } .system-row { display:flex; min-height:172px; background:#000; border:1px solid #292d32; } .star-column { flex:0 0 104px; display:grid; align-content:center; justify-items:center; padding:10px; background:#030303; border-right:1px solid #4d5968; } .star-symbol { color:var(--star-color); font-size:3.4rem; line-height:1; text-shadow:0 0 14px var(--star-color); } .star-symbol--m { font-size:2.55rem; } .star-symbol--giant { font-size:5.1rem; } .star-symbol--remnant { width:2.5rem; height:2.5rem; border-radius:50%; background:#9d64ce; box-shadow:0 0 16px #9d64ce; } .system-name { margin-top:8px; color:#aeb7c3; font-size:.7rem; text-align:center; }
    .orbit-zone { position:relative; display:flex; flex:1 1 145px; align-items:center; justify-content:center; min-width:104px; padding:8px 9px; } .orbit-zone--empty { flex:0 1 104px; } .orbit-zone--populated { flex-grow:2; } .orbit-zone--TooHot { border-right:2px dotted #45b775; } .system-row--no-goldilocks .orbit-zone--TooHot { border-right:0; } .orbit-zone--Goldilocks { min-width:0; padding:8px 0; border-right:2px dotted #45b775; } .zone-objects { display:flex; flex-flow:row nowrap; justify-content:center; align-items:center; gap:12px 15px; width:100%; } .goldilocks-slot { position:relative; flex:1 1 110px; min-width:110px; height:132px; display:flex; align-items:center; justify-content:center; } .orbital-family { display:grid; justify-items:center; gap:4px; } .orbital-family__moons { display:flex; justify-content:center; align-items:start; gap:10px; padding-top:5px; border-top:1px solid #56616c; }
    .orbital-object { position:relative; display:grid; justify-items:center; gap:3px; min-width:45px; cursor:help; outline:none; } .object-symbol { position:relative; display:inline-block; border:1px solid rgba(255,255,255,.72); border-radius:50%; box-shadow:inset -5px -5px 0 rgba(0,0,0,.22),0 0 10px rgba(255,255,255,.14); } .object-symbol--inhabited { width:33px; height:33px; } .object-symbol--terrestrial { width:24px; height:24px; } .object-symbol--jovian { width:58px; height:58px; background:#f0dfb3; } .object-symbol--neptunian { width:39px; height:39px; background:#43aaa9; } .object-symbol--cloud { width:48px; height:48px; background:radial-gradient(circle,#a46ad2 0%,#703d9c88 44%,transparent 72%); border:0; box-shadow:none; } .object-symbol--orbit { width:19px; height:19px; border-radius:1px; background:#89919a; } .object-symbol--belt { width:52px; height:30px; border:0; box-shadow:none; } .object-symbol--belt i { position:absolute; width:8px; height:8px; border-radius:50%; background:#a1a7ad; box-shadow:inset -2px -2px #60656a; } .object-symbol--belt i:nth-child(1) { left:3px; top:13px; } .object-symbol--belt i:nth-child(2) { left:21px; top:4px; } .object-symbol--belt i:nth-child(3) { right:3px; bottom:3px; } .object-symbol--belt i:nth-child(4) { left:31px; top:16px; } .object-symbol--belt i:nth-child(5) { left:12px; top:2px; } .object-caption { max-width:88px; overflow:hidden; color:#abb6c1; font-size:.59rem; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    .world-status { display:grid; gap:1px; position:absolute; left:calc(100% + 3px); top:0; width:35px; padding:2px 3px; background:#0a0b0d; border:1px solid #78828c; border-radius:2px; } .status-row { display:flex; align-items:center; gap:2px; min-height:9px; font:7px/1 ui-monospace,monospace; white-space:nowrap; } .status-key { width:7px; color:#929daa; } .status-value { color:#edf2f6; } .status-row--hab-1 .status-value { color:#e66262; } .status-row--hab-2 .status-value { color:#e3c94c; } .status-row--hab-3 .status-value { color:#55bb76; } .status-row:nth-child(3) .status-value { color:#e8cf56; }
    .object-tooltip,.poi-tooltip { position:absolute; z-index:5; display:block; width:280px; margin:0; padding:11px; color:#eaf1f7; background:#111722; border:1px solid #60758d; border-radius:4px; box-shadow:0 12px 30px #000d; font:.72rem/1.4 ui-monospace,monospace; white-space:pre-wrap; opacity:0; pointer-events:none; transform:translateY(-5px); transition:opacity .12s,transform .12s; } .object-tooltip { top:calc(100% + 7px); left:50%; } .orbital-object:hover .object-tooltip,.orbital-object:focus .object-tooltip { opacity:1; transform:translateY(0); } .poi-stack { position:absolute; display:flex; gap:1px; right:-6px; top:-10px; } .poi-symbol { position:relative; color:#ffe363; font-size:15px; line-height:1; text-shadow:0 0 6px #d7a900; cursor:help; outline:none; } .poi-tooltip { top:19px; right:0; width:210px; text-align:left; } .poi-symbol:hover .poi-tooltip,.poi-symbol:focus .poi-tooltip { opacity:1; transform:translateY(0); }
    .orbit-zone--IngressEgress::before { content:""; position:absolute; z-index:0; top:0; bottom:0; left:50%; border-left:2px dotted #ad68de; } .ingress-egress { position:relative; z-index:1; display:grid; grid-template-rows:1fr 1fr; width:82px; height:112px; border:1px solid #d9e2ec; outline:none; } .ingress-egress__half { position:relative; display:flex; align-items:center; justify-content:center; gap:2px; color:#edf4fa; font-size:.63rem; letter-spacing:.04em; } .ingress-egress__half--ingress { background:#2369bc; border-bottom:1px solid #d9e2ec; } .ingress-egress__half--egress { background:#b53f42; } .transit-tooltip { position:absolute; z-index:6; left:50%; top:calc(100% + 7px); display:block; width:160px; margin:0; padding:9px; color:#eaf1f7; background:#111722; border:1px solid #9a70bd; border-radius:4px; box-shadow:0 12px 30px #000d; font:.72rem/1.4 ui-monospace,monospace; white-space:pre-wrap; opacity:0; pointer-events:none; transform:translateY(-5px); transition:opacity .12s,transform .12s; } .ingress-egress:hover .transit-tooltip,.ingress-egress:focus .transit-tooltip { opacity:1; transform:translateY(0); } .legend { margin:16px 0 0; color:#8995a1; font-size:.77rem; }
  `; document.head.append(style);
  const header = element("header"); const title = element("div"); const h1 = element("h1"); h1.textContent = "Sector Creation Flow V4"; const subtitle = element("p"); subtitle.innerHTML = "Orbital regions, inhabited worlds, and points of interest. <span id=\"system-count\"></span>"; title.append(h1, subtitle); const form = element("form"); const seed = element("input") as HTMLInputElement; seed.name = "seed"; seed.value = DEFAULT_SEED; seed.setAttribute("aria-label", "Sector seed"); const generate = element("button"); generate.type = "submit"; generate.textContent = "Generate"; form.append(seed, generate); header.append(title, form); const rows = element("section"); rows.id = "system-rows"; rows.setAttribute("aria-live", "polite"); const legend = element("p", "legend"); legend.textContent = "Green dotted lines mark the Goldilocks boundary. White dotted lines divide Goldilocks slots and transit/extreme regions. Yellow stars are points of interest; hover objects or stars for details."; root.replaceChildren(header, rows, legend);
  const regenerate = (): void => renderSector(root, seed.value || DEFAULT_SEED); form.addEventListener("submit", event => { event.preventDefault(); regenerate(); }); regenerate();
}
const root = document.querySelector<HTMLElement>("#app"); if (root === null) throw new Error("Missing visualizer app root"); createApp(root);
