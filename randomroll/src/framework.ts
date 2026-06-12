export type ExportFormat<TObject> = {
  name: string;
  seed: string;
  generated_on: string;
  guid: string;
  column_names: string[];
  flattened: string[][];
  objects: TObject[];
};

export type DisplayFormat = "ui" | "csv" | "json" | "flat";

export type Generator<TObject> = (seed: string) => ExportFormat<TObject>;

export type RandomRollPageConfig<TObject> = {
  generate: Generator<TObject>;
  renderObjectsForUi?: (objects: TObject[]) => string;
};

export function startRandomRollPage<TObject>(
  config: RandomRollPageConfig<TObject>,
): void {
  function render(): void {
    const app = document.querySelector<HTMLDivElement>("#app");

    if (!app) {
      throw new Error("Missing #app element.");
    }

    app.replaceChildren();

    const seed = ensureSeedInUrl();
    const format = getFormatFromUrl();
    const exportData = config.generate(seed);

    if (format === "csv") {
      renderExportTextPage(app, exportCsv(exportData));
      return;
    }

    if (format === "json") {
      renderExportTextPage(app, exportFullAsJson(exportData));
      return;
    }

    if (format === "flat") {
      renderExportTextPage(app, exportFlat(exportData));
      return;
    }

    renderMainPage(app, exportData, config, render);
  }

  window.addEventListener("popstate", render);
  render();
}

function renderMainPage<TObject>(
  app: HTMLElement,
  exportData: ExportFormat<TObject>,
  config: RandomRollPageConfig<TObject>,
  rerender: () => void,
): void {
  const topBar = document.createElement("div");

  const rerollAll = document.createElement("button");
  rerollAll.textContent = "Reroll All";
  rerollAll.addEventListener("click", () => {
    setSeedInUrl(randomSeed());
    rerender();
  });

  const toClipboard = document.createElement("button");
  toClipboard.textContent = "To Clipboard";
  toClipboard.addEventListener("click", () => {
    // Placeholder.
    console.log("To Clipboard placeholder");
  });

  const csv = document.createElement("button");
  csv.textContent = "CSV";
  csv.addEventListener("click", () => {
    setFormatInUrl("csv");
    rerender();
  });

  const json = document.createElement("button");
  json.textContent = "JSON";
  json.addEventListener("click", () => {
    setFormatInUrl("json");
    rerender();
  });

  const flat = document.createElement("button");
  flat.textContent = "FLAT";
  flat.addEventListener("click", () => {
    setFormatInUrl("flat");
    rerender();
  });

  topBar.append(rerollAll, toClipboard, csv, json, flat);

  const seedLine = document.createElement("p");
  seedLine.textContent = `Seed: ${exportData.seed}`;

  const textarea = document.createElement("textarea");
  textarea.readOnly = true;
  textarea.rows = 30;
  textarea.cols = 100;
  textarea.value = config.renderObjectsForUi
    ? config.renderObjectsForUi(exportData.objects)
    : JSON.stringify(exportData.objects, null, 2);

  app.append(topBar, seedLine, textarea);
}

function renderExportTextPage(app: HTMLElement, text: string): void {
  // No top bar on export pages.

  const pre = document.createElement("pre");
  pre.textContent = text;

  app.appendChild(pre);
}

function getUrl(): URL {
  return new URL(window.location.href);
}

function ensureSeedInUrl(): string {
  const url = getUrl();
  const existingSeed = url.searchParams.get("seed");

  if (existingSeed && existingSeed.trim() !== "") {
    return existingSeed;
  }

  const seed = randomSeed();
  url.searchParams.set("seed", seed);

  window.history.replaceState({}, "", url.toString());

  return seed;
}

function getFormatFromUrl(): DisplayFormat {
  const url = getUrl();
  const format = url.searchParams.get("format");

  if (format === "csv") return "csv";
  if (format === "json") return "json";
  if (format === "flat") return "flat";

  return "ui";
}

function setSeedInUrl(seed: string): void {
  const url = getUrl();

  url.searchParams.set("seed", seed);
  url.searchParams.delete("format");

  window.history.pushState({}, "", url.toString());
}

function setFormatInUrl(format: DisplayFormat): void {
  const url = getUrl();

  if (format === "ui") {
    url.searchParams.delete("format");
  } else {
    url.searchParams.set("format", format);
  }

  window.history.pushState({}, "", url.toString());
}

function randomSeed(length = 5): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";

  for (let i = 0; i < length; i++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }

  return output;
}

function exportFullAsJson<TObject>(
  exportData: ExportFormat<TObject>,
): string {
  return JSON.stringify(exportData, null, 2);
}

function exportFlat<TObject>(
  exportData: ExportFormat<TObject>,
): string {
  return exportData.flattened
    .map(row => row.join("\t"))
    .join("\n");
}

function exportCsv<TObject>(
  exportData: ExportFormat<TObject>,
): string {
  const rows = [
    exportData.column_names,
    ...exportData.flattened,
  ];

  return rows
    .map(row => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function escapeCsvCell(value: string): string {
  const mustQuote =
    value.includes(",") ||
    value.includes("\"") ||
    value.includes("\n") ||
    value.includes("\r");

  if (!mustQuote) {
    return value;
  }

  return `"${value.replaceAll("\"", "\"\"")}"`;
}

import seedrandom from "seedrandom";

export function BuildExportFormat<TObject>(name: string, seed: string, col_names: string[], flattened_input: string[][], data_object: TObject[]) : ExportFormat<TObject> 
{
    return {
        name: name,
        seed: seed,
        generated_on: new Date().toString(),
        guid: crypto.randomUUID(),
        column_names: col_names,
        flattened: flattened_input,
        objects: data_object
    }
}

export type SingletonTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    entries: string[];
  };
};

export type MultiColumnTable = {
  version: string;
  name: string;
  label?: string;
  table: {
    columns: string[];
    rows: string[][];
  };
};

export function random_single(rng: seedrandom.PRNG, data:string[]) : string 
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}

export function random_multi(rng: seedrandom.PRNG, data:string[][]) : string[]
{
    let len = data.length;
    if (len == 0) { throw Error("No Data"); }
    let index = Math.floor(rng() * len);
    return data[index];
}