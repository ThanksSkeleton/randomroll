import type { Population, TechLevel } from '../BaseDTO/merged_schema';
import rawCapabilities from '../Data/Raw/Details/capabilities.json';

export interface Capability {
  Attack: number;
  Defense: number;
  /** Maximum route hops over which this polity can project force. */
  Projection: number;
  /** Maximum direct hex distance over which this polity can project force. */
  ProjectionHexDistance: number;
}

const CAPABILITIES = rawCapabilities.capabilities as unknown as Record<
  TechLevel,
  Record<Population, Capability>
>;

export function capabilityFor(techLevel: TechLevel, population: Population): Capability {
  return CAPABILITIES[techLevel][population];
}
