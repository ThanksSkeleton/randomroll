import { buildXccSheet } from './populate_xcc_template';
import { default_build } from './xcc_impl';
import { buildSyntheticLongestXccCharacter } from './xcc_visual_fixtures';

const specimens: ReadonlyArray<{ seed: string | null; label: string }> = [
  { seed: null, label: 'Synthetic longest — combined layout stress' },
  { seed: 'race-0', label: 'No banner — Human non-Noble' },
  { seed: 'stripe-139', label: 'Noble banner — Human Nobility' },
  { seed: 'race-1', label: 'Nonhuman banner — Dwarf' },
  { seed: 'race-81', label: 'Nonhuman banner — Elf' },
  { seed: 'race-24', label: 'Nonhuman banner — Gnome' },
  { seed: 'race-57', label: 'Nonhuman banner — Half-Elf' },
  { seed: 'race-55', label: 'Nonhuman banner — Half-Orc' },
  { seed: 'race-18', label: 'Nonhuman banner — Halfling' },
];

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app element.');
}

for (const specimen of specimens) {
  const section = document.createElement('section');
  section.className = 'zoo-specimen';
  const specimenId = specimen.seed ?? 'synthetic-longest';
  section.dataset.seed = specimenId;

  const heading = document.createElement('h2');
  heading.textContent = `${specimen.label} · ${specimenId}`;

  const characters =
    specimen.seed === null
      ? [buildSyntheticLongestXccCharacter()]
      : default_build(specimen.seed).objects;
  section.append(heading, buildXccSheet(characters));
  app.append(section);
}

type NumericControl = {
  kind: 'numeric';
  group: string;
  label: string;
  property: string;
  min: number;
  max: number;
  step: number;
  unit: '' | 'px' | 'rem' | '%' | 'fr';
};

type ChoiceControl = {
  kind: 'choice';
  group: string;
  label: string;
  property: string;
  options: ReadonlyArray<{ label: string; value: string }>;
};

type ColorControl = {
  kind: 'color';
  group: string;
  label: string;
  property: string;
};

type ToggleControl = {
  kind: 'toggle';
  group: string;
  label: string;
  property: string;
  enabledValue: string;
  disabledValue: string;
};

type CedalionControl = NumericControl | ChoiceControl | ColorControl | ToggleControl;

const textAlignmentOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
] as const;

const elementAlignmentOptions = [
  { label: 'Left', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'end' },
] as const;

const rowAlignmentOptions = [
  { label: 'Baseline', value: 'baseline' },
  { label: 'Top', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'end' },
] as const;

const verticalColumnAlignmentOptions = [
  { label: 'Stretch (current)', value: 'stretch' },
  { label: 'Top', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'Bottom', value: 'end' },
] as const;

const portraitShapeOptions = [
  { label: 'Square', value: '0rem' },
  { label: 'Rounded', value: '1.5rem' },
] as const;

const controls: CedalionControl[] = [
  {
    kind: 'numeric',
    group: 'Sheet',
    label: 'Interior padding — top',
    property: '--xcc-sheet-padding-top',
    min: 0,
    max: 8,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Sheet',
    label: 'Interior padding — right',
    property: '--xcc-sheet-padding-right',
    min: 0,
    max: 8,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Sheet',
    label: 'Interior padding — bottom',
    property: '--xcc-sheet-padding-bottom',
    min: 0,
    max: 8,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Sheet',
    label: 'Interior padding — left',
    property: '--xcc-sheet-padding-left',
    min: 0,
    max: 8,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Font sizes',
    label: 'XCrawl logo font size',
    property: '--xcc-logo-name-font-size',
    min: 0.5,
    max: 8,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Font sizes',
    label: 'Spotlight subtitle font size',
    property: '--xcc-logo-subtitle-font-size',
    min: 0.35,
    max: 6,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Font sizes',
    label: 'Other banner text size',
    property: '--identity-stripe-font-size',
    min: 0.25,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Font sizes',
    label: 'Halfling / Half-Orc banner text size',
    property: '--identity-stripe-long-label-font-size',
    min: 0.25,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Logo',
    label: 'Bottom margin below logo',
    property: '--xcc-logo-margin-bottom',
    min: -10,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'choice',
    group: 'Alignment',
    label: 'All sheet text alignment',
    property: '--xcc-text-align',
    options: textAlignmentOptions,
  },
  {
    kind: 'choice',
    group: 'Alignment',
    label: 'Logo horizontal alignment',
    property: '--xcc-logo-horizontal-alignment',
    options: elementAlignmentOptions,
  },
  {
    kind: 'choice',
    group: 'Alignment',
    label: 'Portrait horizontal alignment',
    property: '--xcc-portrait-horizontal-alignment',
    options: elementAlignmentOptions,
  },
  {
    kind: 'choice',
    group: 'Alignment',
    label: 'Banner label horizontal alignment',
    property: '--identity-stripe-label-horizontal-alignment',
    options: elementAlignmentOptions,
  },
  {
    kind: 'numeric',
    group: 'Portrait',
    label: 'Portrait border width',
    property: '--xcc-portrait-border-width',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'choice',
    group: 'Portrait',
    label: 'Portrait border shape',
    property: '--xcc-portrait-border-radius',
    options: portraitShapeOptions,
  },
  {
    kind: 'numeric',
    group: 'Banner geometry',
    label: 'Banner bottom offset',
    property: '--identity-stripe-bottom',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Banner geometry',
    label: 'Banner left offset',
    property: '--identity-stripe-left',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Banner geometry',
    label: 'Banner width',
    property: '--identity-stripe-width',
    min: 10,
    max: 500,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Banner geometry',
    label: 'Banner height',
    property: '--identity-stripe-height',
    min: 0.25,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'numeric',
    group: 'Bio',
    label: 'Bio font size',
    property: '--xcc-bio-font-size',
    min: 0.25,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Bio',
    label: 'Name font size',
    property: '--xcc-name-font-size',
    min: 0.5,
    max: 10,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'choice',
    group: 'Bio',
    label: 'Label/value vertical alignment',
    property: '--xcc-bio-row-vertical-alignment',
    options: rowAlignmentOptions,
  },
  {
    kind: 'numeric',
    group: 'Bio',
    label: 'Gap within label/value pairs',
    property: '--xcc-bio-column-gap',
    min: 0,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Bio',
    label: 'Gap between bio rows',
    property: '--xcc-bio-row-gap',
    min: 0,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'numeric',
    group: 'Stats',
    label: 'Stats font size',
    property: '--xcc-stats-font-size',
    min: 0.25,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Stats',
    label: 'Vertical gap between stat rows',
    property: '--xcc-stats-row-gap',
    min: 0,
    max: 10,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'choice',
    group: 'Stats',
    label: 'Base stats column vertical alignment',
    property: '--xcc-base-stats-vertical-alignment',
    options: verticalColumnAlignmentOptions,
  },
  {
    kind: 'choice',
    group: 'Stats',
    label: 'Secondary stats column vertical alignment',
    property: '--xcc-secondary-stats-vertical-alignment',
    options: verticalColumnAlignmentOptions,
  },
  {
    kind: 'choice',
    group: 'Stats',
    label: 'Cells within each stats row',
    property: '--xcc-stats-row-vertical-alignment',
    options: rowAlignmentOptions,
  },
  {
    kind: 'numeric',
    group: 'Stats',
    label: 'Gap between base/secondary columns',
    property: '--xcc-stats-column-gap',
    min: 0,
    max: 20,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Stats',
    label: 'Gap inside base-stat columns',
    property: '--xcc-base-stat-column-gap',
    min: 0,
    max: 10,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Stats',
    label: 'Gap inside secondary-stat columns',
    property: '--xcc-secondary-stat-column-gap',
    min: 0,
    max: 10,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'numeric',
    group: 'Weapon / Armor',
    label: 'Weapon/armor font size',
    property: '--xcc-weapon-armor-font-size',
    min: 0.25,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'choice',
    group: 'Weapon / Armor',
    label: 'Cells within each weapon/armor row',
    property: '--xcc-weapon-armor-row-vertical-alignment',
    options: rowAlignmentOptions,
  },
  {
    kind: 'numeric',
    group: 'Weapon / Armor',
    label: 'Gap within/between label/value pairs',
    property: '--xcc-weapon-armor-column-gap',
    min: 0,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Weapon / Armor',
    label: 'Gap between weapon/armor rows',
    property: '--xcc-weapon-armor-row-gap',
    min: 0,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'color',
    group: 'Divider styling',
    label: 'Shared divider color',
    property: '--xcc-divider-color',
  },

  {
    kind: 'toggle',
    group: 'Divider — XCrawl / Spotlight',
    label: 'Show divider',
    property: '--xcc-divider-logo-name-subtitle-display',
    enabledValue: 'block',
    disabledValue: 'none',
  },
  {
    kind: 'numeric',
    group: 'Divider — XCrawl / Spotlight',
    label: 'Width',
    property: '--xcc-divider-logo-name-subtitle-width',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — XCrawl / Spotlight',
    label: 'Height',
    property: '--xcc-divider-logo-name-subtitle-height',
    min: 0,
    max: 300,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Divider — XCrawl / Spotlight',
    label: 'Left margin',
    property: '--xcc-divider-logo-name-subtitle-margin-left',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — XCrawl / Spotlight',
    label: 'Right margin',
    property: '--xcc-divider-logo-name-subtitle-margin-right',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'toggle',
    group: 'Divider — Logo / Bio',
    label: 'Show divider',
    property: '--xcc-divider-logo-bio-display',
    enabledValue: 'block',
    disabledValue: 'none',
  },
  {
    kind: 'numeric',
    group: 'Divider — Logo / Bio',
    label: 'Width',
    property: '--xcc-divider-logo-bio-width',
    min: 0,
    max: 300,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Divider — Logo / Bio',
    label: 'Height',
    property: '--xcc-divider-logo-bio-height',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Logo / Bio',
    label: 'Top margin',
    property: '--xcc-divider-logo-bio-margin-top',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Logo / Bio',
    label: 'Bottom margin',
    property: '--xcc-divider-logo-bio-margin-bottom',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'toggle',
    group: 'Divider — Bio / Stats',
    label: 'Show divider',
    property: '--xcc-divider-bio-stats-display',
    enabledValue: 'block',
    disabledValue: 'none',
  },
  {
    kind: 'numeric',
    group: 'Divider — Bio / Stats',
    label: 'Width',
    property: '--xcc-divider-bio-stats-width',
    min: 0,
    max: 300,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Divider — Bio / Stats',
    label: 'Height',
    property: '--xcc-divider-bio-stats-height',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Bio / Stats',
    label: 'Top margin',
    property: '--xcc-divider-bio-stats-margin-top',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Bio / Stats',
    label: 'Bottom margin',
    property: '--xcc-divider-bio-stats-margin-bottom',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'toggle',
    group: 'Divider — Stats Columns',
    label: 'Show divider',
    property: '--xcc-divider-stats-columns-display',
    enabledValue: 'block',
    disabledValue: 'none',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats Columns',
    label: 'Width',
    property: '--xcc-divider-stats-columns-width',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats Columns',
    label: 'Height',
    property: '--xcc-divider-stats-columns-height',
    min: 0,
    max: 300,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats Columns',
    label: 'Left margin',
    property: '--xcc-divider-stats-columns-margin-left',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats Columns',
    label: 'Right margin',
    property: '--xcc-divider-stats-columns-margin-right',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'toggle',
    group: 'Divider — Stats / Weapon-Armor',
    label: 'Show divider',
    property: '--xcc-divider-stats-weapon-armor-display',
    enabledValue: 'block',
    disabledValue: 'none',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats / Weapon-Armor',
    label: 'Width',
    property: '--xcc-divider-stats-weapon-armor-width',
    min: 0,
    max: 300,
    step: 1,
    unit: '%',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats / Weapon-Armor',
    label: 'Height',
    property: '--xcc-divider-stats-weapon-armor-height',
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats / Weapon-Armor',
    label: 'Top margin',
    property: '--xcc-divider-stats-weapon-armor-margin-top',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },
  {
    kind: 'numeric',
    group: 'Divider — Stats / Weapon-Armor',
    label: 'Bottom margin',
    property: '--xcc-divider-stats-weapon-armor-margin-bottom',
    min: -15,
    max: 15,
    step: 0.01,
    unit: 'rem',
  },

  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Dwarf banner',
    property: '--stripe-dwarf',
  },
  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Elf banner',
    property: '--stripe-elf',
  },
  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Gnome banner',
    property: '--stripe-gnome',
  },
  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Half-Elf banner',
    property: '--stripe-half-elf',
  },
  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Half-Orc banner',
    property: '--stripe-half-orc',
  },
  {
    kind: 'color',
    group: 'Banner colors — Nonhuman',
    label: 'Halfling banner',
    property: '--stripe-halfling',
  },
];

type D1TextCategory = {
  id: 'logo' | 'yellow' | 'white' | 'nonhuman-stripe' | 'noble-stripe';
  group: string;
};

const d1TextCategories: readonly D1TextCategory[] = [
  {
    id: 'logo',
    group: 'Artistic Text — Logo',
  },
  {
    id: 'yellow',
    group: 'Artistic Text — Yellow',
  },
  {
    id: 'white',
    group: 'Artistic Text — White',
  },
  {
    id: 'nonhuman-stripe',
    group: 'Artistic Text — Nonhuman Banner',
  },
  {
    id: 'noble-stripe',
    group: 'Artistic Text — Noble Banner',
  },
] as const;

function d1Property(category: D1TextCategory, suffix: string): string {
  return `--xcc-${category.id}-d1-${suffix}`;
}

for (const category of d1TextCategories) {
  controls.push(
    {
      kind: 'color',
      group: category.group,
      label: 'Face color',
      property: d1Property(category, 'face'),
    },
    {
      kind: 'color',
      group: category.group,
      label: 'Surround edge color',
      property: d1Property(category, 'edge-color'),
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Surround edge thickness',
      property: d1Property(category, 'edge-thickness'),
      min: 0,
      max: 8,
      step: 0.25,
      unit: 'px',
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Shadow iterations',
      property: d1Property(category, 'iterations'),
      min: 0,
      max: 32,
      step: 1,
      unit: '',
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Horizontal step per iteration',
      property: d1Property(category, 'x-step'),
      min: -8,
      max: 12,
      step: 0.05,
      unit: 'px',
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Vertical step per iteration',
      property: d1Property(category, 'y-step'),
      min: -8,
      max: 12,
      step: 0.05,
      unit: 'px',
    },
    {
      kind: 'color',
      group: category.group,
      label: 'Near shadow color',
      property: d1Property(category, 'near-color'),
    },
    {
      kind: 'color',
      group: category.group,
      label: 'Far shadow color',
      property: d1Property(category, 'far-color'),
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Color transition',
      property: d1Property(category, 'transition'),
      min: 0,
      max: 1,
      step: 0.01,
      unit: '',
    },
    {
      kind: 'numeric',
      group: category.group,
      label: 'Near-color hold',
      property: d1Property(category, 'near-hold'),
      min: 0,
      max: 32,
      step: 1,
      unit: '',
    },
  );
}

controls.push(
  {
    kind: 'color',
    group: 'Artistic Portrait Frame',
    label: 'Frame color',
    property: '--xcc-portrait-frame-d1-border-color',
  },
  {
    kind: 'numeric',
    group: 'Artistic Portrait Frame',
    label: 'Shadow iterations',
    property: '--xcc-portrait-frame-d1-iterations',
    min: 0,
    max: 32,
    step: 1,
    unit: '',
  },
  {
    kind: 'numeric',
    group: 'Artistic Portrait Frame',
    label: 'Horizontal step per iteration',
    property: '--xcc-portrait-frame-d1-x-step',
    min: -8,
    max: 12,
    step: 0.05,
    unit: 'px',
  },
  {
    kind: 'numeric',
    group: 'Artistic Portrait Frame',
    label: 'Vertical step per iteration',
    property: '--xcc-portrait-frame-d1-y-step',
    min: -8,
    max: 12,
    step: 0.05,
    unit: 'px',
  },
  {
    kind: 'color',
    group: 'Artistic Portrait Frame',
    label: 'Near shadow color',
    property: '--xcc-portrait-frame-d1-near-color',
  },
  {
    kind: 'color',
    group: 'Artistic Portrait Frame',
    label: 'Far shadow color',
    property: '--xcc-portrait-frame-d1-far-color',
  },
  {
    kind: 'numeric',
    group: 'Artistic Portrait Frame',
    label: 'Color transition',
    property: '--xcc-portrait-frame-d1-transition',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
  },
  {
    kind: 'numeric',
    group: 'Artistic Portrait Frame',
    label: 'Near-color hold',
    property: '--xcc-portrait-frame-d1-near-hold',
    min: 0,
    max: 32,
    step: 1,
    unit: '',
  },
);

const liveState = new Map<string, string>();
const fieldResets: Array<() => void> = [];
const sheets = [...document.querySelectorAll<HTMLElement>('.xcc-sheet')];

if (sheets.length === 0) {
  throw new Error('Cedalion requires at least one rendered XCC sheet.');
}

const initialStyles = getComputedStyle(sheets[0]);
const initialState = new Map(
  controls.map((control): [string, string] => {
    const value = initialStyles.getPropertyValue(control.property).trim();
    if (!value) {
      throw new Error(`Missing stylesheet default for ${control.property}.`);
    }
    return [control.property, value];
  }),
);

function initialValue(control: CedalionControl): string {
  return initialState.get(control.property)!;
}

function parseHexColor(value: string): { r: number; g: number; b: number } {
  const hex = value.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function mixHexColors(from: string, to: string, amount: number): string {
  const start = parseHexColor(from);
  const end = parseHexColor(to);
  const mix = (a: number, b: number): number => Math.round(a + (b - a) * amount);
  return `rgb(${mix(start.r, end.r)}, ${mix(start.g, end.g)}, ${mix(start.b, end.b)})`;
}

function formatPixelValue(value: number): string {
  return String(Number(value.toFixed(4)));
}

function refreshD1Style(category: D1TextCategory): void {
  const properties = {
    face: d1Property(category, 'face'),
    edgeColor: d1Property(category, 'edge-color'),
    edgeThickness: d1Property(category, 'edge-thickness'),
    iterations: d1Property(category, 'iterations'),
    xStep: d1Property(category, 'x-step'),
    yStep: d1Property(category, 'y-step'),
    nearColor: d1Property(category, 'near-color'),
    farColor: d1Property(category, 'far-color'),
    transition: d1Property(category, 'transition'),
    nearHold: d1Property(category, 'near-hold'),
  };

  if (Object.values(properties).some((property) => !liveState.has(property))) {
    return;
  }

  const numericValue = (property: string): number =>
    Number.parseFloat(liveState.get(property) ?? '0');
  const face = liveState.get(properties.face)!;
  const edgeColor = liveState.get(properties.edgeColor)!;
  const edgeThickness = numericValue(properties.edgeThickness);
  const iterations = Math.max(0, Math.round(numericValue(properties.iterations)));
  const xStep = numericValue(properties.xStep);
  const yStep = numericValue(properties.yStep);
  const nearColor = liveState.get(properties.nearColor)!;
  const farColor = liveState.get(properties.farColor)!;
  const transition = numericValue(properties.transition);
  const nearHold = Math.max(0, Math.round(numericValue(properties.nearHold)));
  const shadows: string[] = [];

  if (edgeThickness > 0) {
    for (const [x, y] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      shadows.push(
        `${formatPixelValue(x * edgeThickness)}px ${formatPixelValue(y * edgeThickness)}px 0 ${edgeColor}`,
      );
    }
  }

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    let colorAmount = 0;
    if (iteration > nearHold) {
      const rawAmount = (iteration - nearHold) / Math.max(1, iterations - nearHold);
      if (transition <= 0) {
        colorAmount = 1;
      } else if (transition >= 1) {
        colorAmount = rawAmount >= 1 ? 1 : 0;
      } else {
        const gamma = Math.log(0.5) / Math.log(Math.max(0.001, transition));
        colorAmount = Math.pow(rawAmount, gamma);
      }
    }

    const color = mixHexColors(nearColor, farColor, Math.min(1, Math.max(0, colorAmount)));
    shadows.push(
      `${formatPixelValue(xStep * iteration)}px ${formatPixelValue(yStep * iteration)}px 0 ${color}`,
    );
  }

  for (const sheet of sheets) {
    sheet.style.setProperty(`--xcc-${category.id}-face-color`, face);
    sheet.style.setProperty(`--xcc-${category.id}-text-shadow`, shadows.join(', '));
  }
}

function refreshPortraitFrameD1Style(): void {
  const properties = {
    borderColor: '--xcc-portrait-frame-d1-border-color',
    iterations: '--xcc-portrait-frame-d1-iterations',
    xStep: '--xcc-portrait-frame-d1-x-step',
    yStep: '--xcc-portrait-frame-d1-y-step',
    nearColor: '--xcc-portrait-frame-d1-near-color',
    farColor: '--xcc-portrait-frame-d1-far-color',
    transition: '--xcc-portrait-frame-d1-transition',
    nearHold: '--xcc-portrait-frame-d1-near-hold',
  } as const;

  if (Object.values(properties).some((property) => !liveState.has(property))) {
    return;
  }

  const numericValue = (property: string): number =>
    Number.parseFloat(liveState.get(property) ?? '0');
  const borderColor = liveState.get(properties.borderColor)!;
  const iterations = Math.max(0, Math.round(numericValue(properties.iterations)));
  const xStep = numericValue(properties.xStep);
  const yStep = numericValue(properties.yStep);
  const nearColor = liveState.get(properties.nearColor)!;
  const farColor = liveState.get(properties.farColor)!;
  const transition = numericValue(properties.transition);
  const nearHold = Math.max(0, Math.round(numericValue(properties.nearHold)));
  const shadows: string[] = [];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    let colorAmount = 0;
    if (iteration > nearHold) {
      const rawAmount = (iteration - nearHold) / Math.max(1, iterations - nearHold);
      if (transition <= 0) {
        colorAmount = 1;
      } else if (transition >= 1) {
        colorAmount = rawAmount >= 1 ? 1 : 0;
      } else {
        const gamma = Math.log(0.5) / Math.log(Math.max(0.001, transition));
        colorAmount = Math.pow(rawAmount, gamma);
      }
    }

    const color = mixHexColors(nearColor, farColor, Math.min(1, Math.max(0, colorAmount)));
    shadows.push(
      `${formatPixelValue(xStep * iteration)}px ${formatPixelValue(yStep * iteration)}px 0 0 ${color}`,
    );
  }

  for (const sheet of sheets) {
    sheet.style.setProperty('--xcc-portrait-border-color', borderColor);
    sheet.style.setProperty(
      '--xcc-portrait-frame-box-shadow',
      shadows.length > 0 ? shadows.join(', ') : 'none',
    );
  }
}

function refreshD1Styles(): void {
  for (const category of d1TextCategories) refreshD1Style(category);
  refreshPortraitFrameD1Style();
}

const panel = document.createElement('aside');
panel.className = 'cedalion-panel';
panel.setAttribute('aria-label', 'Temporary Cedalion tuning controls');

const panelHeader = document.createElement('div');
panelHeader.className = 'cedalion-panel-header';

const panelTitle = document.createElement('h2');
panelTitle.textContent = 'Cedalion — temporary controls';

const panelDescription = document.createElement('p');
panelDescription.textContent = 'Live state (read-only; copy manually):';

const stateBox = document.createElement('textarea');
stateBox.className = 'cedalion-state';
stateBox.readOnly = true;
stateBox.setAttribute('aria-label', 'Complete Cedalion live state JSON');

const resetAll = document.createElement('button');
resetAll.className = 'cedalion-reset-all';
resetAll.type = 'button';
resetAll.textContent = 'Reset entire panel';

panelHeader.append(panelTitle, panelDescription, stateBox, resetAll);

const controlsContainer = document.createElement('div');
controlsContainer.className = 'cedalion-controls';

function createSupercategory(name: string): {
  details: HTMLDetailsElement;
  content: HTMLDivElement;
} {
  const details = document.createElement('details');
  details.className = 'cedalion-supercategory';

  const summary = document.createElement('summary');
  summary.textContent = name;

  const content = document.createElement('div');
  content.className = 'cedalion-supercategory-content';
  details.append(summary, content);
  controlsContainer.append(details);
  return { details, content };
}

const globalSupercategory = createSupercategory('Global / Meta');
const sectionsSupercategory = createSupercategory('Sections');
const globalCategories = new Map<string, HTMLDivElement>();
const localizedSections = new Map<string, HTMLDivElement>();
const globalGroupNames = new Set(['Font sizes', 'Alignment', 'Divider styling']);

function updateStateBox(): void {
  stateBox.value = JSON.stringify(Object.fromEntries(liveState), null, 2);
}

function applyProperty(property: string, value: string): void {
  for (const sheet of sheets) {
    sheet.style.setProperty(property, value);
  }
  liveState.set(property, value);
  refreshD1Styles();
  updateStateBox();
}

function getControlContainer(name: string): HTMLElement {
  if (globalGroupNames.has(name)) {
    const existing = globalCategories.get(name);
    if (existing) return existing;

    const category = document.createElement('details');
    category.className = 'cedalion-category';
    const summary = document.createElement('summary');
    summary.textContent = name;
    const settings = document.createElement('div');
    settings.className = 'cedalion-category-settings';
    category.append(summary, settings);
    globalSupercategory.content.append(category);
    globalCategories.set(name, settings);
    return settings;
  }

  const existing = localizedSections.get(name);
  if (existing) return existing;

  const section = document.createElement('details');
  section.className = 'cedalion-section';
  const summary = document.createElement('summary');
  summary.textContent = name;
  const settings = document.createElement('div');
  settings.className = 'cedalion-section-settings';
  section.append(summary, settings);
  sectionsSupercategory.content.append(section);
  localizedSections.set(name, settings);
  return settings;
}

controls.forEach((control, index) => {
  const field = document.createElement('div');
  field.className = 'cedalion-field';

  const label = document.createElement('label');
  const inputId = `cedalion-${index}`;
  label.htmlFor = inputId;
  label.textContent = `${control.label} (${control.property})`;

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  reset.setAttribute('aria-label', `Reset ${control.label}`);

  field.append(label);

  if (control.kind === 'numeric') {
    const defaultValue = Number.parseFloat(initialValue(control));
    const range = document.createElement('input');
    range.id = inputId;
    range.type = 'range';
    range.min = String(control.min);
    range.max = String(control.max);
    range.step = String(control.step);

    const exact = document.createElement('input');
    exact.type = 'number';
    exact.min = String(control.min);
    exact.max = String(control.max);
    exact.step = String(control.step);
    exact.setAttribute('aria-label', `${control.label} exact value`);

    const setValue = (value: number): void => {
      if (!Number.isFinite(value)) return;
      range.value = String(value);
      exact.value = String(value);
      applyProperty(control.property, `${value}${control.unit}`);
    };

    const applyExactValue = (): void => {
      const value = exact.valueAsNumber;
      if (!Number.isFinite(value) || !exact.validity.valid) return;

      range.value = String(value);
      applyProperty(control.property, `${value}${control.unit}`);
    };

    range.addEventListener('input', () => setValue(range.valueAsNumber));
    // Do not rewrite the number box on every keystroke. Intermediate values
    // such as "1." are temporarily invalid, but must remain editable so the
    // user can finish typing a fractional value such as "1.25".
    exact.addEventListener('input', applyExactValue);
    exact.addEventListener('change', () => {
      if (exact.validity.valid) {
        applyExactValue();
      } else {
        exact.value = range.value;
      }
    });
    reset.addEventListener('click', () => setValue(defaultValue));
    fieldResets.push(() => setValue(defaultValue));
    field.append(range, exact, reset);
    setValue(defaultValue);
  } else if (control.kind === 'choice') {
    const defaultValue = initialValue(control);
    const select = document.createElement('select');
    select.id = inputId;
    for (const optionDefinition of control.options) {
      const option = document.createElement('option');
      option.value = optionDefinition.value;
      option.textContent = optionDefinition.label;
      select.append(option);
    }

    const setValue = (value: string): void => {
      select.value = value;
      applyProperty(control.property, value);
    };

    select.addEventListener('change', () => setValue(select.value));
    reset.addEventListener('click', () => setValue(defaultValue));
    fieldResets.push(() => setValue(defaultValue));
    field.append(select, reset);
    setValue(defaultValue);
  } else if (control.kind === 'color') {
    const defaultValue = initialValue(control);
    const color = document.createElement('input');
    color.id = inputId;
    color.type = 'color';

    const setValue = (value: string): void => {
      color.value = value;
      applyProperty(control.property, value);
    };

    color.addEventListener('input', () => setValue(color.value));
    reset.addEventListener('click', () => setValue(defaultValue));
    fieldResets.push(() => setValue(defaultValue));
    field.append(color, reset);
    setValue(defaultValue);
  } else {
    const defaultValue = initialValue(control) === control.enabledValue;
    const toggle = document.createElement('input');
    toggle.id = inputId;
    toggle.type = 'checkbox';

    const setValue = (value: boolean): void => {
      toggle.checked = value;
      applyProperty(control.property, value ? control.enabledValue : control.disabledValue);
    };

    toggle.addEventListener('change', () => setValue(toggle.checked));
    reset.addEventListener('click', () => setValue(defaultValue));
    fieldResets.push(() => setValue(defaultValue));
    field.append(toggle, reset);
    setValue(defaultValue);
  }

  getControlContainer(control.group).append(field);
});

resetAll.addEventListener('click', () => {
  const confirmed = window.confirm('Reset every Cedalion setting to its baked default?');
  if (!confirmed) return;

  for (const reset of fieldResets) reset();
});

panel.append(panelHeader, controlsContainer);
document.body.append(panel);
