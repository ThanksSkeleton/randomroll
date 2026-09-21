import { useEffect, useState } from 'react';
import type { Sector } from '../../domain/sector/model';

export function SectorArchive({
  sectors,
  selectedIndex,
  setSelectedIndex,
  load,
  generate,
  rename,
  remove,
}: {
  sectors: Sector[];
  selectedIndex: number;
  setSelectedIndex: (n: number) => void;
  load: () => void;
  generate: (seed: string) => void;
  rename: (name: string) => void;
  remove: () => void;
}) {
  const [seed, setSeed] = useState('DELTA-7734');
  const [name, setName] = useState(sectors[selectedIndex]?.SectorName ?? '');
  useEffect(() => setName(sectors[selectedIndex]?.SectorName ?? ''), [selectedIndex, sectors]);
  return (
    <div className="archive">
      <section className="generator">
        <h1 className="generator-title">GENERATE NEW SECTOR</h1>
        <label className="origin-seed-label">
          ORIGIN SEED
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button
          className="primary button-allowed generate-sector-button"
          onClick={() => generate(seed)}
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
              <option value={i} key={`${s.SectorName}-${i}`}>
                {s.SectorName} // {s.OriginalSeed}
              </option>
            ))}
          </select>
        </label>
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
