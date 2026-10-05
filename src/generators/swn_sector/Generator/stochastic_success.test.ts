import { expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate } from './generate';
import { checkAllInvariants } from './generated_sector_invariants';

const DEFAULT_SECTOR_COUNT = 20;
const MAX_SECTOR_COUNT = 100;
const MAX_ARTIFACT_COUNT = 20;
const ARTIFACT_PREFIX = 'randomroll-stochastic-sector-';

function pruneOldArtifacts(): void {
  const artifacts = readdirSync('temp')
    .filter((name) => name.startsWith(ARTIFACT_PREFIX) && name.endsWith('.json'))
    .map((name) => ({ path: join('temp', name), modifiedAt: statSync(join('temp', name)).mtimeMs }))
    .sort((a, b) => a.modifiedAt - b.modifiedAt);

  while (artifacts.length > MAX_ARTIFACT_COUNT) {
    const oldest = artifacts.shift();
    if (oldest) unlinkSync(oldest.path);
  }
}

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

test('Stochastic Success', () => {
  for (let index = 0; index < sectorCount(); index += 1) {
    const seed = `stochastic-success-${randomUUID()}`;
    const sector = generate({ seed: seed });
    const outputPath = join('temp', `randomroll-stochastic-sector-${randomUUID()}.json`);
    writeFileSync(outputPath, `${JSON.stringify(sector, null, 2)}\n`, 'utf8');
    pruneOldArtifacts();
    const violations = checkAllInvariants(sector);

    expect(
      violations,
      `Seed ${seed} (${outputPath}) violated ${violations.length} invariant(s):\n${violations.map((violation) => `[${violation.RuleId}] ${violation.Message}`).join('\n')}`,
    ).toEqual([]);
  }
}, 15_000);
