import { describe, it, expect } from 'vitest';
import {
  githubReadmeHtmlUrl,
  jsdelivrReadmeMdUrl,
} from '../components/repositories/ReadmeViewer';

describe('jsdelivrReadmeMdUrl', () => {
  it('builds a CDN URL for the requested branch', () => {
    expect(jsdelivrReadmeMdUrl('opentensor/bittensor', 'main')).toBe(
      'https://cdn.jsdelivr.net/gh/opentensor/bittensor@main/README.md',
    );
    expect(jsdelivrReadmeMdUrl('opentensor/bittensor', 'master')).toBe(
      'https://cdn.jsdelivr.net/gh/opentensor/bittensor@master/README.md',
    );
  });

  it('preserves the owner/name slug verbatim (no encoding)', () => {
    expect(
      jsdelivrReadmeMdUrl('latent-to/async-substrate-interface', 'main'),
    ).toBe(
      'https://cdn.jsdelivr.net/gh/latent-to/async-substrate-interface@main/README.md',
    );
  });
});

describe('githubReadmeHtmlUrl', () => {
  it('points at the GitHub REST `/readme` endpoint for the repo', () => {
    expect(githubReadmeHtmlUrl('bitcoinj/bitcoinj')).toBe(
      'https://api.github.com/repos/bitcoinj/bitcoinj/readme',
    );
    expect(githubReadmeHtmlUrl('ray-project/ray')).toBe(
      'https://api.github.com/repos/ray-project/ray/readme',
    );
    expect(githubReadmeHtmlUrl('bitcoin/bips')).toBe(
      'https://api.github.com/repos/bitcoin/bips/readme',
    );
  });

  it('uses the same shape regardless of README extension — caller relies on the Accept header to render any format', () => {
    // The point of #852 is that `.rst` / `.adoc` / `.mediawiki` READMEs all
    // resolve through this single endpoint. The URL itself must not encode
    // an extension.
    const url = githubReadmeHtmlUrl('foo/bar');
    expect(url.endsWith('/readme')).toBe(true);
    expect(url).not.toContain('.md');
    expect(url).not.toContain('.rst');
    expect(url).not.toContain('.adoc');
    expect(url).not.toContain('.mediawiki');
  });
});
