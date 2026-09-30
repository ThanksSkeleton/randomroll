import { useEffect, useState } from 'react';
import type { ArchiveSectorDisplayDTO } from '../../../DisplayDTO/dto';

type StartingWorldMode = ArchiveSectorDisplayDTO['startingWorldMode'];

export function SectorArchive({
  sectors,
  selectedIndex,
  setSelectedIndex,
  load,
  generate,
  rename,
  remove,
}: {
  sectors: ArchiveSectorDisplayDTO[];
  selectedIndex: number;
  setSelectedIndex: (n: number) => void;
  load: () => void;
  generate: (seed: string, mode: StartingWorldMode) => void;
  rename: (name: string) => void;
  remove: () => void;
}) {
  const [seed, setSeed] = useState('DELTA-7734');
  const [mode, setMode] = useState<StartingWorldMode>('UNRESTRICTED');
  const [generationError, setGenerationError] = useState('');
  const [name, setName] = useState(sectors[selectedIndex]?.name ?? '');
  useEffect(() => setName(sectors[selectedIndex]?.name ?? ''), [selectedIndex, sectors]);
  return (
    <div className="archive">
      <section className="generator">
        <h1 className="generator-title">GENERATE NEW SECTOR</h1>
        <label className="origin-seed-label">
          ORIGIN SEED
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <label className="origin-seed-label">
          STARTING WORLD ELIGIBILITY
          <select
            aria-label="Starting world mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as StartingWorldMode)}
          >
            <option value="UNRESTRICTED">Unrestricted: any inhabited world</option>
            <option value="TL4_PLUS">TL4+: tech level 4 or higher</option>
            <option value="TL4_PLUS_POP_GT_500">
              TL4+ and population band above “Fewer than 500”
            </option>
          </select>
        </label>
        {generationError && (
          <p role="alert" className="generation-error">
            {generationError}
          </p>
        )}
        <button
          className="primary button-allowed generate-sector-button"
          onClick={() => {
            setGenerationError('');
            try {
              generate(seed, mode);
            } catch (error) {
              setGenerationError(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          GENERATE SECTOR <span>＋</span>
        </button>
      </section>
      <section className="saved">
        <label className="available-sectors-label">
          <select
            aria-label="Available sectors"
            className="available-sectors-select"
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
          >
            {sectors.map((s, i) => (
              <option value={i} key={`${s.name}-${i}`}>
                {s.name} // {s.originalSeed}
              </option>
            ))}
          </select>
        </label>
        {sectors[selectedIndex]?.startingWorldName && (
          <p className="starting-world-summary">
            Starting world: <strong>{sectors[selectedIndex].startingWorldName}</strong>
          </p>
        )}
        <button className="primary full button-allowed load-sector-button" onClick={load}>
          LOAD SELECTED SECTOR →
        </button>
        <div className="archive-rule" />
        <label className="rename-sector-label">
          RENAME SECTOR
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          className={`apply-name-button ${name.trim() ? 'button-allowed' : 'button-disabled'}`}
          onClick={() => rename(name)}
          disabled={!name.trim()}
        >
          APPLY NAME
        </button>
        <button
          className={`danger delete-archive-button ${sectors.length > 1 ? 'button-scary-allowed' : 'button-disabled'}`}
          onClick={remove}
          disabled={sectors.length <= 1}
        >
          DELETE FROM ARCHIVE
        </button>
      </section>
    </div>
  );
}
