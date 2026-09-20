import { expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { generate } from "./generate";
import { checkAllInvariants } from "./invariants";

const DEFAULT_SECTOR_COUNT = 20;
const MAX_SECTOR_COUNT = 100;

function sectorCount(): number {
  const configured = process.env.STOCHASTIC_SUCCESS_SECTOR_COUNT;
  if (configured === undefined) return DEFAULT_SECTOR_COUNT;

  const count = Number(configured);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SECTOR_COUNT) {
    throw new Error(
      `STOCHASTIC_SUCCESS_SECTOR_COUNT must be an integer from 1 through ${MAX_SECTOR_COUNT}; received ${JSON.stringify(configured)}.`,
    );
  }
  return count;
}

test("Stochastic Success", () => {
  for (let index = 0; index < sectorCount(); index += 1) {
    const seed = `stochastic-success-${randomUUID()}`;
    const violations = checkAllInvariants(generate(seed));

    expect(
      violations,
      `Seed ${seed} violated ${violations.length} invariant(s):\n${violations.map(violation => `[${violation.RuleId}] ${violation.Message}`).join("\n")}`,
    ).toEqual([]);
  }
});
