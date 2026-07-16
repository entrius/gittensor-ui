// Downloads each registry repo's preview image at build time into
// public/previews/, and writes src/generated/repoPreviews.json mapping
// fullName -> asset path. The landing grid then serves previews as
// first-party static assets — ready the moment the page paints — instead
// of fetching mshots/GitHub OG images from the visitor's browser at view
// time (slow, rate-limited, and blank while pending).
//
// Sources: repos with a website get an mshots screenshot of it; the rest
// get their GitHub OpenGraph card. Runs in `prebuild` AFTER
// fetch-repo-registry.mjs and fetch-repo-websites.mjs (it reads their
// snapshots). Same fail-safe contract: any per-repo failure keeps that
// repo's previous asset + manifest entry, and nothing here can fail a build.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'src', 'generated', 'repoRegistry.json');
const WEBSITES_PATH = join(ROOT, 'src', 'generated', 'repoWebsites.json');
const MANIFEST_PATH = join(ROOT, 'src', 'generated', 'repoPreviews.json');
const ASSET_DIR = join(ROOT, 'public', 'previews');

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
};

const registry = readJson(REGISTRY_PATH, []);
const websites = readJson(WEBSITES_PATH, {});
const previousManifest = readJson(MANIFEST_PATH, {});

if (!Array.isArray(registry) || registry.length === 0) {
  console.warn('repo-previews: no registry snapshot, keeping manifest');
  process.exit(0);
}

const slugFor = (fullName) => fullName.replace(/[^a-zA-Z0-9._-]/g, '__');

const mshotsUrl = (url) =>
  `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=640`;

const ogUrl = (fullName) => `https://opengraph.githubassets.com/1/${fullName}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// mshots answers the first request for a URL with a small "generating…"
// placeholder GIF and the real JPEG on a later request; poll until the
// response looks like a real screenshot.
const fetchImage = async (url, { pollPlaceholder }) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(url, { redirect: 'follow' });
    if (response.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = (response.headers.get('content-type') || '').toLowerCase();
    const bytes = Buffer.from(await response.arrayBuffer());
    const isPlaceholder = type.includes('gif') || bytes.length < 4096;
    if (pollPlaceholder && isPlaceholder) {
      await sleep(2500);
      continue;
    }
    if (!type.startsWith('image/')) throw new Error(`not an image (${type})`);
    return { bytes, ext: type.includes('png') ? 'png' : 'jpg' };
  }
  throw new Error('still a placeholder after polling');
};

mkdirSync(ASSET_DIR, { recursive: true });

const manifest = {};
let failures = 0;

for (const repo of registry) {
  const fullName = repo.fullName;
  if (!fullName) continue;
  const website = websites[fullName];
  const source = website
    ? { url: mshotsUrl(website), pollPlaceholder: true }
    : { url: ogUrl(fullName), pollPlaceholder: false };
  try {
    const { bytes, ext } = await fetchImage(source.url, source);
    const fileName = `${slugFor(fullName)}.${ext}`;
    writeFileSync(join(ASSET_DIR, fileName), bytes);
    manifest[fullName] = `/previews/${fileName}`;
    console.log(`repo-previews: ${fullName} <- ${website || 'github og'}`);
  } catch (error) {
    failures += 1;
    console.warn(`repo-previews: ${fullName} failed (${error.message})`);
    // Keep serving the previous build's asset if it is still on disk.
    const previous = previousManifest[fullName];
    if (previous && existsSync(join(ROOT, 'public', previous.slice(1)))) {
      manifest[fullName] = previous;
    }
  }
}

const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `repo-previews: wrote ${Object.keys(sorted).length} entries (${failures} failures)`,
);
