import {
  type RandomRollPageConfig,
  type ExportFormat,
  ensureSeedInUrl,
  getFormatFromUrl,
  renderExportTextPage,
  exportCsv,
  exportFullAsJson,
  exportFlat,
  setSeedInUrl,
  randomSeed,
  setFormatInUrl,
} from './framework';

export function startRandomRollPage<TObject>(config: RandomRollPageConfig<TObject>): void {
  function render(): void {
    const app = document.querySelector<HTMLDivElement>('#app');

    if (!app) {
      throw new Error('Missing #app element.');
    }

    app.replaceChildren();

    const seed = ensureSeedInUrl();
    const format = getFormatFromUrl();
    const exportData = config.generate(seed);

    if (format === 'csv') {
      renderExportTextPage(app, exportCsv(exportData));
      return;
    }

    if (format === 'json') {
      renderExportTextPage(app, exportFullAsJson(exportData));
      return;
    }

    if (format === 'flat') {
      renderExportTextPage(app, exportFlat(exportData));
      return;
    }

    renderMainPage(app, exportData, config, render);
  }

  window.addEventListener('popstate', render);
  render();
}

function renderMainPage<TObject>(
  app: HTMLElement,
  exportData: ExportFormat<TObject>,
  config: RandomRollPageConfig<TObject>,
  rerender: () => void,
): void {
  const topBar = document.createElement('div');

  const rerollAll = document.createElement('button');
  rerollAll.textContent = 'Reroll All';
  rerollAll.addEventListener('click', () => {
    setSeedInUrl(randomSeed());
    rerender();
  });

  const toClipboard = document.createElement('button');
  toClipboard.textContent = 'To Clipboard';
  toClipboard.addEventListener('click', () => {
    // Placeholder.
    console.log('To Clipboard placeholder');
  });

  const csv = document.createElement('button');
  csv.textContent = 'CSV';
  csv.addEventListener('click', () => {
    setFormatInUrl('csv');
    rerender();
  });

  const json = document.createElement('button');
  json.textContent = 'JSON';
  json.addEventListener('click', () => {
    setFormatInUrl('json');
    rerender();
  });

  const flat = document.createElement('button');
  flat.textContent = 'FLAT';
  flat.addEventListener('click', () => {
    setFormatInUrl('flat');
    rerender();
  });

  topBar.append(rerollAll, toClipboard, csv, json, flat);

  const seedLine = document.createElement('p');
  seedLine.textContent = `Seed: ${exportData.seed}`;

  app.append(topBar, seedLine, config.outputRenderer(exportData.objects));
}

export function debug_text_box<TObject>(inputs: TObject[]): HTMLElement {
  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.rows = 30;
  textarea.cols = 100;
  textarea.value = JSON.stringify(inputs, null, 2);
  return textarea;
}
