Diagram of stellar regions

STAR--1---------2XXXXXXXX3--------4-----5 

0. Star 
1. Volcanic Starts
2. Volcanic Ends, Normal Range Starts
3. Normal range Ends, Cryogenic Starts
4. Cryogenic Ends 

For each star class, there are several lengths
width 0-1 - Too Close to Star, Celestial Objects cannot be placed here
width 1-2 - Extreme Heat Width
Width 2-3 - Normal Range Width
Width 3-4 - Extreme Cold Width
Width 4-5 - Further Distance to System Edge (Warp Zone). Celestial Objects cannot be placed here

The remaining non-cryo non-volcanic are divided evenly in the normal Range

## Formal placement rule

The values in `System_AU_Width.csv` are consecutive widths, not absolute AU
coordinates. For the selected star row, calculate:

```text
innerStart = FromStar
hotEnd = innerStart + ExtremeHotRange
normalEnd = hotEnd + NormalRange
coldEnd = normalEnd + ExtremeColdRange
systemEdge = coldEnd + ToSystemEdge
```

No object is placed at or inside `FromStar`, at or beyond `systemEdge`, or on
any temperature-band endpoint. All generated AU values are uniform random
samples from their exclusive band. Direct-orbit objects must have distinct AU
values; a generator retries a sample if it collides.

| Temperature | Exclusive AU band |
| --- | --- |
| Volcanic | `(innerStart, hotEnd)` |
| Infernal, Arid, Equatorial, Subtropical, Mediterranean, Temperate (warm), Temperate, Temperate (chilly), Alpine, Boreal, Subarctic, Polar, Glacial | the 13 equal contiguous bands of `(hotEnd, normalEnd)`, in that hot-to-cold order |
| Cryogenic | `(normalEnd, coldEnd)` |

Every direct-orbit `SystemObject`, including an `IndependentStation`, uses this
rule. A moon retains its parent planet's star-relative AU as defined by the
moon rules.
