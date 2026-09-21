# Temperature Elaboration Spec

The merged generator uses one authoritative detailed temperature value. The
old thermal-orbit categories, orbital-position categories, and habitable-slot
system are removed. `TemperatureRank` and temperature-provided habitability
are derived from the selected temperature rather than independently generated,
serialized, or edited.

| Temperature | Temperature rank | Hab provided |
| --- | ---: | ---: |
| Cryogenic | 1 | 0 |
| Glacial | 2 | 1 |
| Polar | 3 | 1 |
| Subarctic | 4 | 2 |
| Boreal | 5 | 3 |
| Alpine | 6 | 3 |
| Temperate (chilly) | 7 | 3 |
| Temperate | 8 | 3 |
| Temperate (warm) | 9 | 3 |
| Mediterranean | 10 | 3 |
| Subtropical | 11 | 3 |
| Equatorial | 12 | 2 |
| Arid | 13 | 1 |
| Infernal | 14 | 1 |
| Volcanic | 15 | 0 |

Higher ranks are hotter. The three formerly identical Temperate table entries
become distinct chilly, baseline, and warm values. The habitability mapping
preserves the existing detailed temperature values; in particular, Glacial,
Polar, Arid, and Infernal provide one Hab.

The new temperature-to-AU calculator uses star information and the detailed
temperature rank directly. Among planets orbiting the same star, hotter
direct-orbit planets are closer and colder direct-orbit planets are farther
away. Equal-temperature direct-orbit planets receive distinct, non-colliding
distances. The calculation scales distances appropriately for the star type.

Moons do not receive an independent temperature or AU calculation. A moon has
the same temperature and star-relative AU as its parent planet; moon-to-planet
distance remains outside the model, while its angle is retained for
presentation.
