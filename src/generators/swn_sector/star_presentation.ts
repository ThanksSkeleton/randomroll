import type { CSSProperties } from 'react';
import type { StarType } from './merged_schema';

export type StarColor =
  'light-blue' | 'yellow-white' | 'yellow' | 'orange' | 'red' | 'white' | 'blue' | 'black';

export type StarPresentation = {
  color: StarColor;
  size: number;
  recipe: 'a-type' | 'main' | 'giant' | 'white-dwarf' | 'neutron-star' | 'black-hole';
  core: string;
  glow: string;
  accent: string;
  rim: string;
  spikeScale?: number;
};

/** Relative visual sizes; 2.4 is the current Giant rendering baseline. */
export const GIANT_STAR_SIZE = 2.4;

export const STAR_PRESENTATION: Readonly<Record<StarType, StarPresentation>> = {
  'A-type': {
    color: 'light-blue',
    size: 2.1,
    recipe: 'a-type',
    core: '#bde4f0',
    glow: '#82e2ff',
    accent: '#00c3ff',
    rim: '#82e2ff',
  },
  'F-type': {
    color: 'yellow-white',
    size: 1.9,
    recipe: 'main',
    core: '#fffbed',
    glow: '#ffeeb0',
    accent: '#ffdc5c',
    rim: '#ffeeb0',
  },
  'G-type': {
    color: 'yellow',
    size: 1.6,
    recipe: 'main',
    core: '#fff1d1',
    glow: '#ffd36e',
    accent: '#ffc53d',
    rim: '#ffd36e',
  },
  'K-type': {
    color: 'orange',
    size: 1.4,
    recipe: 'main',
    core: '#ffdeb0',
    glow: '#ffbb5c',
    accent: '#ffa930',
    rim: '#ffbb5c',
  },
  'M-type': {
    color: 'red',
    size: 1.2,
    recipe: 'main',
    core: '#b54424',
    glow: '#cf4a25',
    accent: '#9c2b0c',
    rim: '#ff8563',
  },
  Giant: {
    color: 'red',
    size: GIANT_STAR_SIZE,
    recipe: 'giant',
    core: '#ff6542',
    glow: '#ff7657',
    accent: '#ff5630',
    rim: '#f5f5f5',
  },
  'White dwarf': {
    color: 'white',
    size: 1.2,
    recipe: 'white-dwarf',
    core: '#ffffff',
    glow: '#5cf7ff',
    accent: '#5cf7ff',
    rim: '#5cf7ff',
  },
  'Neutron star': {
    color: 'blue',
    size: 1.2,
    recipe: 'neutron-star',
    core: '#9c6bff',
    glow: '#b18aff',
    accent: '#3800a8',
    rim: '#b18aff',
    spikeScale: 0.54,
  },
  'Stellar-mass black hole': {
    color: 'black',
    size: 1.2,
    recipe: 'black-hole',
    core: '#000000',
    glow: '#850000',
    accent: '#c90000',
    rim: '#ff0000',
  },
};

export function starPresentation(starType: StarType): StarPresentation {
  return STAR_PRESENTATION[starType];
}

export function starPresentationClass(starType: StarType): string {
  const presentation = starPresentation(starType);
  return `star-symbol star-color-${presentation.color} star-recipe-${presentation.recipe}`;
}

export function starPresentationStyle(starType: StarType): CSSProperties {
  const presentation = starPresentation(starType);
  return {
    '--star-size-scale': String(presentation.size / GIANT_STAR_SIZE),
    '--star-core': presentation.core,
    '--star-glow': presentation.glow,
    '--star-accent': presentation.accent,
    '--star-rim': presentation.rim,
    '--star-spike-scale': String(presentation.spikeScale ?? 0.54),
    '--star-spike-width': `${126 * (presentation.spikeScale ?? 0.54)}%`,
  } as CSSProperties;
}
