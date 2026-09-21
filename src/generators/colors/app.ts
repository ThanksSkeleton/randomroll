import {
  DEFAULT_PALETTE_CONSTANTS,
  buildPalettes,
  clamp,
  fmt,
  generate_palette,
  hexToOklch,
  oklchLabel,
  oklchToHex,
  wrapHue,
  type BuiltPalette,
  type DollRole,
  type PaletteConstants,
  type PaletteRecipe,
} from '../../colors.ts';

import female_skin from '../../assets/female_layers/skin.png';
import female_main from '../../assets/female_layers/main.png';
import female_support from '../../assets/female_layers/support.png';
import female_accent from '../../assets/female_layers/accent.png';
import female_hair from '../../assets/female_layers/hair.png';
import female_eyes from '../../assets/female_layers/eyes.png';
import female_power from '../../assets/female_layers/power.png';

import male_skin from '../../assets/male_layers/skin.png';
import male_main from '../../assets/male_layers/main.png';
import male_support from '../../assets/male_layers/support.png';
import male_accent from '../../assets/male_layers/accent.png';
import male_hair from '../../assets/male_layers/hair.png';
import male_eyes from '../../assets/male_layers/eyes.png';
import male_power from '../../assets/male_layers/power.png';

import palettes_json from '../../assets/palettes.json';

const paletteRecipes = palettes_json as PaletteRecipe[];

export type FigureKind = 'female' | 'male';
type LayerRole = DollRole;
type WebkitMaskStyle = CSSStyleDeclaration & { webkitMaskImage: string };
export type DollDefinition = { kind: FigureKind; label: string };

const LAYER_ORDER: LayerRole[] = ['skin', 'main', 'support', 'accent', 'hair', 'eyes', 'power'];
const PAPER_ROLES: Array<[DollRole, string]> = [
  ['main', 'Main Costume'],
  ['support', 'Supporting Costume'],
  ['accent', 'Accent / Highlight'],
  ['hair', 'Hair + Eyebrows'],
  ['eyes', 'Eyes'],
  ['skin', 'Skin'],
  ['power', 'Power / Stars'],
];
const DOLL_CATALOG: DollDefinition[] = [
  { kind: 'male', label: 'Male' },
  { kind: 'female', label: 'Female' },
];
const SCHOOL_UNIFORM_SWATCHES = [
  { label: 'Primary', key: 'schoolUniformPrimaryHex' },
  { label: 'Secondary', key: 'schoolUniformSecondaryHex' },
  { label: 'Highlight', key: 'schoolUniformHighlightHex' },
];
let activeIndex = 0;
let activeDollIndex = 0;
let suppressColorSync = false;
let currentDollPair: { school: BuiltPalette['doll']; full: BuiltPalette['doll'] } = {
  school: {},
  full: {},
};

// Finds a required DOM element by id and gives callers a typed element back.
const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing required element: #${id}`);
  return node as T;
};

// Reads a numeric input value, falling back when an optional control is absent or invalid.
const readNum = (id: string, fallback = 0): number => {
  const node = document.getElementById(id) as HTMLInputElement | null;
  if (!node) return fallback;
  const value = parseFloat(node.value);
  return Number.isFinite(value) ? value : fallback;
};

const femaleLayers: Record<LayerRole, string> = {
  skin: female_skin,
  main: female_main,
  support: female_support,
  accent: female_accent,
  hair: female_hair,
  eyes: female_eyes,
  power: female_power,
};

const maleLayers: Record<LayerRole, string> = {
  skin: male_skin,
  main: male_main,
  support: male_support,
  accent: male_accent,
  hair: male_hair,
  eyes: male_eyes,
  power: male_power,
};

const MASK_ASSETS: Record<FigureKind, Record<LayerRole, string>> = {
  female: femaleLayers,
  male: maleLayers,
};

// Collects all UI control values into the plain data object used by the palette engine.
function readConstants(): PaletteConstants {
  return {
    baseH: wrapHue(readNum('baseH', DEFAULT_PALETTE_CONSTANTS.baseH)),
    baseL: clamp(readNum('baseL', DEFAULT_PALETTE_CONSTANTS.baseL), 0, 100),
    baseC: Math.max(0, readNum('baseC1000', DEFAULT_PALETTE_CONSTANTS.baseC * 1000) / 1000),
    anaOffset: readNum('anaOffset', DEFAULT_PALETTE_CONSTANTS.anaOffset),
    compOffset: readNum('compOffset', DEFAULT_PALETTE_CONSTANTS.compOffset),
    rightAngleOffset: readNum('rightAngleOffset', DEFAULT_PALETTE_CONSTANTS.rightAngleOffset),
    splitOffset: readNum('splitOffset', DEFAULT_PALETTE_CONSTANTS.splitOffset),
    mainLightDelta: readNum('mainLightDelta', DEFAULT_PALETTE_CONSTANTS.mainLightDelta),
    mainDarkDelta: readNum('mainDarkDelta', DEFAULT_PALETTE_CONSTANTS.mainDarkDelta),
    mainDesat: readNum('mainDesatPct', DEFAULT_PALETTE_CONSTANTS.mainDesat * 100) / 100,
    supportLightDelta: readNum('supportLightDelta', DEFAULT_PALETTE_CONSTANTS.supportLightDelta),
    supportDarkDelta: readNum('supportDarkDelta', DEFAULT_PALETTE_CONSTANTS.supportDarkDelta),
    supportDesat: readNum('supportDesatPct', DEFAULT_PALETTE_CONSTANTS.supportDesat * 100) / 100,
    highlightLightDelta: readNum(
      'highlightLightDelta',
      DEFAULT_PALETTE_CONSTANTS.highlightLightDelta,
    ),
    highlightDarkDelta: readNum('highlightDarkDelta', DEFAULT_PALETTE_CONSTANTS.highlightDarkDelta),
    highlightBoost:
      readNum('highlightBoostPct', DEFAULT_PALETTE_CONSTANTS.highlightBoost * 100) / 100,
    lOffWhiteLight: readNum('lOffWhiteLight', DEFAULT_PALETTE_CONSTANTS.lOffWhiteLight),
    lOffWhiteDark: readNum('lOffWhiteDark', DEFAULT_PALETTE_CONSTANTS.lOffWhiteDark),
    cOffWhite: readNum('cOffWhite1000', DEFAULT_PALETTE_CONSTANTS.cOffWhite * 1000) / 1000,
    lOffBlackLight: readNum('lOffBlackLight', DEFAULT_PALETTE_CONSTANTS.lOffBlackLight),
    lOffBlackDark: readNum('lOffBlackDark', DEFAULT_PALETTE_CONSTANTS.lOffBlackDark),
    cOffBlack: readNum('cOffBlack1000', DEFAULT_PALETTE_CONSTANTS.cOffBlack * 1000) / 1000,
    lPureWhite: readNum('lPureWhite', DEFAULT_PALETTE_CONSTANTS.lPureWhite),
    lPureLightGray: readNum('lPureLightGray', DEFAULT_PALETTE_CONSTANTS.lPureLightGray),
    lPureDarkGray: readNum('lPureDarkGray', DEFAULT_PALETTE_CONSTANTS.lPureDarkGray),
    lPureBlack: readNum('lPureBlack', DEFAULT_PALETTE_CONSTANTS.lPureBlack),
    skinHex:
      (document.getElementById('skinColor') as HTMLInputElement | null)?.value ??
      DEFAULT_PALETTE_CONSTANTS.skinHex,
    schoolUniformPrimaryHex:
      (document.getElementById('schoolUniformPrimaryColor') as HTMLInputElement | null)?.value ??
      DEFAULT_PALETTE_CONSTANTS.schoolUniformPrimaryHex,
    schoolUniformSecondaryHex:
      (document.getElementById('schoolUniformSecondaryColor') as HTMLInputElement | null)?.value ??
      DEFAULT_PALETTE_CONSTANTS.schoolUniformSecondaryHex,
    schoolUniformHighlightHex:
      (document.getElementById('schoolUniformHighlightColor') as HTMLInputElement | null)?.value ??
      DEFAULT_PALETTE_CONSTANTS.schoolUniformHighlightHex,
  };
}

// Applies one mask image to an element using both standard and WebKit CSS properties.
function applyMask(node: HTMLElement, url: string): void {
  const value = `url("${url}")`;
  const style = node.style as WebkitMaskStyle;
  style.maskImage = value;
  style.webkitMaskImage = value;
}

// Creates one colored paper-doll layer whose shape comes from a mask image.
function makeLayer(role: DollRole, url: string): HTMLDivElement {
  const layer = document.createElement('div');
  layer.className = 'mask-layer';
  layer.dataset.role = role;
  layer.style.backgroundColor = `var(--role-${role})`;
  applyMask(layer, url);
  return layer;
}

// Clones the HTML template that defines the outer paper-doll element.
function cloneDollTemplate(): HTMLDivElement {
  const template = el<HTMLTemplateElement>('paperDollTemplate');
  const node = template.content.firstElementChild?.cloneNode(true) as HTMLDivElement | null;
  if (!node) throw new Error('Paper doll template must contain one div root.');
  node.innerHTML = '';
  return node;
}

// Stacks all body-part mask layers for one reusable paper-doll definition.
function makeFigure(doll: DollDefinition): HTMLDivElement {
  const stack = cloneDollTemplate();
  stack.ariaLabel = doll.label;
  const assets = MASK_ASSETS[doll.kind];
  for (const role of LAYER_ORDER) stack.appendChild(makeLayer(role, assets[role]));
  return stack;
}

// Wraps a painted doll with the small comparison label used only by this app's carousel.
function makeDollComparison(label: string, doll: HTMLDivElement): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'doll-comparison';
  const caption = document.createElement('div');
  caption.className = 'doll-comparison-label';
  caption.textContent = label;
  wrap.appendChild(doll);
  wrap.appendChild(caption);
  return wrap;
}

// Shows the active doll in a small carousel so new doll definitions can be added later.
function renderDollCarousel(dollPair: {
  school: BuiltPalette['doll'];
  full: BuiltPalette['doll'];
}): void {
  const root = el('paperRoot');
  const doll = DOLL_CATALOG[activeDollIndex];
  if (!doll) throw new Error('No paper dolls are available to render.');
  root.innerHTML = '';
  root.appendChild(makeDollComparison('Student Uniform', paintdoll(doll.kind, dollPair.school)));
  root.appendChild(makeDollComparison('Full Palette', paintdoll(doll.kind, dollPair.full)));
  el('dollCarouselLabel').textContent =
    `${doll.label} ${activeDollIndex + 1} of ${DOLL_CATALOG.length}`;
}

// Advances the doll carousel, wrapping around at either end.
function moveDollCarousel(delta: number): void {
  activeDollIndex = (activeDollIndex + delta + DOLL_CATALOG.length) % DOLL_CATALOG.length;
  renderDollCarousel(currentDollPair);
}

// Writes the active doll colors into CSS custom properties used by the mask layers.
function applyDollPalette(node: HTMLElement, doll: BuiltPalette['doll']): void {
  for (const [role] of PAPER_ROLES)
    node.style.setProperty(`--role-${role}`, doll[role] ?? 'transparent');
}

// Public helper: create one painted doll element without mounting it into the app carousel.
export function paintdoll(
  dolltype: FigureKind,
  palette: BuiltPalette | BuiltPalette['doll'],
): HTMLDivElement {
  const doll = DOLL_CATALOG.find((item) => item.kind === dolltype);
  if (!doll) throw new Error(`Unknown paper doll type: ${dolltype}`);
  const figure = makeFigure(doll);
  applyDollPalette(figure, 'doll' in palette ? palette.doll : palette);
  return figure;
}

export { generate_palette, generate_palette as generatePalette, paintdoll as paintDoll };

// Renders the clickable palette tiles and wires each tile to activate its palette.
function renderPaletteButtons(palettes: BuiltPalette[]): void {
  const root = el('paletteButtons');
  root.innerHTML = '';
  palettes.forEach((palette, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-button' + (index === activeIndex ? ' active' : '');
    button.dataset.index = String(index);
    const miniRoles: DollRole[] = ['main', 'support', 'accent', 'hair', 'eyes', 'power'];
    const mini = miniRoles
      .map(
        (role) =>
          `<span class="mini-swatch" title="${role} ${palette.doll[role] ?? 'transparent'}" style="background:${palette.doll[role] ?? 'transparent'}"></span>`,
      )
      .join('');
    button.innerHTML = `<div class="palette-button-title">${index + 1}. ${palette.name}</div><div class="mini-swatches">${mini}</div>`;
    button.addEventListener('click', () => {
      activeIndex = index;
      render();
    });
    root.appendChild(button);
  });
}
// Shows the active palette's important role mapping and every generated swatch.
function renderSwatches(palette: BuiltPalette): void {
  const root = el('swatchList');
  root.innerHTML = '';

  for (const color of palette.colors) {
    const row = document.createElement('div');
    row.className = 'swatch-row';

    row.innerHTML = `
      <div
        class="swatch"
        style="background: ${color.hex}"
      ></div>

      <div>
        <div class="swatch-title">
          ${color.role} — ${color.label}
        </div>

        <div class="swatch-meta">
          ${oklchLabel(color)} · HEX ${color.hex}
        </div>

        <div class="pill-row">
          <span class="pill">${color.group}</span>
          <span class="pill">${color.variant}</span>
        </div>
      </div>
    `;

    root.appendChild(row);
  }
}

// Lists the exact paper-doll role colors currently applied to the figure preview.
function renderPaperRoles(doll: BuiltPalette['doll']): void {
  const root = el('paperRoles');
  root.innerHTML = '';
  for (const [role, label] of PAPER_ROLES) {
    const value = doll[role] ?? 'transparent';
    const row = document.createElement('div');
    row.className = 'paper-role';
    row.innerHTML = `<span class="chip" style="background:${value}"></span><span><strong>${label}</strong><code>${role} ${value}</code></span>`;
    root.appendChild(row);
  }
}
// Shows the fixed school-uniform colors as read-only reference swatches.
function renderSchoolUniformReference(k: PaletteConstants): void {
  const root = el('schoolUniformReference');
  root.innerHTML = SCHOOL_UNIFORM_SWATCHES.map((color) => {
    const hex =
      k[
        color.key as keyof Pick<
          PaletteConstants,
          'schoolUniformPrimaryHex' | 'schoolUniformSecondaryHex' | 'schoolUniformHighlightHex'
        >
      ];
    return `<div class="paper-role"><span class="chip" style="background:${hex}"></span><span><strong>${color.label}</strong><code>${hex}</code></span></div>`;
  }).join('');
}
// Builds the copyable text report for the currently selected palette.
function paletteText(palette: BuiltPalette, k: PaletteConstants): string {
  const lines = [];
  lines.push(palette.name.toUpperCase());
  lines.push(palette.note);
  lines.push('');
  lines.push(
    `BASE: OKLCH H ${fmt(k.baseH)} L ${fmt(k.baseL)} C ${fmt(k.baseC, 4)} HEX ${oklchToHex(k.baseL, k.baseC, k.baseH)}`,
  );
  lines.push(`ANALOG 1: H ${fmt(wrapHue(k.baseH - k.anaOffset))}`);
  lines.push(`ANALOG 2: H ${fmt(wrapHue(k.baseH + k.anaOffset))}`);
  lines.push(`COMPLEMENT: H ${fmt(wrapHue(k.baseH + k.compOffset))}`);
  lines.push(`RIGHT ANGLE 1: H ${fmt(wrapHue(k.baseH + k.rightAngleOffset))}`);
  lines.push(`RIGHT ANGLE 2: H ${fmt(wrapHue(k.baseH - k.rightAngleOffset))}`);
  lines.push(`SPLIT COMPLEMENT 1: H ${fmt(wrapHue(k.baseH + k.compOffset - k.splitOffset))}`);
  lines.push(`SPLIT COMPLEMENT 2: H ${fmt(wrapHue(k.baseH + k.compOffset + k.splitOffset))}`);
  lines.push('');
  lines.push('ROLE MAPPING');
  const roleNames = {
    costumePrimary: 'Costume Primary',
    costumeSecondary: 'Costume Secondary',
    costumeAccent: 'Costume Accent',
    hair: 'Hair',
    eyes: 'Eyes',
    power: 'Power',
  };
  for (const [key, label] of Object.entries(roleNames)) {
    const imp = palette.important[key as keyof typeof roleNames];
    lines.push(`${label}: ${imp?.label ?? 'N/A'}`);
  }
  lines.push('');
  lines.push('COMPLETE PALETTE');
  for (const c of palette.colors) lines.push(`${c.role}: ${oklchLabel(c)} HEX ${c.hex}`);
  lines.push('');
  lines.push('PAPER DOLL PALETTE');
  for (const [role, label] of PAPER_ROLES)
    lines.push(`${role}: ${palette.doll[role] ?? 'transparent'} (${label})`);
  return lines.join('\n');
}
// Recomputes palettes from the controls and refreshes every dependent UI panel.
function render(syncBaseColor = true): void {
  const k = readConstants();
  if (syncBaseColor && !suppressColorSync)
    el<HTMLInputElement>('baseColor').value = oklchToHex(k.baseL, k.baseC, k.baseH);
  const palettes = buildPalettes(k, paletteRecipes);
  const schoolPalettes = buildPalettes(k, paletteRecipes, { schoolUniformOverride: true });
  activeIndex = clamp(activeIndex, 0, palettes.length - 1);
  const active = palettes[activeIndex];
  const schoolActive = schoolPalettes[activeIndex];
  if (!active || !schoolActive) throw new Error('No palettes are available to render.');
  currentDollPair = { school: schoolActive.doll, full: active.doll };
  renderPaletteButtons(palettes);
  el('activeTitle').textContent = `${activeIndex + 1}. ${active.name}`;
  el('activeNote').textContent = active.note;
  renderSchoolUniformReference(k);
  renderDollCarousel(currentDollPair);
  renderPaperRoles(active.doll);
  renderSwatches(active);
  el<HTMLTextAreaElement>('activeOutput').value = paletteText(active, k);
}
// Converts the color picker value back into OKLCH controls before rendering.
function syncBaseFromColorPicker(): void {
  suppressColorSync = true;
  const o = hexToOklch(el<HTMLInputElement>('baseColor').value);
  el<HTMLInputElement>('baseH').value = String(Math.round(o.H));
  el<HTMLInputElement>('baseL').value = String(Math.round(o.L100));
  el<HTMLInputElement>('baseC1000').value = String(Math.round(o.C * 1000));
  suppressColorSync = false;
  render(false);
}
function wireAppEvents(): void {
  el('baseColor').addEventListener('input', syncBaseFromColorPicker);
  // Re-renders when typed OKLCH base controls change.
  for (const id of ['baseH', 'baseL', 'baseC1000'])
    el(id).addEventListener('input', () => render(true));
  // Re-renders when any derived palette adjustment control changes.
  for (const node of Array.from(document.querySelectorAll('[data-render]'))) {
    node.addEventListener('input', () => render(true));
  }
  // Copies the active palette report, falling back to selection-based copy when needed.
  el('copyActive').addEventListener('click', async () => {
    const output = el<HTMLTextAreaElement>('activeOutput');
    const text = output.value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      output.select();
      document.execCommand('copy');
    }
  });
  el('prevDoll').addEventListener('click', () => moveDollCarousel(-1));
  el('nextDoll').addEventListener('click', () => moveDollCarousel(1));
}

// Loads data, creates the static preview DOM, and performs the first render.
async function init(): Promise<void> {
  wireAppEvents();
  render(true);
}
if (typeof document !== 'undefined' && document.getElementById('paperRoot')) void init();
