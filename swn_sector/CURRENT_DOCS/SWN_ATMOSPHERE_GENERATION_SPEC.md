# SWN Sector Atmosphere Generation Spec

## 1. Generation tables

### Atmosphere Class Distribution

| Atmosphere Class | Weight | Hab Rating |
|---|---:|---:|
| Vacuum | 4% | 0 |
| Corrosive | 4% | 0 |
| Toxic | 4% | 0 |
| Filter | 4% | 1 |
| Pressure | 4% | 2 |
| Flammable | 4% | 0 |
| Inert | 11% | 0 |
| Breathable | 65% | 3 |

The unrolled GasGiant and IceGiant template categories have Hab Rating 0.

These weights apply to each initial class roll. Compatibility checks can change the distribution of accepted inhabited worlds.

### Existing `swn_sector` Atmosphere Hab Ratings

These are all seven atmosphere values currently used by the sector generator. The table above gives the proposed ratings for its replacement classes.

| Current Atmosphere | Hab Rating |
|---|---:|
| Vacuum | 0 |
| Corrosive | 0 |
| Invasive | 0 |
| Corrosive+Invasive | 0 |
| Inert gas | 0 |
| Breathable: Thin/Thick | 2 |
| Breathable | 3 |

### Flammable Gas Table

Uniform choice.

| Gas | Name |
|---|---|
| H₂ | Hydrogen |
| CH₄ | Methane |
| O₂ | Oxygen |

### Corrosive Gas Table

Uniform choice.

| Gas | Name |
|---|---|
| SO₂ | Sulfur Dioxide |
| H₂S | Hydrogen Sulfide |
| HCl | Hydrogen Chloride |
| HF | Hydrogen Fluoride |
| O₃ | Ozone |
| NH₃ | Ammonia |

### Poison Table

Uniform choice.

| Gas | Name |
|---|---|
| CO₂ | Carbon Dioxide |
| CO | Carbon Monoxide |
| HCN | Hydrogen Cyanide |
| N₂O | Nitrous Oxide |
| CHCl₃ | Chloroform |
| CCl₂F₂ | Freon |

### Inert Gas Table

Uniform choice.

| Gas | Name |
|---|---|
| N₂ | Nitrogen |
| Ar | Argon |
| He | Helium |
| CF₄ | Carbon Tetrafluoride |
| SF₆ | Sulfur Hexafluoride |

### Breathable Background Gas Distribution

O₂ is added as the respiratory component.

| Background Gas | Weight |
|---|---:|
| N₂ | 75% |
| Ar | 10% |
| He | 5% |
| CF₄ | 5% |
| SF₆ | 5% |

### Pressure Distribution

Pressure atmospheres use an otherwise ordinary N₂/O₂ breathable mixture.

| Pressure Result | Weight |
|---|---:|
| Low Pressure | 50% |
| High Pressure | 50% |

### Pressure Thresholds

| Pressure State | Atmospheric Pressure |
|---|---:|
| Low Pressure | < 0.6 atm |
| Normal / Unaided Range | 0.6–3.9 atm |
| High Pressure | > 3.9 atm |

---

## 2. Generation Procedure

### Step 1: Roll Atmosphere Class

Roll on the Atmosphere Class Distribution.

The atmosphere class is the primary result. It describes the important human and environmental consequence of the atmosphere.

### Step 2: Resolve the Selected Class

#### Corrosive

Select uniformly from the Corrosive Gas Table.

The selected gas identifies the defining environmental hazard. It does **not** imply that the atmosphere is composed entirely or primarily of that gas.

The atmosphere is unsafe for humans and materially attacks exposed structures or equipment.

Do not also generate a background gas unless it becomes relevant for some separate purpose.

#### Toxic

Select uniformly from the Poison Table.

The selected poison identifies the defining atmospheric hazard. It does **not** imply that the atmosphere is composed entirely or primarily of that gas.

The atmosphere is not usefully breathable and requires an independent breathing supply, but it does not significantly attack ordinary structures.

Do not also generate a background gas.

#### Flammable

Select uniformly from the Flammable Gas Table.

The selected gas is the defining ignition hazard and fills the 99% major-gas share in the Flammable template below. Do not also generate a background gas.

The atmosphere is unsafe for humans and presents a fire or explosion hazard.

#### Filter

Assume an otherwise ordinary breathable N₂/O₂ atmosphere.

Select uniformly from the Poison Table.

The selected poison is present as a contaminant. The ambient atmosphere remains useful once the contaminant is removed.

A scrubber or filter system is sufficient. Any required pressure regulation is assumed to be included in that equipment and is not generated separately.

#### Pressure

Assume an otherwise ordinary breathable N₂/O₂ atmosphere.

Roll:

- 50% Low Pressure
- 50% High Pressure

No additional atmospheric chemistry is generated.

A pressure mask or pressure-regulated environment is required, but temporary failure is not assumed to have the same immediate consequence as exposure to a Toxic or Corrosive atmosphere.

#### Inert

Select uniformly from the Inert Gas Table.

The atmosphere is unbreathable but neither poisonous nor corrosive.

An independent breathing supply is required.

#### Breathable

Roll on the Breathable Background Gas Distribution.

### Step 3: Accept or reroll an inhabited-world profile

Generate world tags before the atmosphere, as the current sector generator does. For each inhabited-world profile attempt, roll a class from the weighted class table, then roll only that class's conditional subtable result: its selected gas or its Low/High pressure result. The class and subtable result form one atmosphere candidate. Generate the other profile fields and check the complete candidate against the existing world-tag, environmental Hab, population, technology, water, and other profile constraints.

If the profile is incompatible, discard the whole attempt, including its atmosphere class and conditional subtable result, and roll a new profile. Keep the class and subtable result together only when the profile is accepted. A gas choice does not bypass a class-level constraint. Apply `maxAtmospherePercentile` to the class using the revised class table's cumulative upper endpoint; the selected gas or pressure subtype does not change that class rank. Accepted-world class frequencies may therefore differ from the initial weights.

Pre-baked planet templates use their specified atmosphere outcomes and do not roll on the class or conditional subtables.

## 3. Raw data and Base DTO

The current `Planet.Atmosphere` is one string. Replace it with a structured atmosphere outcome in `BaseDTO/merged_schema.ts` so the selected class and its conditional result survive generation and projection.

Keep the class weights, gas and pressure subtables, gas catalog, Hab ratings, thresholds, and template compositions in `Data/Raw/`. The gas catalog defines each gas's chemical formula, long name, and gas category. The generator reads those tables and writes only the selected outcome to the Base DTO; it does not write roll weights or table rows to a planet.

The canonical shape is:

```ts
type AtmosphereCategory =
  | 'Vacuum' | 'Corrosive' | 'Toxic' | 'Filter' | 'Pressure'
  | 'Flammable' | 'Inert' | 'Breathable' | 'GasGiant' | 'IceGiant';
type GasCategory = 'Corrosive' | 'Toxic' | 'Inert' | 'Flammable';
type GasId = string; // Chemical formula identifying an entry in the raw gas catalog.
type Atmosphere =
  | { Category: 'Corrosive' | 'Toxic' | 'Filter' | 'Flammable' | 'Inert' | 'Breathable'; SelectedGas: GasId }
  | { Category: 'Pressure'; PressureResult: 'Low' | 'High' }
  | { Category: 'Vacuum' | 'GasGiant' | 'IceGiant' };
```

`SelectedGas` refers to the appropriate conditional table: corrosive gas, poison for Toxic and Filter, flammable gas, inert gas, or breathable background gas. Fixed planet templates provide their selected gas directly. A pressure result is stored only for the Pressure class.

Resolve `LongName`, `HabRating`, `Bar`, and `Gases: Array<{ Gas: Gas; Percent: number }>` deterministically from the Base DTO outcome and raw definitions for domain interpretation and display. `Gas` has `ChemicalFormula`, `LongName`, and `Category: GasCategory`. Pressure is numeric so the 0.5 and 4 bar templates remain representable. Projection reads the resolved values; it does not make new random selections.

### Atmosphere templates

Template gas percentages do not need to add up to 100%.

Vacuum:
0 Bar
<SIC: no gasses>

Breathable:
1 bar
79% [Inert Gas]
20% Oxygen

Inert:
1 bar
99% [Inert Gas]

Flammable:
1 bar
99% [Flammable Gas]

Pressure (Low):
.5 Bar
79% Nitrogen
21% Oxygen

Pressure (High):
4 Bar
79% Nitrogen
21% Oxygen

Corrosive:
1 Bar
75% Nitrogen
24% [Corrosive Gas]

Toxic:
1 Bar
75% Nitrogen
25% [Toxic Gas]

Filter:
1 Bar
69% Nitrogen
21% Oxygen
10% [Toxic Gas]

GasGiant:
10 Bar
90% Hydrogen
10% Helium

IceGiant: [Btw, I know this isn't realistic, but I want to add it]
4 Bar
75% Nitrogen
15% Methane
10% Hydrogen

In addition there are some precooked atmospheres to add to the default planets - these are NEVER rolled but are always pre-baked

Mercury: Use the Vacuum Template
Luna: Use the Vacuum Template
Venus: Use the Corrosive Template with HCL
Mars: Use the Inert Template with Nitrogen
Jovian: Use the GasGiant Template
Neptunian: Use the IceGiant Template
Titanian: Use the Flammable Template with Methane
Ioan: Use the Corrosive Template with SO2
Europan / Plutonic: Use the Inert Template with Nitrogen
