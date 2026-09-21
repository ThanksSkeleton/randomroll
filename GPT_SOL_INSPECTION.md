# Phase 1 Step 6 — Sol High Manual Inspection

## Verdict

The inspected sector is reproducible and passes the current invariant oracle.
The review found nine items. After product-owner review, two have been fixed,
two are tracked as non-blocking follow-ups, and the rest are accepted product
decisions or WONTFIX items.

The accepted POI-host-exhaustion WONTFIX remains documented in
`perf_exhaustive.md` and is not repeated below.

## Scope and evidence

- Inspected artifact:
  `temp/randomroll-stochastic-sector-3df34bc3-77ec-4326-a51e-c3b4d0056889.json`
- Seed: `stochastic-success-06bc752b-c574-408c-8ee4-7426ebae7676`
- Artifact shape: 22 systems, 29 inhabited planets, 27 routes, 54 portals,
  and 73 POIs.
- Regenerating the seed produced a deeply equal sector with no system retry.
- A deterministic 100-sector inspection sweep covered 2,489 systems and
  produced zero generation failures and zero current-oracle violations. It
  logged three retries, all caused by the accepted POI-host-exhaustion case.
- After the accepted changes, the focused SWN tests passed: 5 files and 29
  tests. `npx tsc --noEmit` and formatting checks also passed. The deterministic
  100-sector sweep was rerun with the Hab-0 fix and retained the same result:
  zero failures, zero violations, and only the three accepted POI retries.

## Findings and dispositions

### 1. Resolved — Hab-0 tag filtering removed valid population tags

`tagPairHasIntersection` capped the feasible population percentile at 9 when
star Hab was zero. The canonical population table gives both `Fewer than 500`
(percentiles 1–9) and `Fewer than a million inhabitants` (percentiles 10–31) a
Hab requirement of zero.

The solver now derives the maximum supported population percentile from the
population table and the star's Hab rating. A White dwarf with Hab 0 can
therefore use a tag such as `Cold War`, whose minimum population percentile is
10, together with the valid `Fewer than a million inhabitants` category.

A regression test covers forced tags `Cold War` + `Anarchists` on a Hab-0 White
dwarf.

Relevant files:

- `src/generators/swn_sector/generate_inhabited_planet.ts`
- `src/generators/swn_sector/generate_inhabited_planet.test.ts`
- `src/generators/swn_sector/tables.ts`

### 2. Resolved — Tomb World profiles no longer depend on a narrow lucky roll

The feasible forced pair `Tomb World` + `Abandoned Colony` failed for seed
`sol-profile-508` after all 100 profile attempts. It failed once in a
1,000-seed direct solver sweep.

The pair is hard because both tags require the rank-1 population, `Fewer than
500`, while Tomb World also caps environmental Hab at 1. The current builder
does not force those values before rolling:

- when current Hab is 0 or 1, population is selected from the two Hab-0
  categories, and `Fewer than 500` has only 9 of their 31 source-table weight;
- when current Hab is higher, the rank-1 population has an even smaller share
  of the available population weight;
- a Tomb World must also end with environmental Hab at most 1;
- environmental Hab 0 or 1 rules out primitive technology, so the independently
  rolled technology must be one of the postech/pretech categories whose Hab
  requirement is 0.

For `sol-profile-508`, the 100 rejections broke down as follows: 52 rolled the
wrong population, 40 failed a population, technology, or Terran-biosphere Hab
requirement, and 8 were too naturally habitable for Tomb World. None happened
to land in the valid intersection.

Tomb World now receives a targeted constructive path. Its physical choices are
restricted so final environmental Hab is at most 1, its population is selected
from `Fewer than 500`, and its technology is selected from modern postech or
better. Non-Tomb profiles retain their existing distributions.

A regression test now generates `sol-profile-508` with forced tags
`Tomb World` + `Abandoned Colony` and verifies all three restrictions.

### 3. Deferred — Stations do not consume the rolled extra-object target

Physical extras are filled to `extraTarget` before POIs are generated, and
each `Deep-space station` then appends an `IndependentStation`. Final counts
remain inside the hard two-through-seven invariant, but stations raise the
count above the original roll rather than consuming reserved slots.

In the inspected artifact this occurred in nine systems; for example, System
05 rolled two extras and finished with four because it has two stations.

The recent moon-aware accounting correctly counts an inhabited moon's
gas-giant parent. Station accounting is intentionally deferred and tracked in
`PHASE_1_FOLLOWUPS.md`.

### 4. WONTFIX — Station creation can leave placeholder BasicScan counts stale

The system `BasicScan` placeholder is assembled before stations are added, so
nine systems in the artifact show the pre-station object count. For example,
System 01 says `6 orbiting objects.` and serializes 8.

`BasicScan` is explicitly placeholder content for Phase 1 and will be replaced
in the UI track. No generator fix is planned. The Part 5 specification now
records that placeholder text is not authoritative derived data.

### 5. WONTFIX — The invariant oracle is permissive outside generated output

Mutation probes showed that the oracle does not reject every invalid enum,
does not verify star-type/Hab pairing or serialized object order, and does not
test full route-graph connectivity. An unknown star type can also reach a
lookup and throw rather than returning a schema violation.

These are accepted as minor oracle-hardening gaps. Generated sectors construct
the canonical values directly, and the route generator constructs a connected
backbone. No additional defensive validation is planned for Phase 1.

### 6. Accepted product decision — Extra-object and POI selection weights

The 60% planet, 20% asteroid belt, 10% gas cloud, and 10% Kuiper belt category
weights are intentional. POIs are intentionally selected from feasible
`(POI type, host)` pairs, so a type with more compatible hosts has more
selection outcomes.

`PART_5_IMPLEMENTATION_SPEC.md` now records both decisions. No generator change
is required.

### 7. Accepted/deferred — Fixed templates; uninhabited moons are low priority

Template variation is not a requirement. The fixed physical facts in
`planet_templates.ts` are the approved canonical interpretations of the legacy
archetypes. Part 5 has been updated to state the exact fixed mappings.

The generator does not turn uninhabited terrestrial extras into gas-planet
moons. That variety remains a low-priority follow-up in
`PHASE_1_FOLLOWUPS.md`; it does not block Phase 1.

### 8. WONTFIX — Intelligence text is placeholder content

The artifact's inhabited worlds currently place tag names in `CulturePartial`
and leave richer culture and GM tiers empty. This is acceptable placeholder
content and will be addressed, if needed, in the UI track.

Part 5 now documents that rich world-tag descriptions and prompts are deferred.
No Phase 1 generator change is planned.

### 9. WONTFIX — Routes use rectangular coordinate geometry

Route proximity uses Euclidean column/row distance, and portal bearings use
`atan2` over the raw coordinate delta. This is accepted for the current phase;
hex-layout-specific distance and bearing correction are not required.

Part 5 now documents the implemented coordinate convention.

## Accepted artifact observations

- System 09 has three inhabited Cryogenic planets around a neutron star. This
  is extreme but permissible: Hab 0 supports the two smallest population
  categories and postech.
- Fifteen of 29 inhabited planets have `TotalHab: 0`, and 22 of 29 have
  `Modern postech`. The current rules intentionally remain unchanged. A future
  balance review is tracked under “Habitability distributions” in
  `PHASE_1_FOLLOWUPS.md`.
- The handoff artifact happens to contain no moons. With 29 inhabited planets
  and a 10% moon roll this is unusual but plausible; the larger sweep measured
  a 10.18% inhabited-moon rate.

## Step 7 handoff

No findings require another Step 7 decision. All findings are resolved,
explicitly accepted, deferred as non-blocking follow-ups, or marked WONTFIX.
