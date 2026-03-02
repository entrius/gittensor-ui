# Miner Dashboard Design Rationale (Issue #95)

## Information architecture

- **Header + quick facts** — Immediate identity and key numbers (tier, score, open PRs, earnings, PR count, repo count) so the miner sees their standing at a glance.
- **Your focus (adaptive card)** — New miners (no tier or Bronze with few PRs) see "Unlock [Next Tier]" with progress and 2 concrete steps. Established miners (Silver/Gold or 15+ PRs) see "Earnings & score at a glance". This addresses different needs by stage without separate pages.
- **Score card with reordered stats** — Same stats, different order: unlock-focused (credibility, token score, current score, open risk, PR activity, earnings) vs earnings-focused (earnings first, then score, credibility, etc.). Single component, one prop.
- **Score drivers + tier performance** — Score drivers explain what moves the needle; tier performance shows per-tier stats and unlock progress with a clear "X% of the way to [Next Tier]" banner when applicable.
- **How your score is calculated** — Expandable section so miners can trace how score is built (base, repo weight, credibility, time decay, collateral) and use the PR table for per-PR breakdown.
- **Activity then explorer** — Contribution momentum (heatmap, credibility chart, radar) then PR/repo tables with full filter, sort, and search so the page works for 3 or 300 PRs.

## Miner workflows optimized for

1. **New contributor** — "What do I need to unlock the next tier?" → Focus card + tier section + unlock-ordered stats.
2. **Established miner** — "How are my earnings and score?" → Focus card (earnings) + earnings-ordered stats + same drill-down tables.
3. **Anyone** — "Why did I get this score?" → Score calculation section + PR table columns (base score, token, credibility, collateral).

## Data completeness

All metrics from the miner and PR APIs remain accessible:

- **Miner stats**: tier, total score, open/merged/closed PRs, credibility, token score, nodes scored, collateral, earnings (daily/monthly/lifetime), tier-specific breakdowns (bronze/silver/gold score, credibility, PRs, repos, token score), dynamic open-PR threshold.
- **Per-PR**: PR #, title, repo, author, status, score, base score, token score, credibility (raw + scalar), collateral, additions/deletions, merged/created date, tier.
- **Per-repo**: rank, repo, tier, PR counts (total, merged, open, closed), total score, avg score, weight.

Nothing was removed. Additions/deletions are in the PR table; score drivers and calculation section surface how score is derived.

## Responsive behavior

- Layout uses MUI Grid and breakpoints (xs, sm, md, lg): cards and grids stack on small screens, side-by-side on large.
- Tables scroll horizontally on small viewports with sticky headers; filter/sort controls wrap.
- Focus card and score calculation card use responsive padding (xs: 2, sm: 2.5).

## PR submission checklist

- [ ] **Screenshots**: Add desktop and mobile viewport screenshots to the PR description. Capture: header + focus card, tier section with progress, score calculation expanded, and explorer table with filters.
- [ ] All existing tests pass; new behavior covered in explorer utils tests.
- [ ] CONTRIBUTING.md followed (branch from `test`, build passes).
