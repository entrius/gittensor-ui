// Regenerates two snapshots of each registry repo's GitHub metadata, keyed
// by fullName, from a single GitHub fetch per repo:
//   - src/generated/repoWebsites.json     — the declared homepage URL
//   - src/generated/repoDescriptions.json — the repo's one-line description
// Runs as the `prebuild` hook so every build ships whatever the projects
// currently declare — no hand-edited lists to go stale.
//
// Fail-safe by design: any fetch problem (registry down, GitHub rate limit)
// leaves the committed snapshots untouched and exits 0, so a build can never
// break — worst case the data is as fresh as the last successful run.
// Set GITHUB_TOKEN (GitHub Actions' built-in token works) to lift the
// unauthenticated 60 req/hr GitHub API limit shared by CI runner IPs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'generated',
);
const WEBSITES_PATH = join(GENERATED_DIR, 'repoWebsites.json');
const DESCRIPTIONS_PATH = join(GENERATED_DIR, 'repoDescriptions.json');

const API_BASE =
  process.env.VITE_REACT_APP_BASE_URL || 'https://api.gittensor.io';

const readSnapshot = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
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

const websitesSnapshot = readSnapshot(WEBSITES_PATH);
const descriptionsSnapshot = readSnapshot(DESCRIPTIONS_PATH);

let registry;
try {
  const payload = await fetchJson(`${API_BASE}/dash/repos`);
  registry = Array.isArray(payload) ? payload : payload.repositories;
  if (!Array.isArray(registry)) throw new Error('unexpected registry shape');
} catch (error) {
  console.warn(
    `repo-websites: registry fetch failed, keeping snapshots (${error.message})`,
  );
  process.exit(0);
}

const websites = {};
const descriptions = {};
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
    const description = (meta.description || '').trim();
    if (description) descriptions[fullName] = description;
  } catch (error) {
    failures += 1;
    console.warn(`repo-websites: ${fullName} fetch failed (${error.message})`);
    if (websitesSnapshot[fullName])
      websites[fullName] = websitesSnapshot[fullName];
    if (descriptionsSnapshot[fullName])
      descriptions[fullName] = descriptionsSnapshot[fullName];
  }
}

// A blanket failure (e.g. rate limit) must not wipe the snapshots wholesale.
if (failures === registry.length) {
  console.warn('repo-websites: every GitHub fetch failed, keeping snapshots');
  process.exit(0);
}

const writeSorted = (path, entries, label) => {
  const sorted = Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `repo-websites: wrote ${Object.keys(sorted).length} ${label} (${failures} fetch failures)`,
  );
};

mkdirSync(GENERATED_DIR, { recursive: true });
writeSorted(WEBSITES_PATH, websites, 'websites');
writeSorted(DESCRIPTIONS_PATH, descriptions, 'descriptions');
