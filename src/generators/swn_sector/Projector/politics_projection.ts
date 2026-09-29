import type { Sector, StarSystem, SystemObject } from '../BaseDTO/merged_schema';
import type {
  ConquestDisplayDTO,
  PoliticalClaimsDisplayDTO,
  PolityDisplayDTO,
} from '../DisplayDTO/dto';
import { capabilityFor } from '../Helpers/Domain/politics_interpretation';

export function projectPolity(sector: Sector, id: string): PolityDisplayDTO | undefined {
  const polity = sector.Polities.find((candidate) => candidate.Id === id);
  if (!polity) return undefined;
  const home = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Id === polity.HomeworldId,
  );
  if (!home || home.Kind !== 'Planet' || home.InhabitedInfo === false) return undefined;
  const capability = capabilityFor(home.InhabitedInfo.TechLevel, home.InhabitedInfo.Population);
  return {
    id: polity.Id,
    homeworldId: polity.HomeworldId,
    NiceName: polity.NiceName,
    Flag: { ...polity.Flag },
    attack: capability.Attack,
    defense: capability.Defense,
    projection: capability.Projection,
  };
}

export function projectClaims(
  sector: Sector,
  object: SystemObject | StarSystem,
): PoliticalClaimsDisplayDTO | undefined {
  const ids =
    'Objects' in object
      ? [...new Set(object.Objects.flatMap((item) => item.ClaimedByPolityIds))].sort((a, b) => {
          const left = sector.Polities.find((polity) => polity.Id === a)?.NiceName ?? a;
          const right = sector.Polities.find((polity) => polity.Id === b)?.NiceName ?? b;
          return left.localeCompare(right) || a.localeCompare(b);
        })
      : [...object.ClaimedByPolityIds];
  const claimants = ids.map((id) => projectPolity(sector, id));
  if (claimants.some((polity) => !polity)) return undefined;
  const present = claimants as PolityDisplayDTO[];
  return {
    id: object.Id,
    claimantIds: ids,
    claimants: present,
    count: ids.length,
    stockText: `ClaimedBy: ${present.length ? present.map((polity) => polity.NiceName).join(', ') : 'None'}`,
  };
}

export function projectConquest(sector: Sector, id: string): ConquestDisplayDTO | undefined {
  const event = sector.ConquestEvents.find((candidate) => candidate.Id === id);
  if (!event) return undefined;
  const attacker = projectPolity(sector, event.AttackerPolityId);
  const defender = projectPolity(sector, event.DefenderPolityId);
  const target = sector.Systems.flatMap((system) => system.Objects).find(
    (object) => object.Id === event.TargetWorldId,
  );
  if (
    !attacker ||
    !defender ||
    !target ||
    target.Kind !== 'Planet' ||
    target.InhabitedInfo === false ||
    defender.homeworldId !== target.Id
  )
    return undefined;
  const outcome = event.Attack > event.Defense ? 'CONQUEST' : 'DEFENSE';
  return {
    id: event.Id,
    attacker,
    defender,
    targetWorldId: target.Id,
    targetName: target.NiceName,
    routeDistance: event.RouteDistance,
    attack: event.Attack,
    defense: event.Defense,
    outcome,
    explanation: `${attacker.NiceName} attacked ${defender.NiceName} at ${target.NiceName} across ${event.RouteDistance} route hops. Attack ${event.Attack} versus defense ${event.Defense}: ${outcome}.`,
  };
}
