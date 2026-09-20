# Merge Gameplan

## References

- [Schema comparison](swn_sector/SCHEMA_COMPARISON.html)
- [Generator validation test](Validation_test.md)

## Phase 1 — Generator Track

1. Create the new merged schema described in `swn_sector/SCHEMA_COMPARISON.html` as a real TypeScript file.
2. Identify the business-rule invariants for the merged generator in two passes:
   2a. **Existing and obvious invariants** — inventory the invariants already enforced by the current generator, its output contract, validation code, and existing tests. These are primarily structural, cardinality, range, reference, determinism, and generation-rule invariants that can be recovered directly from the existing implementation.
   2b. **Implicit, nonobvious, or nonimplemented invariants** — identify invariants required by the merged schema but not fully expressed in the current implementation. These are primarily domain rules inferred from thinking about a coherent science-fiction space setting, including physically meaningful orbital relationships, parent/child object rules, system boundaries, routes, inhabited-world consistency, and constraints needed to prevent impossible or misleading generated sectors. Record these separately from 2a and explicitly distinguish inferred requirements from rules already enforced by code.
   2c. **Schema elaboration from invariant analysis** — before implementing validation, amend the canonical schema and schema comparison with any missing first-class concepts or corrected semantics exposed by 2a/2b. This includes top-level route portals (rather than embedded route endpoints) and the authoritative detailed-temperature model. Keep generated AU as stored orbit data: star type and temperature constrain a randomized placement roll rather than fully deriving one distance. An `IndependentStation` directly orbits its star and exists solely to host its one `Deep-space station` POI. Record the resulting contract in the TypeScript schema, then treat it as the target for the remaining steps.
3. Implement those invariants against the elaborated merged schema as:

   ```ts
   checkAllInvariants(sector)
   ```

4. Create a unit test that calls `generate(seed)` for randomly seeded sectors and verifies that every generated sector satisfies all invariants. Run 20 sectors by default, with the option to increase the count to 100.

   Call this test **Stochastic Success**. It is not an airtight proof, but it should provide high-value validation.

5. Implement the new `generate(seed)`, using the old implementation as a guide and Stochastic Success as the main validation loop. Repeat the implementation-and-test loop until it passes reliably.
6. After implementation is complete, perform a Sol High manual inspection to find irregularities, missing behavior, or invariants that were not implemented.
7. After that inspection is complete, perform a manual developer inspection with the same goals.
8. Resolve the findings and declare Phase 1 complete.

## Phase 2 — UI Track

TBD — underspecified.
