import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';
import { SEO } from '../components';
import { useMonthlyRewards } from '../hooks/useMonthlyRewards';
import {
  useAllPrs,
  useAllMiners,
  useReposAndWeights,
  useStats,
  useInfiniteCommitLog,
  useIssues,
} from '../api';
import { isMergedPr } from '../utils/prStatus';

const formatCurrencyCompact = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCount = (value: number): string => value.toLocaleString();

const TICKER_ITEMS = 12;

const Skeleton: React.FC<{ width?: string | number; height?: string | number }> = ({
  width = '100%',
  height = '1em',
}) => <span className="lp-skel" style={{ width, height }} aria-hidden />;

const scrollToAnchor = (
  e: React.MouseEvent<HTMLAnchorElement>,
  hash: string,
  onClose?: () => void,
) => {
  const id = hash.replace(/^#/, '');
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  onClose?.();
};

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const monthlyRewards = useMonthlyRewards();

  const cssVars = useMemo(
    () =>
      ({
        '--lp-bg': theme.palette.background.default,
        '--lp-bg-2': theme.palette.background.paper,
        '--lp-line': theme.palette.border.subtle,
        '--lp-line-2': theme.palette.border.medium,
        '--lp-fg': theme.palette.text.primary,
        '--lp-fg-dim': theme.palette.text.tertiary,
        '--lp-fg-muted': theme.palette.text.secondary,
        '--lp-accent': theme.palette.diff.additions,
        '--lp-accent-glow': alpha(theme.palette.diff.additions, 0.32),
        '--lp-brand': theme.palette.primary.main,
        '--lp-brand-glow': alpha(theme.palette.primary.main, 0.45),
        '--lp-green': theme.palette.status.merged,
      }) as React.CSSProperties,
    [theme],
  );
  const { data: stats, isLoading: isStatsLoading } = useStats();
  const { data: allPrs, isLoading: isPrsLoading } = useAllPrs();
  const { data: allMiners, isLoading: isMinersLoading } = useAllMiners();
  const { data: repos, isLoading: isReposLoading } = useReposAndWeights();
  const { data: commitPages, isLoading: isCommitsLoading } =
    useInfiniteCommitLog({ refetchInterval: 15000 });
  const { data: bounties } = useIssues();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const recentMerges = useMemo(() => {
    const flat = commitPages?.pages.flat() ?? [];
    return flat
      .filter((c) => c.mergedAt)
      .slice(0, TICKER_ITEMS)
      .map((c) => ({
        author: c.author,
        repo: c.repository,
        prNumber: c.pullRequestNumber,
        score: parseFloat(c.score || '0'),
        when: formatDistanceToNow(new Date(c.mergedAt as string), {
          addSuffix: true,
        }),
      }));
  }, [commitPages]);

  const counts = useMemo(() => {
    const mergedPrs = (allPrs ?? []).filter(isMergedPr).length;
    const activeMiners = (allMiners ?? []).filter((m) => m.isEligible).length;
    const trackedRepos = (repos ?? []).filter((r) => !r.inactiveAt).length;
    return { mergedPrs, activeMiners, trackedRepos };
  }, [allPrs, allMiners, repos]);

  const lifetimeUsd = useMemo(() => {
    const total = (allMiners ?? []).reduce(
      (sum, m) => sum + Number(m.lifetimeUsd ?? 0),
      0,
    );
    return total;
  }, [allMiners]);

  const featuredRepos = useMemo(() => {
    const bountyByRepo = new Map<string, number>();
    (bounties ?? []).forEach((b) => {
      const key = b.repositoryFullName;
      if (!key) return;
      bountyByRepo.set(
        key,
        (bountyByRepo.get(key) ?? 0) + Number(b.bountyAmount ?? 0),
      );
    });
    return [...(repos ?? [])]
      .filter((r) => !r.inactiveAt)
      .sort((a, b) => Number(b.weight) - Number(a.weight))
      .slice(0, 4)
      .map((r) => ({
        fullName: r.fullName,
        weight: Number(r.weight),
        bounty: bountyByRepo.get(r.fullName) ?? 0,
      }));
  }, [repos, bounties]);

  const monthlyRewardsLabel = monthlyRewards
    ? monthlyRewards.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—';

  return (
    <div style={cssVars}>
      <SEO
        title="The workforce for open source"
        description="Gittensor routes a monthly reward pool to developers who land quality pull requests across the open-source ecosystem. No tickets. No timesheets. Just merged code."
        type="website"
      />

      <style>{landingCss}</style>

      <nav className="lp-nav" id="lp-nav">
        <div className="lp-nav-logo">
          <img src="/gt-logo.svg" alt="Gittensor" />
          <span>GITTENSOR</span>
        </div>
        <div className="lp-nav-links">
          <a href="#how" onClick={(e) => scrollToAnchor(e, '#how')}>
            How it works
          </a>
          <a href="#devs" onClick={(e) => scrollToAnchor(e, '#devs')}>
            For developers
          </a>
          <a href="#repos" onClick={(e) => scrollToAnchor(e, '#repos')}>
            Repos
          </a>
          <a href="/onboard">Docs</a>
        </div>
        <RouterLink to="/dashboard" className="lp-nav-cta">
          Launch app →
        </RouterLink>
        <button
          type="button"
          className="lp-nav-burger"
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileNavOpen}
          aria-controls="lp-mobile-menu"
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>
      {mobileNavOpen && (
        <div
          id="lp-mobile-menu"
          className="lp-mobile-menu"
          role="menu"
        >
          <a
            href="#how"
            role="menuitem"
            onClick={(e) => scrollToAnchor(e, '#how', closeMobileNav)}
          >
            How it works
          </a>
          <a
            href="#devs"
            role="menuitem"
            onClick={(e) => scrollToAnchor(e, '#devs', closeMobileNav)}
          >
            For developers
          </a>
          <a
            href="#repos"
            role="menuitem"
            onClick={(e) => scrollToAnchor(e, '#repos', closeMobileNav)}
          >
            Repos
          </a>
          <RouterLink to="/onboard" role="menuitem" onClick={closeMobileNav}>
            Docs
          </RouterLink>
          <RouterLink
            to="/dashboard"
            role="menuitem"
            onClick={closeMobileNav}
            className="lp-mobile-menu-cta"
          >
            Launch app →
          </RouterLink>
        </div>
      )}

      <header className="lp-hero">
        <div className="lp-grid-bg" />
        <div className="lp-glow" />
        <img className="lp-mark-big" src="/gt-logo.svg" alt="" />
        <h1>
          Get paid to ship
          <br />
          <span className="lp-accent">open source.</span>
        </h1>
        <p className="lp-sub">
          Gittensor routes a monthly reward pool to developers who land quality
          pull requests across the open-source ecosystem. No tickets. No
          timesheets. Just merged code.
        </p>
        <div className="lp-ctas">
          <RouterLink to="/onboard" className="lp-btn-primary">
            Start mining →
          </RouterLink>
          <a
            href="#how"
            className="lp-btn-ghost"
            onClick={(e) => scrollToAnchor(e, '#how')}
          >
            How it works
          </a>
        </div>
        <div className="lp-counter-card">
          <div className="lp-counter-label">Monthly reward pool</div>
          <div
            className="lp-counter-value"
            aria-label={
              monthlyRewards
                ? `${monthlyRewardsLabel} US dollars`
                : 'Loading'
            }
            aria-busy={!monthlyRewards}
          >
            {monthlyRewards ? (
              monthlyRewardsLabel
            ) : (
              <Skeleton width="280px" height="56px" />
            )}
          </div>
          <div className="lp-pulse">
            <span className="lp-dot" /> Live · paying out now
          </div>
        </div>
      </header>

      {recentMerges.length > 0 ? (
        <div className="lp-ticker-wrap" aria-label="Recent merged pull requests">
          <div className="lp-ticker">
            {[...recentMerges, ...recentMerges].map((m, i) => (
              <span className="lp-tick" key={i}>
                <span className="lp-tick-miner">@{m.author}</span>
                <span className="lp-tick-sep">merged</span>
                <span className="lp-tick-repo">
                  {m.repo} #{m.prNumber}
                </span>
                <span className="lp-tick-sep">·</span>
                <span className="lp-tick-amount">
                  score {m.score.toFixed(2)}
                </span>
                <span className="lp-tick-sep">·</span>
                <span>{m.when}</span>
              </span>
            ))}
          </div>
        </div>
      ) : isCommitsLoading ? (
        <div className="lp-ticker-wrap" aria-label="Loading recent merges">
          <div className="lp-ticker-skel">
            {Array.from({ length: 5 }).map((_, i) => (
              <span className="lp-tick" key={i}>
                <Skeleton width="100px" height="13px" />
                <Skeleton width="220px" height="13px" />
                <Skeleton width="80px" height="13px" />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <section className="lp-block" id="how">
        <div className="lp-eyebrow">How it works</div>
        <h2>
          Three steps. <span className="lp-dim">Then ship.</span>
        </h2>
        <p className="lp-lede">
          Connect, claim, contribute. Validators score every merged PR on
          quality, novelty, and impact — emissions follow automatically.
        </p>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">/ 01</div>
            <h3>Connect your GitHub</h3>
            <p>
              Link your wallet and GitHub account. Your existing reputation,
              history, and language strengths bootstrap your miner profile.
            </p>
            <div className="lp-step-visual">
              <div className="lp-terminal">
                <span className="lp-prompt">$</span> gittensor link --gh you
                <br />
                <span className="lp-ok">✓</span>{' '}
                {counts.trackedRepos > 0
                  ? `${formatCount(counts.trackedRepos)} repos indexed`
                  : 'repos indexed'}
                <br />
                <span className="lp-ok">✓</span>{' '}
                {allMiners && allMiners.length > 0
                  ? `joined ${formatCount(allMiners.length)} miners online`
                  : 'miner registered'}
              </div>
            </div>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">/ 02</div>
            <h3>Pick a bounty or repo</h3>
            <p>
              Browse active issues with on-chain bounties, or contribute freely
              to any tracked repo. Watchlists keep you on the highest-yield
              targets.
            </p>
            <div className="lp-step-visual">
              <div className="lp-terminal">
                {featuredRepos.slice(0, 2).map((r) => (
                  <React.Fragment key={r.fullName}>
                    <span className="lp-prompt">›</span> {r.fullName}
                    <br />
                    &nbsp;&nbsp;
                    <span className="lp-ok">
                      {r.bounty > 0
                        ? formatCurrencyCompact(r.bounty)
                        : `weight ${r.weight.toFixed(2)}`}
                    </span>{' '}
                    open
                    <br />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">/ 03</div>
            <h3>Land the PR, get paid</h3>
            <p>
              Validators score every merged PR. Emissions hit your wallet
              automatically — proportional to quality, not noise.
            </p>
            <div className="lp-step-visual">
              <div className="lp-terminal">
                {recentMerges[0] ? (
                  <>
                    PR #{recentMerges[0].prNumber} merged ✓
                    <br />
                    score:{' '}
                    <span className="lp-ok">
                      {recentMerges[0].score.toFixed(2)}
                    </span>
                    <br />
                    repo:{' '}
                    <span className="lp-ok">{recentMerges[0].repo}</span>
                    <br />
                    {recentMerges[0].when}
                  </>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      paddingTop: 6,
                    }}
                  >
                    <Skeleton width="60%" height="11px" />
                    <Skeleton width="40%" height="11px" />
                    <Skeleton width="70%" height="11px" />
                    <Skeleton width="50%" height="11px" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-block" id="devs">
        <div className="lp-eyebrow">Built for two sides</div>
        <h2>
          One marketplace. <span className="lp-dim">Two upgrades.</span>
        </h2>
        <div className="lp-split">
          <div className="lp-audience">
            <span className="lp-tag">For developers</span>
            <h3>Turn merged PRs into income.</h3>
            <p>
              Stop writing free code for billion-dollar repos. Earn the moment
              your PR lands.
            </p>
            <ul>
              <li>Real-time emissions per merged PR</li>
              <li>Quality-weighted — no farming, no noise</li>
              <li>
                {monthlyRewards
                  ? `Browse ${formatCurrencyCompact(monthlyRewards)} in active monthly rewards`
                  : 'Browse the active monthly reward pool'}
              </li>
              <li>Zero crypto knowledge required</li>
            </ul>
            <RouterLink to="/onboard" className="lp-btn-ghost">
              Start mining →
            </RouterLink>
          </div>
          <div className="lp-audience">
            <span className="lp-tag">For maintainers</span>
            <h3>A workforce that pays itself.</h3>
            <p>
              List your repo, post bounties, watch quality contributors arrive
              — funded by the network.
            </p>
            <ul>
              <li>Post bounties on issues, scoped to PRs</li>
              <li>Network-funded pool, not just your treasury</li>
              <li>Verified contributors, not bots</li>
              <li>One-click repo onboarding</li>
            </ul>
            <RouterLink to="/repositories" className="lp-btn-ghost">
              List your repo →
            </RouterLink>
          </div>
        </div>
      </section>

      <section className="lp-block">
        <div className="lp-eyebrow">By the numbers</div>
        <h2>
          Live network. <span className="lp-dim">Paying out now.</span>
        </h2>
        <div className="lp-stats">
          <div className="lp-stat">
            <div className="lp-stat-num">
              {isMinersLoading ? (
                <Skeleton width="60%" height="0.9em" />
              ) : lifetimeUsd > 0 ? (
                formatCurrencyCompact(lifetimeUsd)
              ) : (
                '—'
              )}
            </div>
            <div className="lp-stat-label">Paid to date</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">
              {isPrsLoading ? (
                <Skeleton width="50%" height="0.9em" />
              ) : (
                formatCount(counts.mergedPrs)
              )}
            </div>
            <div className="lp-stat-label">PRs merged</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">
              {isMinersLoading ? (
                <Skeleton width="40%" height="0.9em" />
              ) : (
                formatCount(counts.activeMiners)
              )}
            </div>
            <div className="lp-stat-label">Active miners</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-num">
              {isReposLoading && isStatsLoading ? (
                <Skeleton width="40%" height="0.9em" />
              ) : (
                formatCount(
                  counts.trackedRepos ||
                    Number(stats?.uniqueRepositories ?? 0),
                )
              )}
            </div>
            <div className="lp-stat-label">Tracked repos</div>
          </div>
        </div>
      </section>

      <section className="lp-block" id="repos">
        <div className="lp-eyebrow">Active repos</div>
        <h2>
          Where the work is. <span className="lp-dim">Right now.</span>
        </h2>
        <div className="lp-repos">
          {isReposLoading && featuredRepos.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="lp-repo-card lp-repo-card-skel">
                  <Skeleton width="80%" height="14px" />
                  <div className="lp-repo-meta">
                    <Skeleton width="40%" height="12px" />
                    <Skeleton width="30%" height="12px" />
                  </div>
                </div>
              ))
            : featuredRepos.map((r) => (
                <RouterLink
                  key={r.fullName}
                  to={`/miners/repository?name=${encodeURIComponent(r.fullName)}`}
                  className="lp-repo-card"
                >
                  <div className="lp-repo-name">{r.fullName}</div>
                  <div className="lp-repo-meta">
                    <span>weight {r.weight.toFixed(2)}</span>
                    <span className="lp-repo-bounty">
                      {r.bounty > 0 ? formatCurrencyCompact(r.bounty) : 'open'}
                    </span>
                  </div>
                </RouterLink>
              ))}
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-glow-bottom" />
        <h2>
          Your next PR
          <br />
          should pay you.
        </h2>
        <div className="lp-ctas lp-ctas-center">
          <RouterLink to="/onboard" className="lp-btn-primary">
            Start mining →
          </RouterLink>
          <RouterLink to="/onboard" className="lp-btn-ghost">
            Read the docs
          </RouterLink>
        </div>
      </section>

      <footer className="lp-footer">
        <div>© Gittensor {new Date().getFullYear()}</div>
        <div className="lp-footer-links">
          <RouterLink to="/onboard">Docs</RouterLink>
          <a
            href="https://github.com/PfanP/gittensor-ui"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};

const landingCss = `
.lp-skel {
  display: inline-block; vertical-align: middle;
  background: linear-gradient(90deg, var(--lp-line) 0%, var(--lp-line-2) 50%, var(--lp-line) 100%);
  background-size: 200% 100%;
  animation: lp-skeleton 1.5s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes lp-skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.lp-block, .lp-final, .lp-hero { scroll-margin-top: 72px; }

.lp-nav-burger {
  display: none;
  width: 40px; height: 40px;
  flex-direction: column; justify-content: center; align-items: center; gap: 5px;
  background: transparent; border: 1px solid var(--lp-line); border-radius: 6px;
  cursor: pointer; padding: 0;
  transition: border-color .2s;
}
.lp-nav-burger:hover { border-color: var(--lp-line-2); }
.lp-nav-burger span {
  display: block; width: 16px; height: 1.5px; background: var(--lp-fg);
  transition: transform .2s, opacity .2s;
}
.lp-nav-burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.lp-nav-burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.lp-nav-burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.lp-mobile-menu {
  display: none;
  position: fixed; top: 64px; left: 0; right: 0; z-index: 49;
  flex-direction: column;
  background: rgba(5,5,5,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--lp-line);
  padding: 8px;
}
.lp-mobile-menu a, .lp-mobile-menu .lp-mobile-menu-cta {
  padding: 14px 16px; border-radius: 6px;
  color: var(--lp-fg-dim); text-decoration: none; font-size: 14px;
  transition: color .2s, background-color .2s;
}
.lp-mobile-menu a:hover { color: var(--lp-fg); background-color: var(--lp-line); }
.lp-mobile-menu .lp-mobile-menu-cta {
  margin-top: 4px; border: 1px solid var(--lp-line-2);
  color: var(--lp-fg); text-align: left;
}

.lp-repo-card-skel { pointer-events: none; }
.lp-ticker-skel { display: flex; gap: 56px; padding: 0 48px; }

.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 48px;
  backdrop-filter: blur(12px);
  background: rgba(5,5,5,0.6);
  border-bottom: 1px solid var(--lp-line);
  color: var(--lp-fg);
}
.lp-nav-logo { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: .05em; font-size: 14px; }
.lp-nav-logo img { width: 24px; height: 24px; filter: brightness(0) invert(1); }
.lp-nav-links { display: flex; gap: 4px; font-size: 13px; }
.lp-nav-links a {
  padding: 8px 14px; border-radius: 6px; color: var(--lp-fg-dim);
  text-decoration: none; transition: color .2s, background-color .2s;
}
.lp-nav-links a:hover { color: var(--lp-fg); background-color: var(--lp-line); }
.lp-nav-cta {
  padding: 8px 16px; border: 1px solid var(--lp-line); border-radius: 6px;
  font-size: 13px; transition: border-color .2s, color .2s;
  color: var(--lp-fg-dim); text-decoration: none;
}
.lp-nav-cta:hover { border-color: var(--lp-line-2); color: var(--lp-fg); }

.lp-hero {
  position: relative; min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  padding: 120px 24px 80px; text-align: center; overflow: hidden;
  color: var(--lp-fg);
}
.lp-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--lp-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--lp-line) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 70%);
          mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 70%);
  opacity: .5;
}
.lp-glow {
  position: absolute; width: 720px; height: 720px; top: -200px; left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, var(--lp-accent-glow), transparent 60%);
  filter: blur(40px); pointer-events: none; opacity: .6;
}
.lp-mark-big {
  width: 96px; height: 96px;
  filter: brightness(0) invert(1) drop-shadow(0 0 48px rgba(255,255,255,0.18)) drop-shadow(0 0 120px var(--lp-accent-glow));
  margin-bottom: 40px; position: relative; z-index: 2;
}
.lp-hero h1 {
  font-size: clamp(48px, 8vw, 112px);
  font-weight: 700; letter-spacing: -0.04em; line-height: .95;
  max-width: 1100px; margin-bottom: 28px; position: relative; z-index: 2;
}
.lp-accent { color: var(--lp-accent); }
.lp-sub {
  font-size: 18px; color: var(--lp-fg-dim); max-width: 620px;
  margin-bottom: 44px; position: relative; z-index: 2; line-height: 1.6;
}
.lp-ctas {
  display: flex; gap: 14px; position: relative; z-index: 2; margin-bottom: 64px;
  flex-wrap: wrap; justify-content: center;
}
.lp-ctas-center { justify-content: center; display: inline-flex; }
.lp-btn-primary {
  padding: 14px 28px; background: var(--lp-brand); color: #fff;
  border-radius: 8px; font-weight: 600; font-size: 14px;
  box-shadow: 0 0 32px var(--lp-brand-glow);
  transition: all .2s; border: 1px solid rgba(255,255,255,0.15);
  text-decoration: none; display: inline-block;
  font-family: inherit;
}
.lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 56px var(--lp-brand-glow), 0 0 24px var(--lp-accent-glow); }
.lp-btn-ghost {
  padding: 14px 28px; border: 1px solid var(--lp-line-2);
  border-radius: 8px; font-size: 14px; color: var(--lp-fg-dim);
  transition: all .2s; text-decoration: none; display: inline-block;
  font-family: inherit;
}
.lp-btn-ghost:hover { color: var(--lp-fg); border-color: var(--lp-fg-muted); }

.lp-counter-card {
  position: relative; z-index: 2;
  border: 1px solid var(--lp-line-2); border-radius: 12px;
  padding: 24px 48px;
  background: linear-gradient(180deg, rgba(126,231,135,0.05), rgba(29,55,252,0.05));
  box-shadow: 0 0 64px rgba(126,231,135,0.1), inset 0 0 1px rgba(29,55,252,0.3);
}
.lp-counter-label {
  font-size: 11px; letter-spacing: .25em; color: var(--lp-fg-muted);
  text-transform: uppercase; margin-bottom: 8px;
}
.lp-counter-value {
  font-size: 56px; font-weight: 700; letter-spacing: -.02em;
  color: var(--lp-accent);
  text-shadow: 0 0 32px var(--lp-accent-glow);
  font-variant-numeric: tabular-nums;
}
.lp-counter-value:not([aria-busy="true"])::before { content: '$'; }
.lp-pulse {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 12px; font-size: 12px; color: var(--lp-green);
}
.lp-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--lp-green);
  box-shadow: 0 0 12px var(--lp-green);
  animation: lp-pulse 1.6s ease-in-out infinite;
}
@keyframes lp-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

.lp-ticker-wrap {
  border-top: 1px solid var(--lp-line); border-bottom: 1px solid var(--lp-line);
  background: var(--lp-bg-2); overflow: hidden; padding: 18px 0;
  position: relative;
}
.lp-ticker-wrap::before, .lp-ticker-wrap::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 200px; z-index: 2; pointer-events: none;
}
.lp-ticker-wrap::before { left: 0; background: linear-gradient(90deg, var(--lp-bg-2), transparent); }
.lp-ticker-wrap::after { right: 0; background: linear-gradient(-90deg, var(--lp-bg-2), transparent); }
.lp-ticker {
  display: flex; gap: 56px; white-space: nowrap;
  animation: lp-scroll 50s linear infinite;
  width: max-content;
}
.lp-ticker:hover { animation-play-state: paused; }
@keyframes lp-scroll { to { transform: translateX(-50%); } }
.lp-tick { display: inline-flex; align-items: center; gap: 14px; font-size: 13px; color: var(--lp-fg-dim); }
.lp-tick-miner { color: var(--lp-fg); font-weight: 600; }
.lp-tick-repo { color: var(--lp-fg); }
.lp-tick-amount { color: var(--lp-fg-dim); }
.lp-tick-sep { color: var(--lp-fg-muted); }

.lp-block {
  padding: 140px 48px; max-width: 1280px; margin: 0 auto;
  color: var(--lp-fg);
}
.lp-eyebrow {
  font-size: 11px; letter-spacing: .3em; color: var(--lp-fg-muted);
  text-transform: uppercase; margin-bottom: 16px;
}
.lp-block h2, .lp-final h2 {
  font-size: clamp(36px, 5vw, 64px); font-weight: 700; letter-spacing: -.03em;
  line-height: 1; margin-bottom: 24px;
}
.lp-dim { color: var(--lp-fg-muted); }
.lp-lede { font-size: 18px; color: var(--lp-fg-dim); max-width: 560px; margin-bottom: 64px; line-height: 1.6; }

.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.lp-step {
  border: 1px solid var(--lp-line); border-radius: 14px; padding: 32px;
  background: linear-gradient(180deg, var(--lp-bg-2), transparent);
  position: relative; overflow: hidden; transition: all .3s;
}
.lp-step:hover { border-color: var(--lp-line-2); transform: translateY(-4px); }
.lp-step-num {
  font-size: 13px; color: var(--lp-fg-muted); margin-bottom: 28px; letter-spacing: .2em;
}
.lp-step h3 { font-size: 22px; margin-bottom: 12px; letter-spacing: -.01em; font-weight: 600; }
.lp-step p { color: var(--lp-fg-dim); font-size: 14px; line-height: 1.7; margin-bottom: 28px; }
.lp-step-visual {
  height: 140px; border-radius: 8px; border: 1px solid var(--lp-line);
  background: var(--lp-bg);
  display: flex; align-items: center; justify-content: flex-start;
  font-size: 11px; color: var(--lp-fg-muted);
  position: relative; overflow: hidden;
}
.lp-terminal {
  font-size: 11px; padding: 14px; width: 100%; height: 100%;
  color: var(--lp-fg-dim); text-align: left; line-height: 1.7;
}
.lp-prompt { color: var(--lp-fg-muted); }
.lp-ok { color: var(--lp-fg); }

.lp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.lp-audience {
  border: 1px solid var(--lp-line); border-radius: 14px; padding: 48px;
  background: var(--lp-bg-2); transition: all .3s; position: relative;
}
.lp-audience:hover { border-color: var(--lp-line-2); }
.lp-tag {
  display: inline-block; font-size: 11px; letter-spacing: .2em; color: var(--lp-fg-dim);
  border: 1px solid var(--lp-line-2); padding: 4px 10px; border-radius: 4px; margin-bottom: 24px;
  text-transform: uppercase;
}
.lp-audience h3 { font-size: 32px; letter-spacing: -.02em; margin-bottom: 16px; font-weight: 700; }
.lp-audience p { color: var(--lp-fg-dim); margin-bottom: 28px; line-height: 1.6; }
.lp-audience ul { list-style: none; margin-bottom: 32px; padding: 0; }
.lp-audience li {
  padding: 12px 0; border-bottom: 1px solid var(--lp-line);
  display: flex; align-items: center; gap: 12px; font-size: 14px;
}
.lp-audience li::before { content: '→'; color: var(--lp-fg-muted); }
.lp-audience li:last-child { border-bottom: none; }

.lp-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
  background: var(--lp-line); border: 1px solid var(--lp-line); border-radius: 14px; overflow: hidden;
}
.lp-stat { padding: 40px 32px; background: var(--lp-bg); }
.lp-stat-num {
  font-size: 48px; font-weight: 700; letter-spacing: -.02em;
  color: var(--lp-fg); margin-bottom: 8px; font-variant-numeric: tabular-nums;
}
.lp-stat-label { font-size: 12px; color: var(--lp-fg-dim); letter-spacing: .1em; text-transform: uppercase; }

.lp-repos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 24px; }
.lp-repo-card {
  border: 1px solid var(--lp-line); border-radius: 10px; padding: 20px;
  background: var(--lp-bg-2);
  display: flex; flex-direction: column; gap: 12px;
  transition: all .2s; text-decoration: none; color: var(--lp-fg);
}
.lp-repo-card:hover { border-color: var(--lp-line-2); transform: translateY(-2px); }
.lp-repo-name { font-size: 14px; font-weight: 600; word-break: break-all; }
.lp-repo-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--lp-fg-dim); }
.lp-repo-bounty { color: var(--lp-fg); }

.lp-final {
  text-align: center; padding: 160px 24px;
  border-top: 1px solid var(--lp-line);
  position: relative; overflow: hidden;
  color: var(--lp-fg);
}
.lp-final h2 { margin-bottom: 32px; }
.lp-glow-bottom {
  position: absolute; width: 800px; height: 400px; left: 50%; bottom: -200px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, var(--lp-accent-glow), transparent 60%);
  filter: blur(60px);
}

.lp-footer {
  padding: 48px; border-top: 1px solid var(--lp-line);
  display: flex; justify-content: space-between; font-size: 12px; color: var(--lp-fg-muted);
}
.lp-footer-links { display: flex; gap: 24px; }
.lp-footer-links a { color: var(--lp-fg-muted); text-decoration: none; }
.lp-footer-links a:hover { color: var(--lp-fg); }

@media (prefers-reduced-motion: reduce) {
  .lp-ticker { animation: none; }
  .lp-dot { animation: none; }
}

@media (max-width: 900px) {
  .lp-steps, .lp-split, .lp-stats, .lp-repos { grid-template-columns: 1fr; }
  .lp-nav { padding: 12px 20px; }
  .lp-nav-links, .lp-nav-cta { display: none; }
  .lp-nav-burger { display: flex; }
  .lp-mobile-menu { display: flex; }
  .lp-block { padding: 80px 20px; }
  .lp-footer { padding: 32px 20px; flex-direction: column; gap: 16px; }
  .lp-counter-value { font-size: clamp(32px, 8vw, 56px); }
}
`;

export default LandingPage;
