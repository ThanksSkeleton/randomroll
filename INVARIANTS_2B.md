# Phase 1 Step 2b — Questions Raised by the Merged Schema

The merged schema can represent all of the situations below. This list does
not yet decide whether they are valid, invalid, or unusual but acceptable. It
is intended as a set of questions to answer before converting the answers into
invariants. The main acceptance criterion is whether a domain-founded rule can
be expressed as a deterministic unit test over the structured sector data.
Permitted incongruities require no explanation, paper trail, or generator note
inside the application. Any narrative resolution belongs in the user's
external narrative documents and is outside the generator's scope.

## Human Response's Meanings

General Response Meanings:
REJECT - Don't add a check for this.
ACCEPTNO - I agree, this should be impossible. Add a check to prevent this from happening.
REDUNDANT - Already covered by another check, including possibly the 2A checks.

Justification Shorthands: 
Soft science fiction permission : This is allowed by the generator. Any desired narrative resolution occurs outside the application and is not stored or validated. 
Too Vague, Narrative level stuff : This invariant is too vague or depends on narrative interpretation, so it is unsuitable for a structured-data unit test.
Too General / Generic : This invariant is of the spirit of "values assigned must be what was assigned" or other almost tautological or non-valuable invariants. 

Parking Lot Topics:
- Routes, including whether and how the player ship can occupy a route.
- Temperature, including the exact hot-to-cold ordering used across orbital distance.


## Sector and system map

- REJECT - REDUNDANT - A1 Is it possible that a sector contains no star systems?
- REJECT - REDUNDANT - A2 Is it possible that two star systems occupy the same hex on the sector map?
- REJECT - REDUNDANT - A3 Is it possible that a star system occupies a hex outside the intended sector map?
- REJECT - REDUNDANT - A4 Is it possible that a star system's hex uses a fractional rather than a whole-number position?
- REJECT - Not quite specific enough, and also see below on routes. A5 Is it possible that every star system is crowded into one small part of the sector while most of the map is empty?
- REJECT - REDUNDANT -A6 Is it possible that two systems have the same identity?
- REJECT - REDUNDANT - A7 Is it possible that two different selectable things anywhere in the sector have the same identity?
- ACCEPTNO - A8 Is it possible that a system has a star but no planets or other orbiting objects?
- ACCEPTNO - A9 Is it possible that two systems have indistinguishable procedural and display names even though they are different places?

## Orbital structure and parentage

- ACCEPTNO B1 Is it possible that an object says it directly orbits the star but has no distance from the star?
- REJECT AS PHRASED - Moons use the same star-relative AU as their parent planet. Moon-to-planet distance is treated as zero, while moons retain an angle for presentation. B2 Is it possible that a satellite has a distance recorded as though it directly orbited the star?
- ACCEPTNO B3 Is it possible that an orbital distance is negative, infinite, or otherwise not meaningful?
- ACCEPTNO B4 Is it possible that an orbital angle falls outside one complete circle?
- ELABORATE- SPECIAL - B5 Is it possible that two direct-orbit objects occupy exactly the same orbit without being described as co-orbital objects?
- REJECT - old slots system removed - presentation rather data bug - than B6 Is it possible that the order of objects in a system disagrees with their order by distance from the star?
- ACCEPTNO - B7 Is it possible that an object names a parent that does not exist?
- ACCEPTNO - B8 Is it possible that an object names a parent in a different star system?
- ACCEPTNO - B9 Is it possible that an object is its own parent?
- ACCEPTNO - B10 Is it possible that a chain of parent relationships forms a cycle?
- ACCEPTNO - B11 Is it possible that a moon or station ultimately has no path back to the system's star?
- ACCEPTNO - B12 Is it possible that an ordinary planet orbits an asteroid belt, gas cloud, or station?
- ACCEPTNO - B13 Is it possible that a diffuse object such as a belt or gas cloud is treated as a conventional satellite of a planet?
- ACCEPTNO B14 Is it possible that a system contains only satellites and no object directly orbiting its star?
- ACCEPTNO B15 Is it possible that a system has no usable outermost orbit from which to derive its warp boundary?

NEW INVARIANTS - Simplifications
B16 - Moons cannot have moons
B17 - Moons must be strictly smaller than their parents in size category
B18 - Planets have at most 2 moons
B19 - Planets and their Moons have the same temperature class
B20 - A moon has the same star-relative AU as its parent planet. Moon-to-planet distance is treated as zero, while the moon retains an orbital angle for presentation.

## Stars, planets, and physical conditions

- REJECT - REDUNDANT - C1 Is it possible that a star's recorded habitability disagrees with the habitability associated with its star type?
- PARKING LOT - TEMPERATURE - Proposed simplification: temperature class is equal or decreasing by AU orbit order; the exact ordering still needs discussion. C2 Is it possible that a planet close to its star is cryogenic while a more distant planet is infernal, with no stated reason for the reversal?
- REJECT - Redundant C2 covers it - C3 Is it possible that planets with the same star and nearly the same orbit have radically different temperatures without an atmospheric or artificial explanation?
- REJECT - Soft science fiction permission - C4 Is it possible that a lunar-sized planet retains an atmosphere more extreme than the setting expects such a small body to hold?
- ACCEPTNO - C5 Is it possible that a Jupiter-sized planet is made of ordinary rock or metal rather than gas?
- ACCEPTNO - C6 Is it possible that a Luna-, Mars-, Earth-, or Super-Earth-sized planet is made of Jovian or Neptunian gas?
- ACCEPTNO - C7 Is it possible that a Neptune-sized planet is labeled as Jovian gas, or a Jupiter-sized planet as Neptunian gas?
- ACCEPTNO - C8 Is it possible that a gas giant is described as having surface water?
- REJECT - Redundant-  C9 Is it possible that a planet with no atmosphere has exposed surface water?
- REJECT - Redundant - C10 Is it possible that a cryogenic or volcanic planet has exposed surface water?
- REJECT - REDUNDANT with 2A-28c - C11 Is it possible that a planet made primarily of water is described as having no surface water?
- REJECT - Soft science fiction permission - C12 Is it possible that a planet with no atmosphere has a significant native biosphere?
- REJECT - Soft science fiction permission - C13 Is it possible that a volcanic, corrosive world has a substantial biosphere without any indication of unusual or engineered life?
- REJECT - Soft science fiction permission - C14 Is it possible that a planet has a breathable atmosphere but no native or Terran biosphere capable of producing or maintaining it?
- REJECT - "Surface Water" indicates macroscopic lakes and oceans, desert planets with life are permissiable under this - C15 Is it possible that a planet has a rich biosphere despite having no water or other represented means to sustain it?
- REJECT - Yes, allowed. Ancient Aliens that left or died. - C16 Is it possible that an uninhabited planet has an engineered native biosphere, and if so, what engineered it?
- ACCEPTNO - Simplification: a planet is tidally locked if and only if it directly orbits an M-type star. Moon relationships do not count. - C17 Is it possible that a planet is marked as tidally locked regardless of its orbit or parent?
- REJECT - Only care about tidally locked to star, and non-m star rules are too complex for this level of detail. C18 Is it possible that a close satellite is not tidally locked to its parent?
- REJECT - REDUNDANT with the if-and-only-if rule in C17 - C19 Is it possible that a planet around an M-type star is not tidally locked even though the current generator assumes that all such planets are?

## Habitability and inhabited worlds

- ACCEPTNO - D1 Is it possible that a planet is inhabited even though the star cannot provide the habitability its population requires?
- REJECT - REDUNDANT with 2A-21b - D2 Is it possible that the recorded total habitability disagrees with the star and the planet's physical conditions?
- ACCEPTNO - D3 Is it possible that an inhabited planet's population requires more habitability than the planet provides?
- ACCEPTNO - Low technology requires higher natural habitability; the existing technology-to-required-habitability relationship applies. - D4 Is it possible that an inhabited planet's technology requires more habitability than the planet provides?
- REJECT - REDUNDANT with 2A-22c - D5 Is it possible that the Terran biosphere requires more habitability than the planet provides?
- REJECT - REDUNDANT with the derived total-habitability and population/technology habitability checks, provided their lookup tables encode lethal environments and the greater needs of low technology. - D6 Is it possible that a planet with lethal temperature and atmosphere supports a large population with technology too primitive to provide sealed habitats?
- REJECT - Redunant with D1? - D7 Is it possible that billions of inhabitants live at a neolithic or medieval technology level on a world that could not support them naturally?
- REJECT - Yeah, possible. "pretech demigods" trope - D8 Is it possible that fewer than five hundred people maintain surviving pretech infrastructure with no other population or automated support?
- REJECT - Biosphere/Atmosphere does not cover within facilities (algae farms, etc). -  D9 Is it possible that an inhabited planet has no Terran biosphere at all, and if so, what does its population eat and breathe?
- ACCEPTNO - D10 Is it possible that a Terran biosphere exists in environmental conditions where Terran life could not survive?
- REJECT - Soft Science Fiction Permission - D11 Is it possible that a native biosphere and a Terran biosphere coexist even when the atmosphere or ecology would make them mutually incompatible?
- ACCEPTNO - while speculatively possible, exclude from current generation as too complex -  D12 Is it possible that a gas giant is itself an inhabited world rather than having inhabited moons or stations?

## World tags and social facts

- REJECT - REDUNDANT with 2A-28d - E1 Is it possible that an Oceanic World or Seagoing Cities world has no surface water?
- ACCEPTNO - E2 Is it possible that a Desert World is primarily water-covered?
- REJECT - atmosphere covers standard atmosphere variants, seasonal effects, storms, pollen/viruses, etc may make sense - E3 Is it possible that a Bubble Cities world has an ordinary breathable atmosphere and no other reason for sealed cities?
- REJECT - Sci fi explanations / narrative justifications can exist and are not covered by the generator (solar shades, etc) - E4 Is it possible that a Night World is not tidally locked and has no other explanation for permanent darkness?
- REJECT - Soft Sci fi permission (antigrav, etc) - E5 Is it possible that a Flying Cities world has no atmosphere capable of supporting flight and no technology capable of overcoming that problem?
- ACCEPTNO - E6 Is it possible that a Heavy Industry, Major Spaceyard, or Post-Scarcity world has primitive technology?
- REJECT - Yeah, possible. "pretech demigods" trope - E7 Is it possible that a Regional Hegemon has fewer than five hundred inhabitants?
- ACCEPTNO - E8 Is it possible that an Outpost World has billions of inhabitants?
- ACCEPTNO - These tags describe current conditions, so Tomb World and Abandoned Colony cannot have high population. The exact high-population cutoff must be fixed during invariant decomposition. - E9 Is it possible that a Tomb World or Abandoned Colony has a thriving population?
- ACCEPTNO E10 Is it possible that a Trade Hub has no routes connecting its system to anywhere else?
- REJECT - Heavy Mining does not require entire worlds to be made of ore. - E11 Is it possible that a Heavy Mining world has no plausible planet, belt, or other resource-bearing location to mine?
- REJECT - REDUNDANT with 2A-16 - E12 Is it possible that two world tags impose incompatible requirements on atmosphere, biosphere, population, technology, water, or habitability?
- REJECT - REDUNDANT with 2A-13 - E13 Is it possible that the two tags on a world are identical?
- REJECT - Too Vague, Narrative level stuff - E14 Is it possible that a tag implies a kind of being or society that the rest of the generated world does not support?
- REJECT - Too Vague, Narrative level stuff - E15 Is it possible that descriptive intelligence contradicts the structured physical or social facts implied by a world tag?

## Points of interest and other celestial objects

- ACCEPTNO - F1 Is it possible that a point of interest names a parent that does not exist?
- ACCEPTNO - F2 Is it possible that a point of interest belongs to an object in another system?
- ACCEPTNO - F3 Is it possible that a point of interest names a star, system, route, ship, or another point of interest as its parent instead of a system object?
- ACCEPTNO - F4 Is it possible that a point of interest is attached directly to an inhabited planet even though the current generator forbids that?
- ACCEPTNO - F5 Is it possible that a point of interest is attached to a gas giant that has an inhabited moon, even though the current generator forbids that?
- ACCEPTNO - Requires a point-of-interest classification and host-compatibility lookup. - F6 Is it possible that a surface-based point of interest is placed on a gas giant?
- ACCEPTNO - Requires a point-of-interest classification and host-compatibility lookup. - F7 Is it possible that an open-air settlement is placed on a vacuum, corrosive, cryogenic, or volcanic world?
- REJECT - By definition, POI are exceptional and so settled colonies can only occur on planets that are otherwise uninhabited. - F8 Is it possible that a functioning inhabited point of interest is placed on a world recorded as uninhabited?
- ACCEPTNO - Requires an enumerated point-of-interest taxonomy and host-compatibility lookup. - F9 Is it possible that a point-of-interest type is blank, unknown, or incompatible with its parent object?
- ACCEPTNO - Set max to 3 per object - F10 Is it possible that a system has so many points of interest on one object that the generated layout or story becomes misleading?
- REJECT - vague - F11 Is it possible that an independent station has an invalid orbit or an implausible parent?
- ACCEPTNO - Requires explicit valid distance bands for these celestial-object types. - F12 Is it possible that an asteroid belt, Kuiper belt, or gas cloud appears at a distance that conflicts with what its name implies?

## Routes and travel

- ACCEPTNO, G1 Is it possible that a route connects a system to itself?
- ACCEPTNO, G2 Is it possible that a route endpoint names a system that does not exist?
- REJECT - REDUNDANT with G1 - G3 Is it possible that both endpoints of a route name the same system?
- ACCEPTNO, G4 Is it possible that two or more routes duplicate the same connection between the same pair of systems?
- ACCEPTNO, G5 Is it possible that a route's boundary angle falls outside one complete circle?
- ACCEPTNO - G6 Is it possible that several routes meet the same system at exactly the same boundary angle and visually overlap?
- REJECT - Too General - G7 Is it possible that a route endpoint cannot be placed because its system has no derivable warp boundary?
- ACCEPTNO G8 Is it possible that the route map leaves a system completely isolated?
- Reject - yes, possible - G9 Is it possible that the route map is divided into disconnected groups that the player ship can never travel between?
- SPLIT - AcceptNO, AcceptNo, Reject - G10 Is it possible that a Trade Hub, Regional Hegemon, or Major Spaceyard is isolated from all routes?
- REJECT - Vague - G11 Is it possible that the route geometry passes through unrelated systems or objects in a visually misleading way?
- REJECT - Mutation out of scope - G12 Is it possible that changing the outermost planet changes the warp boundary but leaves route endpoints or displayed route geometry stale?

## Player ship, identity, and information

- ACCEPTNO - H1 Is it possible that the player ship's current location does not exist?
- PARKING LOT - ROUTES - A route may be a valid location; the ship itself may not be its own location. The interaction with deriving a containing system remains unresolved. - H2 Is it possible that the player ship's current location is a route or the ship itself rather than a place it can occupy?
- PARKING LOT - ROUTES - This remains ACCEPTNO for ordinary system locations, but route locations need a decision about how their containing or departure system is determined. - H3 Is it possible that the ship's location exists but no containing star system can be determined for it?
- REJECT - REDUNDANT with G8 - H4 Is it possible that the ship starts in a system it cannot leave because the system has no routes?
- ACCEPTNO H5 Is it possible that an object's nice name is blank while the interface expects to display it?
- Reject - Generic/General -  H6 Is it possible that changing a nice name breaks a reference that should have depended only on identity?
- AcceptNO -  H7 Is it possible that two entities share a name in a way that makes player-facing choices ambiguous?
- REJECT - Permitted, partial info allowed. route can be narratively discovered without understanding remote system contents, or system scan of planet can be purchased without route or star.  -  H8 Is it possible that a hidden object is revealed indirectly because a visible route, point of interest, parent, or child names it?
- REJECT - Vague/Narrative - H9 Is it possible that basic scan information reveals cultural or GM-only knowledge?
- REJECT - Vague/Narrative - H10 Is it possible that a higher intelligence level contradicts rather than extends a lower intelligence level?
- REJECT - Vague/Narrative - H11 Is it possible that intelligence text describes a different atmosphere, population, technology, orbit, or parent than the structured data records?
- REJECT - Vague/Narrative - H12 Is it possible that a generated entity has no useful description at any visibility level?

## Generation, persistence, and editing

- Reject - Generic/General I1 Is it possible that the same seed produces different sectors when all other generation inputs are unchanged?
- Reject - Generic/General I2 Is it possible that the same seed appears to promise reproducibility even though generator version or unrecorded options change the result?
- Reject - Generic/General I3 Is it possible that two different generated sectors reuse the same supposedly stable identities?
- Reject - Generic/General I4 Is it possible that saving and loading a sector changes identities, references, the order of a world's two tags, or orbital relationships?
- Reject - Generic/General I5 Is it possible that rerolling one planet changes unrelated planets, routes, or names?
- Reject - Mutation out of scope - I6 Is it possible that editing or deleting a parent leaves orphaned satellites or points of interest?
- Reject - Mutation out of scope - I7 Is it possible that moving or deleting a system leaves broken routes or an invalid ship location?
- Reject - Mutation out of scope - I8 Is it possible that changing a planet's physical facts leaves its habitability, population, tags, or descriptive intelligence stale?
- Reject - Mutation out of scope - I9 Is it possible that a value derived from other facts is independently edited into disagreement with those facts?
- Reject - Vague/Narrative - I10 Is it possible that an unusual but intentional science-fiction exception is indistinguishable from an accidental contradiction because the schema has nowhere to explain it?
