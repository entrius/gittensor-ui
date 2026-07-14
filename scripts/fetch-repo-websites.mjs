// Regenerates src/generated/repoWebsites.json: the homepage URL each
// registry repo declares in its GitHub metadata, keyed by fullName. Runs as
// the `prebuild` hook so every build ships whatever the projects currently
// point their GitHub "website" field at — no hand-edited list to go stale.
//
// Fail-safe by design: any fetch problem (registry down, GitHub rate limit)
// leaves the committed snapshot untouched and exits 0, so a build can never
// break — worst case the previews are as fresh as the last successful run.
// Set GITHUB_TOKEN (GitHub Actions' built-in token works) to lift the
// unauthenticated 60 req/hr GitHub API limit shared by CI runner IPs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'generated',
  'repoWebsites.json',
);

const API_BASE =
  process.env.VITE_REACT_APP_BASE_URL || 'https://api.gittensor.io';

const readSnapshot = () => {
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
};

const githubHeaders = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

const snapshot = readSnapshot();

let registry;
try {
  const payload = await fetchJson(`${API_BASE}/dash/repos`);
  registry = Array.isArray(payload) ? payload : payload.repositories;
  if (!Array.isArray(registry)) throw new Error('unexpected registry shape');
} catch (error) {
  console.warn(
    `repo-websites: registry fetch failed, keeping snapshot (${error.message})`,
  );
  process.exit(0);
}

const websites = {};
let failures = 0;
for (const repo of registry) {
  const fullName = repo.fullName;
  if (!fullName) continue;
  try {
    const meta = await fetchJson(
      `https://api.github.com/repos/${fullName}`,
      githubHeaders,
    );
    const homepage = (meta.homepage || '').trim();
    if (/^https?:\/\//i.test(homepage)) websites[fullName] = homepage;
  } catch (error) {
    failures += 1;
    console.warn(`repo-websites: ${fullName} fetch failed (${error.message})`);
    if (snapshot[fullName]) websites[fullName] = snapshot[fullName];
  }
}

// A blanket failure (e.g. rate limit) must not wipe the snapshot wholesale.
if (failures === registry.length) {
  console.warn('repo-websites: every GitHub fetch failed, keeping snapshot');
  process.exit(0);
}

const sorted = Object.fromEntries(
  Object.entries(websites).sort(([a], [b]) => a.localeCompare(b)),
);
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `repo-websites: wrote ${Object.keys(sorted).length} entries (${failures} fetch failures)`,
);
