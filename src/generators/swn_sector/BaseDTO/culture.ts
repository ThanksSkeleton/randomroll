import type { WorldTag } from './merged_schema';

export type SwnCultureGender = 'Male' | 'Female';
export type SwnCulturePrompt = { prompt: string; sourceTag: WorldTag };
export type SectorCulturePrompt = Pick<SwnCulturePrompt, 'prompt'>;
export type SwnCultureTaggedComponent = {
  prompts: [SwnCulturePrompt, SwnCulturePrompt];
};
export type SwnCultureNamedComponent = SwnCultureTaggedComponent & {
  name: string;
  gender: SwnCultureGender;
};

export type SwnCulture = {
  worldTags: [WorldTag, WorldTag];
  culturalTemplate: string;
  homeworld: string;
  adventureComponents: {
    enemy: SwnCultureNamedComponent;
    friend: SwnCultureNamedComponent;
    complication: SwnCultureTaggedComponent;
    thing: SwnCultureTaggedComponent;
    place: SwnCultureTaggedComponent & { placeName: string };
  };
  pcCaresAbout: { category: string; type: string; commoditySize: string | null };
  biggestConflict: { category: string; details: string };
  outsiderOpinion: string;
  lawEnforcement: {
    amount: string;
    style: string;
    specialLaw: string;
  };
  majorStarport: { type: string; name: string };
  planetaryDefenses: {
    orbitingStationStyle: string;
    orbitingStationType: string;
    tradeAndSmugglingEnforcementAmount: string;
    customsAndVisaEmphasis: string;
    patrolBoatPresence: string;
    planetaryGunTurrets: string;
  };
};

/** Selected facts only; tags and prompt sources come from the inhabited world. */
export type SectorCulture = Omit<SwnCulture, 'worldTags' | 'adventureComponents'> & {
  adventureComponents: {
    [K in keyof SwnCulture['adventureComponents']]: Omit<
      SwnCulture['adventureComponents'][K],
      'prompts'
    > & { prompts: [SectorCulturePrompt, SectorCulturePrompt] };
  };
};
