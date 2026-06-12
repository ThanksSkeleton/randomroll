import { build_sol_export } from './generators/SOL/SOL';

type Reroll = [number, number];

const NUM_ROWS = 10;
const SEED_LENGTH = 5;
const SEED_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

let seed = '';
let rerolls: Reroll[] = [];
let rows: string[][] = [];

const generateButton = document.querySelector<HTMLButtonElement>('#generate-button');
const debugOutput = document.querySelector<HTMLPreElement>('#debug-output');
const tableBody = document.querySelector<HTMLTableSectionElement>('#table-body');

if (!generateButton || !debugOutput || !tableBody) {
  throw new Error('Required DOM elements are missing.');
}

function createSeed(): string {
  let output = '';

  for (let i = 0; i < SEED_LENGTH; i++) {
    const index = Math.floor(Math.random() * SEED_CHARS.length);
    output += SEED_CHARS[index];
  }

  return output;
}

function updateUri(): void {
  const params = new URLSearchParams();

  if (seed !== '') {
    params.set('seed', seed);
  }

  // Decorative for now. No parsing/restoration yet.
  if (rerolls.length > 0) {
    params.set('reroll', JSON.stringify(rerolls));
  }

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query === '' ? '' : `?${query}`}`;

  window.history.pushState(null, '', nextUrl);
}

function regenerateRows(): void {
  rows = build_sol_export(seed, NUM_ROWS, rerolls, false).flattened;
}

function renderDebug(): void {
  debugOutput.textContent =
    `seed: ${seed}\n` +
    `rerolls: ${JSON.stringify(rerolls)}\n` +
    `build(${JSON.stringify(seed)}, ${NUM_ROWS}, ${JSON.stringify(rerolls)})`;
}

function renderTable(): void {
  tableBody.replaceChildren();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const tr = document.createElement('tr');

    tr.appendChild(createRerollableCell(row[0], rowIndex, 0));
    tr.appendChild(createRerollableCell(row[1], rowIndex, 1));
    tr.appendChild(createPlainCell(row[2]));

    tableBody.appendChild(tr);
  }
}

function createRerollableCell(
  value: string,
  rowIndex: number,
  colIndex: number,
): HTMLTableCellElement {
  const td = document.createElement('td');
  const valueSpan = document.createElement('span');
  const button = document.createElement('button');

  valueSpan.textContent = value;
  button.textContent = 'REROLL';

  button.addEventListener('click', () => {
    rerolls.push([rowIndex, colIndex]);
    updateUri();
    regenerateRows();
    render();
  });

  td.appendChild(valueSpan);
  td.appendChild(document.createTextNode(' '));
  td.appendChild(button);

  return td;
}

function createPlainCell(value: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = value;
  return td;
}

function render(): void {
  renderDebug();
  renderTable();
}

generateButton.addEventListener('click', () => {
  seed = createSeed();
  rerolls = [];
  updateUri();
  regenerateRows();
  render();
});