// Regenerates src/generated/repoRegistry.json: the landing grid's slice of
// the registry (name, owner, emission share), so the home page can render
// real cards on first paint instead of skeletons while /dash/repos loads.
// The live query still runs and silently reconciles once it resolves.
//
// Runs as the `prebuild` hook alongside fetch-repo-websites.mjs and shares
// its fail-safe contract: any fetch problem leaves the committed snapshot
// untouched and exits 0, so a build can never break — worst case the first
// paint is as fresh as the last successful run.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'generated',
  'repoRegistry.json',
);

const API_BASE =
  process.env.VITE_REACT_APP_BASE_URL || 'https://api.gittensor.io';

let registry;
try {
  const response = await fetch(`${API_BASE}/dash/repos`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  registry = Array.isArray(payload) ? payload : payload.repositories;
  if (!Array.isArray(registry)) throw new Error('unexpected registry shape');
} catch (error) {
  console.warn(
    `repo-registry: registry fetch failed, keeping snapshot (${error.message})`,
  );
  process.exit(0);
}

// Only the fields the landing grid reads; sorted by emission share so the
// committed file diffs stably and the snapshot renders in final order.
const slim = registry
  .filter((repo) => repo.fullName)
  .map((repo) => ({
    fullName: repo.fullName,
    owner: repo.owner ?? repo.fullName.split('/')[0],
    name: repo.name ?? repo.fullName.split('/')[1],
    updatedAt: repo.updatedAt ?? '',
    config: { emissionShare: repo.config?.emissionShare ?? 0 },
  }))
  .sort(
    (a, b) => Number(b.config.emissionShare) - Number(a.config.emissionShare),
  );

try {
  const previous = readFileSync(OUT_PATH, 'utf8');
  if (previous === `${JSON.stringify(slim, null, 2)}\n`) {
    console.log(`repo-registry: snapshot unchanged (${slim.length} repos)`);
    process.exit(0);
  }
} catch {
  /* no existing snapshot — write below */
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(slim, null, 2)}\n`);
console.log(`repo-registry: wrote ${slim.length} repos`);
