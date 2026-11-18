import { useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { ensureSeedInUrl, setSeedInUrl } from '../../../../framework';
import { PrototypeApplication } from '../../Application/prototypeApplication';
import type { CultureWorldDisplayDTO, DisplaySectorDTO } from '../../DisplayDTO/dto';
import './styles.css';

type World = { world: CultureWorldDisplayDTO; geology: string };
type Result = { worlds: World[]; error: string | null };

function generateWorlds(seed: string): Result {
  try {
    const result = new PrototypeApplication([]).generateSector(
      { seed },
      { preview: 'gm', assetBaseUrl: import.meta.env.BASE_URL },
    );
    if (!result.ok) throw new Error('Sector projection failed.');
    const display: DisplaySectorDTO = result.display;
    return {
      worlds: display.culture.worlds
        .filter(
          (world) => world.realizationTier === 'Primary' || world.realizationTier === 'Secondary',
        )
        .map((world) => ({
          world,
          geology:
            display.entities[world.id]?.planet?.basicScan.entries
              .map((entry) => (entry.type === 'simple' ? entry.text : entry.summary))
              .join(' · ') ?? '',
        })),
      error: null,
    };
  } catch (error) {
    return {
      worlds: [],
      error: error instanceof Error ? error.message : 'Sector generation failed.',
    };
  }
}

function WorldCard({ item }: { item: World }) {
  const { world, geology } = item;
  const culture = world.culture;
  const claimants = world.claims.claimants.map((polity) => polity.NiceName);
  return (
    <li className="world-card">
      <div className="world-details">
        <h2>{world.name}</h2>
        <div className="world-block">
          <p>
            {world.population} · {world.techLevel}
          </p>
          {culture && (
            <p>
              {culture.culturalTemplate} · {culture.capitalCity} · {culture.outsiderOpinion}
            </p>
          )}
        </div>
        <div className="world-block">
          <p>
            {world.originalPolity?.NiceName ?? 'No homeworld polity'} ·{' '}
            {claimants.length ? claimants.join(', ') : 'Unclaimed'}
          </p>
          {culture && (
            <p>
              {culture.lawEnforcement.amount} · {culture.lawEnforcement.style}
            </p>
          )}
        </div>
        <div className="world-block">
          <p>{geology}</p>
        </div>
        <div className="world-block">
          {world.tags.map((tag) => (
            <p key={tag.tag}>
              <strong>{tag.tag}</strong> · {tag.description}
            </p>
          ))}
        </div>
        <div className="world-block gm-description" />
      </div>
      <img
        className="world-image"
        src={`${import.meta.env.BASE_URL}swn_sector/portraits/sources/europan-water/01.png`}
        alt="Placeholder world portrait"
      />
    </li>
  );
}

function App() {
  const [seed, setSeed] = useState(ensureSeedInUrl);
  const [result, setResult] = useState(() => generateWorlds(seed));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSeed = seed.trim();
    if (!nextSeed) return;
    setSeed(nextSeed);
    setSeedInUrl(nextSeed);
    setResult(generateWorlds(nextSeed));
  }

  return (
    <main>
      <a href="../../">RandomRoll</a>
      <h1>World selector</h1>
      <form onSubmit={submit}>
        <label htmlFor="seed">Sector seed</label>
        <input id="seed" value={seed} onChange={(event) => setSeed(event.target.value)} required />
        <button type="submit">Generate sector</button>
      </form>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : (
        <ol className="world-list">
          {result.worlds.map((item) => (
            <WorldCard key={item.world.id} item={item} />
          ))}
        </ol>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
