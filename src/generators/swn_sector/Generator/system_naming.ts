import type { StarSystem } from '../BaseDTO/merged_schema';

export function lowercaseRomanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`Invalid Roman numeral value ${value}`);
  const numerals: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let remaining = value;
  let result = '';
  for (const [amount, numeral] of numerals)
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  return result;
}

/** Rebuild generated suffix names while preserving entity identities and procedural names. */
export function applySystemNiceNames<T extends StarSystem>(system: T, niceName: string): T {
  const directObjects = system.Objects.filter((object) => object.Orbit.ParentObjectId === null);
  const directLetters = new Map(
    directObjects.map((object, index) => [object.Id, String.fromCharCode(65 + index)]),
  );
  const moonIndexes = new Map<string, number>();
  const objects = system.Objects.map((object) => {
    const objectPrefix =
      object.Kind === 'Planet' && object.InhabitedInfo !== false && object.Culture
        ? object.Culture.homeworld
        : niceName;
    if (object.Orbit.ParentObjectId !== null && object.Kind === 'Planet') {
      const parent = system.Objects.find(
        (candidate) => candidate.Id === object.Orbit.ParentObjectId,
      );
      const parentLetter = parent && directLetters.get(parent.Id);
      if (!parent || parent.Kind !== 'Planet' || !parentLetter)
        throw new Error(`Missing named parent for moon ${object.Id}`);
      const index = moonIndexes.get(parent.Id) ?? 0;
      moonIndexes.set(parent.Id, index + 1);
      return {
        ...object,
        NiceName: `${objectPrefix} ${parentLetter}${String.fromCharCode(97 + index)}`,
      };
    }
    const letter = directLetters.get(object.Id);
    if (!letter) throw new Error(`Missing direct-orbit name for ${object.Id}`);
    return {
      ...object,
      NiceName: `${objectPrefix} ${object.Kind === 'Planet' ? '' : 'X '}${letter}`,
    };
  });
  const poiIndexes = new Map<string, number>();
  const pointsOfInterest = system.PointsOfInterest.map((poi) => {
    const parent = objects.find((object) => object.Id === poi.ParentObjectId);
    if (!parent) throw new Error(`Missing POI parent ${poi.ParentObjectId}`);
    const index = (poiIndexes.get(parent.Id) ?? 0) + 1;
    poiIndexes.set(parent.Id, index);
    return { ...poi, NiceName: `${parent.NiceName}${lowercaseRomanNumeral(index)}:${poi.POIType}` };
  });
  return {
    ...system,
    NiceName: niceName,
    Star: { ...system.Star, NiceName: `${niceName} star` },
    Objects: objects,
    PointsOfInterest: pointsOfInterest,
  } as T;
}
