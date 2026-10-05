import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const SECTOR_COUNT = 50;
const OUTPUT_PATH = resolve('swn_sector/INHABITED_WORLDS_STATISTICS.html');

type WorldRecord = {
  sector: string;
  techLevel: string;
  population: string;
  habitability: string;
  limitingFactors: string[];
};

type SectorSummary = {
  seed: string;
  systems: number;
  inhabitedWorlds: number;
};

const TECH_LABELS: Record<string, string> = {
  '0': 'TL 0 · Neolithic',
  '1': 'TL 1 · Medieval',
  '2': 'TL 2 · Industrial',
  '3': 'TL 3 · 21st Century',
  '4': 'TL 4 · Postech Baseline',
  '4.1': 'TL 4.1 · Postech Specialties',
  '5': 'TL 5 · Pretech',
};

const POPULATION_LABELS: Record<string, string> = {
  '1': 'Rank 1 · Outpost (≤2,000)',
  '2': 'Rank 2 · City-State (2,001–1M)',
  '3': 'Rank 3 · Minor Polity (millions)',
  '4': 'Rank 4 · Major Polity (hundreds of millions)',
  '5': 'Rank 5 · Great Polity (billions)',
};

const HABITABILITY_LABELS: Record<string, string> = {
  '0': 'Hab 0 · Hostile',
  '1': 'Hab 1 · Marginal',
  '2': 'Hab 2 · Livable',
  '3': 'Hab 3 · Earthlike',
};

const LIMITER_LABELS: Record<string, string> = {
  star: 'Star lowest',
  atmosphere: 'Atmosphere lowest',
  temperature: 'Temperature lowest',
  biosphere: 'Terran biosphere lowest',
  size: 'Size lowest',
  composition: 'Bulk composition lowest',
};

const PALETTE = ['#67e8f9', '#60a5fa', '#818cf8', '#a78bfa', '#e879f9', '#fb7185', '#fbbf24'];

function countsFor(
  records: WorldRecord[],
  key: keyof Pick<WorldRecord, 'techLevel' | 'population' | 'habitability'>,
) {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record[key], (counts.get(record[key]) ?? 0) + 1);
  return counts;
}

function barChart(
  title: string,
  eyebrow: string,
  counts: Map<string, number>,
  order: string[],
  labels: Record<string, string>,
  total: number,
  options: { wide?: boolean; note?: string } = {},
) {
  const rows = order
    .map((key, index) => {
      const count = counts.get(key) ?? 0;
      const percentage = (count / total) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${labels[key]}</span><span>${percentage.toFixed(1)}%</span></div>
          <div class="bar-track" role="img" aria-label="${labels[key]}: ${count} worlds, ${percentage.toFixed(1)} percent">
            <div class="bar-fill" style="--bar-width:${percentage.toFixed(2)}%;--bar-color:${PALETTE[index % PALETTE.length]}"></div>
          </div>
          <div class="bar-count">${count.toLocaleString()} worlds</div>
        </div>`;
    })
    .join('');

  return `<section class="chart-card${options.wide ? ' wide' : ''}">
    <header><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div><span class="sample">n = ${total.toLocaleString()}</span></header>
    <div class="bars">${rows}</div>
    ${options.note ? `<p class="chart-note">${options.note}</p>` : ''}
  </section>`;
}

function reportHtml(worlds: WorldRecord[], sectors: SectorSummary[]) {
  const techCounts = countsFor(worlds, 'techLevel');
  const populationCounts = countsFor(worlds, 'population');
  const habitabilityCounts = countsFor(worlds, 'habitability');
  const limiterWorlds = worlds.filter((world) => world.habitability !== '3');
  const limiterCounts = new Map<string, number>();
  for (const world of limiterWorlds)
    for (const factor of world.limitingFactors)
      limiterCounts.set(factor, (limiterCounts.get(factor) ?? 0) + 1);
  const totalSystems = sectors.reduce((sum, sector) => sum + sector.systems, 0);
  const average = worlds.length / sectors.length;
  const min = Math.min(...sectors.map((sector) => sector.inhabitedWorlds));
  const max = Math.max(...sectors.map((sector) => sector.inhabitedWorlds));
  const maxSectorWorlds = Math.max(...sectors.map((sector) => sector.inhabitedWorlds));
  const sectorBars = sectors
    .map(
      (sector, index) =>
        `<div class="sector-bar" style="--height:${((sector.inhabitedWorlds / maxSectorWorlds) * 100).toFixed(2)}%" title="${sector.seed}: ${sector.inhabitedWorlds} inhabited worlds"><span>${index + 1}</span></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>SWN Inhabited Worlds · Statistical Survey</title>
  <style>
    :root { color-scheme: dark; --ink:#e8f4ff; --muted:#8da3b8; --panel:rgba(13,27,43,.84); --line:rgba(139,190,226,.16); --cyan:#67e8f9; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:#050b14; font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body::before { content:""; position:fixed; inset:0; z-index:-2; background:radial-gradient(circle at 12% 8%,rgba(19,125,160,.24),transparent 32%),radial-gradient(circle at 90% 18%,rgba(99,68,190,.2),transparent 28%),linear-gradient(180deg,#07101c 0%,#040811 100%); }
    body::after { content:""; position:fixed; inset:0; z-index:-1; opacity:.32; background-image:radial-gradient(#b7e8ff 0.65px,transparent 0.7px); background-size:29px 29px; mask-image:linear-gradient(to bottom,#000,transparent 75%); }
    main { width:min(1180px,calc(100% - 40px)); margin:auto; padding:64px 0 56px; }
    .hero { display:grid; grid-template-columns:1.45fr .75fr; gap:42px; align-items:end; margin-bottom:34px; }
    .kicker,.eyebrow { margin:0 0 9px; color:var(--cyan); font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
    h1 { max-width:760px; margin:0; font:700 clamp(42px,7vw,82px)/.96 Georgia,serif; letter-spacing:-.045em; }
    .hero-copy { margin:24px 0 0; max-width:680px; color:#a9bed0; font-size:17px; }
    .stamp { justify-self:end; width:210px; padding:22px; border:1px solid rgba(103,232,249,.35); background:rgba(7,20,33,.66); box-shadow:0 0 40px rgba(40,174,212,.08); }
    .stamp strong { display:block; font:700 44px/1 Georgia,serif; color:var(--cyan); }
    .stamp span { color:var(--muted); font-size:12px; letter-spacing:.08em; text-transform:uppercase; }
    .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:0 0 22px; }
    .metric,.chart-card,.sector-card,.method { border:1px solid var(--line); background:var(--panel); box-shadow:0 18px 50px rgba(0,0,0,.18); backdrop-filter:blur(10px); }
    .metric { padding:20px 22px; }
    .metric .value { font:700 32px/1 Georgia,serif; }
    .metric .label { margin-top:7px; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.09em; }
    .charts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
    .chart-card { padding:25px; }
    .chart-card:first-child,.chart-card.wide { grid-column:1/-1; }
    .chart-card header { display:flex; justify-content:space-between; gap:18px; align-items:start; margin-bottom:24px; }
    h2 { margin:0; font:700 25px/1.1 Georgia,serif; }
    .sample { color:var(--muted); font-size:12px; white-space:nowrap; }
    .bars { display:grid; gap:17px; }
    .bar-label { display:flex; justify-content:space-between; gap:18px; margin-bottom:7px; font-size:13px; }
    .bar-label span:last-child { color:#dffaff; font-weight:800; }
    .bar-track { height:10px; overflow:hidden; border-radius:20px; background:rgba(255,255,255,.065); }
    .bar-fill { width:var(--bar-width); height:100%; border-radius:inherit; background:var(--bar-color); box-shadow:0 0 18px color-mix(in srgb,var(--bar-color) 52%,transparent); }
    .bar-count { margin-top:5px; color:#728ba1; font-size:11px; text-align:right; }
    .chart-note { margin:22px 0 0; padding-top:18px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
    .sector-card { margin-top:18px; padding:25px; }
    .sector-head { display:flex; align-items:end; justify-content:space-between; gap:30px; }
    .sector-head p:last-child { max-width:570px; margin:0; color:var(--muted); }
    .sector-plot { height:190px; display:flex; gap:5px; align-items:end; margin-top:30px; padding-top:16px; border-bottom:1px solid rgba(255,255,255,.17); background:repeating-linear-gradient(to top,transparent 0,transparent 44px,rgba(255,255,255,.055) 45px); }
    .sector-bar { position:relative; flex:1; min-width:3px; height:var(--height); background:linear-gradient(to top,#2563eb,var(--cyan)); border-radius:3px 3px 0 0; opacity:.82; transition:opacity .15s; }
    .sector-bar:hover { opacity:1; }
    .sector-bar span { display:none; }
    .axis { display:flex; justify-content:space-between; color:#70869a; font-size:10px; padding-top:8px; }
    .method { display:grid; grid-template-columns:auto 1fr; gap:18px; margin-top:18px; padding:22px 25px; }
    .method .badge { display:grid; place-items:center; width:38px; height:38px; border:1px solid rgba(103,232,249,.34); border-radius:50%; color:var(--cyan); font-weight:800; }
    .method p { margin:0; color:var(--muted); }
    .method strong { color:var(--ink); }
    details { margin-top:14px; color:#8da3b8; }
    summary { cursor:pointer; color:#b7cadd; }
    code { color:#a5f3fc; }
    footer { margin-top:25px; color:#61798e; font-size:11px; text-align:center; letter-spacing:.08em; text-transform:uppercase; }
    @media (max-width:780px) { main{width:min(100% - 24px,1180px);padding-top:38px}.hero{grid-template-columns:1fr}.stamp{justify-self:start}.metrics{grid-template-columns:repeat(2,1fr)}.charts{grid-template-columns:1fr}.chart-card:first-child,.chart-card.wide{grid-column:auto}.sector-head{align-items:start;flex-direction:column}.sector-plot{gap:2px}.method{grid-template-columns:1fr} }
    @media print { body{background:#07101c} main{padding:20px;width:100%}.chart-card,.metric,.sector-card,.method{break-inside:avoid}.sector-bar{print-color-adjust:exact} }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div><p class="kicker">Sector Intelligence Office · Statistical Brief 01</p><h1>Inhabited worlds,<br>by the numbers.</h1><p class="hero-copy">A deterministic survey of ${sectors.length} complete sectors generated by the SWN sector engine. Every percentage below describes the resulting inhabited worlds after all generation constraints are applied.</p></div>
    <aside class="stamp"><strong>${worlds.length.toLocaleString()}</strong><span>inhabited worlds surveyed</span></aside>
  </section>
  <section class="metrics">
    <div class="metric"><div class="value">${sectors.length}</div><div class="label">Sectors generated</div></div>
    <div class="metric"><div class="value">${totalSystems.toLocaleString()}</div><div class="label">Star systems</div></div>
    <div class="metric"><div class="value">${average.toFixed(1)}</div><div class="label">Worlds / sector</div></div>
    <div class="metric"><div class="value">${min}–${max}</div><div class="label">Observed range</div></div>
  </section>
  <div class="charts">
    ${barChart('Technology level', 'Civilizational capability', techCounts, ['0', '1', '2', '3', '4', '4.1', '5'], TECH_LABELS, worlds.length)}
    ${barChart('Population rank', 'Scale of settlement', populationCounts, ['1', '2', '3', '4', '5'], POPULATION_LABELS, worlds.length)}
    ${barChart('Habitability rating', 'Environmental suitability', habitabilityCounts, ['0', '1', '2', '3'], HABITABILITY_LABELS, worlds.length)}
    ${barChart('Habitability limiting factors', 'Tied for the lowest component rating · Hab 0–2 only', limiterCounts, ['star', 'atmosphere', 'temperature', 'biosphere', 'size', 'composition'], LIMITER_LABELS, limiterWorlds.length, { wide: true, note: `Hab 3 worlds are excluded because 3 is the maximum rating and therefore does not represent a meaningful limiting condition. Every factor tied at a remaining world’s minimum is counted, so a world can appear in more than one row and these percentages intentionally do not sum to 100%.` })}
  </div>
  <section class="sector-card">
    <div class="sector-head"><div><p class="eyebrow">Sample variation</p><h2>Inhabited worlds per sector</h2></div><p>Each column is one generated sector, in seed order. The variation reflects both the sector’s system count and the generator’s one-or-two inhabited worlds per system.</p></div>
    <div class="sector-plot" aria-label="Bar chart of inhabited world count for each of 50 sectors">${sectorBars}</div>
    <div class="axis"><span>Sector 01</span><span>Sector ${String(sectors.length).padStart(2, '0')}</span></div>
  </section>
  <section class="method"><div class="badge">i</div><div><p><strong>Method.</strong> Generated in unrestricted starting-world mode with seeds <code>stats-sector-001</code> through <code>stats-sector-${String(sectors.length).padStart(3, '0')}</code>. Habitability is the canonical final rating: the minimum of star, atmosphere, temperature, Terran biosphere, size, and bulk-composition ratings. Percentages count worlds—not inhabitants—and may differ from raw table odds because the generator rejects incompatible profiles.</p><details><summary>Show all sector seeds and counts</summary><p>${sectors.map((sector) => `${sector.seed}: ${sector.systems} systems / ${sector.inhabitedWorlds} inhabited worlds`).join('<br>')}</p></details></div></section>
  <footer>Generated from the repository’s canonical SWN sector engine · deterministic sample</footer>
</main>
</body>
</html>`;
}

const vite = await createServer({
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true },
});

try {
  const { generate } = await vite.ssrLoadModule('/src/generators/swn_sector/Generator/generate.ts');
  const { projectPlanet } = await vite.ssrLoadModule(
    '/src/generators/swn_sector/Projector/planet_projection.ts',
  );
  const { projectObjectSpatial } = await vite.ssrLoadModule(
    '/src/generators/swn_sector/Projector/object_spatial_projection.ts',
  );
  const {
    STAR_HABITABILITY,
    TEMPERATURE_HAB,
    TERRAN_BIOSPHERE_HAB,
    SIZE_HAB,
    BULK_COMPOSITION_HAB,
  } = await vite.ssrLoadModule('/src/generators/swn_sector/Shared/planet_interpretation.ts');
  const { resolveAtmosphere } = await vite.ssrLoadModule(
    '/src/generators/swn_sector/Shared/atmosphere_interpretation.ts',
  );
  const worlds: WorldRecord[] = [];
  const sectors: SectorSummary[] = [];

  for (let index = 1; index <= SECTOR_COUNT; index += 1) {
    const seed = `stats-sector-${String(index).padStart(3, '0')}`;
    const sector = generate({ seed }, 'UNRESTRICTED');
    let inhabitedWorlds = 0;
    for (const system of sector.Systems) {
      for (const object of system.Objects) {
        if (object.Kind !== 'Planet' || object.InhabitedInfo === false) continue;
        const projected = projectPlanet(sector, object.Id, { preview: 'gm' });
        const spatial = projectObjectSpatial(sector, object.Id);
        if (!projected || projected.habitabilityRating === null || !spatial)
          throw new Error(`Could not project inhabited world ${object.Id}`);
        const components: Record<string, number> = {
          star: STAR_HABITABILITY[system.Star.StarType],
          atmosphere: resolveAtmosphere(object.Atmosphere).HabRating,
          temperature: TEMPERATURE_HAB[spatial.temperature],
          biosphere: TERRAN_BIOSPHERE_HAB[object.InhabitedInfo.TerranBiosphere],
          size: SIZE_HAB[object.Size],
          composition: BULK_COMPOSITION_HAB[object.BulkComposition],
        };
        const minimum = Math.min(...Object.values(components));
        if (minimum !== projected.habitabilityRating)
          throw new Error(`Habitability component mismatch for ${object.Id}`);
        inhabitedWorlds += 1;
        worlds.push({
          sector: seed,
          techLevel: String(object.InhabitedInfo.TechLevel),
          population: String(object.InhabitedInfo.Population),
          habitability: String(projected.habitabilityRating),
          limitingFactors: Object.entries(components)
            .filter(([, rating]) => rating === minimum)
            .map(([factor]) => factor),
        });
      }
    }
    sectors.push({ seed, systems: sector.Systems.length, inhabitedWorlds });
  }

  await writeFile(OUTPUT_PATH, reportHtml(worlds, sectors), 'utf8');
  console.log(
    `Wrote ${OUTPUT_PATH} from ${sectors.length} sectors and ${worlds.length} inhabited worlds.`,
  );
} finally {
  await vite.close();
}
