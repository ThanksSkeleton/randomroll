# Generator Validation Test

## Purpose

Validate the new sector generator by checking generated sectors against a shared collection of business-rule invariants.

This is intentionally a small starter strategy. More elaborate coverage can be added later.

## Approach

1. Build an invariant rule collection that describes the business rules every generated sector must satisfy.
2. Generate `X` sectors using a different random seed for each sector.
3. Run every generated sector against the complete invariant collection.
4. If a validation fails, capture the seed and reported invariant failures, reproduce the sector, and debug the generator or rule.

The default value of `X` is `20`.

## Invariant Rule Collection

Represent each invariant as a named rule that inspects a generated sector and returns any violations it finds.

Examples include:

- Gas giants cannot be inhabited.
- A planet's final habitability must satisfy the habitability requirements that apply to it.
- Generated relationships and object combinations must obey the generator's business rules.

The collection is the executable statement of the rules the new generator must preserve. Add rules as the old generator's business logic is translated.

## Test Outline

```text
sectorCount = configured value or 20

repeat sectorCount times:
  seed = createRandomSeed()
  sector = generateSector(seed)
  violations = validateAgainstInvariants(sector)

  assert violations is empty,
    including seed and violations in the failure output
```

Each generated sector must be checked against every invariant. A single violation fails the test run.

## Failure Workflow

For every failure:

1. Record the failing seed.
2. Regenerate the sector with that seed.
3. Inspect the reported invariant violation.
4. Determine whether the generator or the invariant is incorrect.
5. Fix the problem and rerun the validation test.

Failure output must include the seed so every random failure is reproducible.

## Initial Scope

This starter does not require compatibility between old and new generator output for the same seed. It tests whether the new output obeys the intended business rules, not whether it repeats the old generator's sequence of random choices.

Distribution analysis, exhaustive combinations, shrinking, permanent seed corpora, and other extensions are intentionally deferred.
