---
name: Feature Request
about: Suggest a new feature or improvement
labels: enhancement
---

## Summary

Add a new **status card** to the **right-side sidebar** on the **Watchlist** page (`src/pages/WatchlistPage.tsx`).

The card should be titled **"Miners Activity"** and show watched-miner counts in a **3×2 table**:

- **Rows**: All / Eligible / Ineligible
- **Columns**: PR / Issue
- The card should be placed **at the top** of the right sidebar status cards.

## Motivation

The Watchlist page is where users monitor a curated subset of miners. The right sidebar already summarizes activity (PR/Issue activity, code impact), but it does not show **how many watched miners are currently eligible vs. ineligible** for OSS (PR) rewards vs. Issue Discovery rewards. A compact eligibility matrix makes it easier to interpret watchlist health at a glance.

## Proposed Solution

### Where

`WatchlistPage` renders the right sidebar here:

- `src/pages/WatchlistPage.tsx` → `<ActivitySidebarCards miners={minerStats} />`

Add the new card inside `ActivitySidebarCards` (`src/components/leaderboard/ActivitySidebarCards.tsx`) so it appears consistently anywhere that component is used (Watchlist, and any leaderboard pages that also reuse it).

This should be implemented similarly to the work on branch `feat/new-status-card-miner`.

### What to Display

Render a **3×2** table with:

- **Rows**
  - All
  - Eligible
  - Ineligible
- **Columns**
  - PR (OSS contribution eligibility)
  - Issue (Issue discovery eligibility)

Counts should be computed from the `miners: MinerStats[]` array passed into `ActivitySidebarCards` (on Watchlist this is the watched-miner subset).

Suggested definitions:

- **All (PR/Issue)**: `miners.length`
- **Eligible (PR)**: `miners.filter((m) => m.ossIsEligible).length`
- **Ineligible (PR)**: `all - eligiblePR`
- **Eligible (Issue)**: `miners.filter((m) => m.discoveriesIsEligible).length`
- **Ineligible (Issue)**: `all - eligibleIssue`

### Data Source

Watchlist already builds `minerStats` from `mapAllMinersToStats(allMinersData ?? [])` and the watched miner IDs:

- `src/pages/WatchlistPage.tsx`

Eligibility fields already exist on `MinerStats`:

- `src/components/leaderboard/types.ts`
  - `ossIsEligible?: boolean`
  - `discoveriesIsEligible?: boolean`

No new API endpoints should be required.

## Acceptance Criteria

- A new status card appears in the Watchlist right sidebar when the watchlist is non-empty:
  - `src/pages/WatchlistPage.tsx`
- The card title is **"Miners Activity"**.
- The card shows watched-miner counts in a **3×2** table:
  - **Rows**: All / Eligible / Ineligible
  - **Columns**: PR / Issue
- The card is rendered **at the top** of the sidebar card stack (above the other status cards).
- Counts are computed from the existing `miners` array passed to `ActivitySidebarCards` (watchlist subset).
- The card handles loading/empty states gracefully:
  - When `miners` is empty, show zeros (or a clear “No miner data yet” state) without errors.
- Styling matches existing sidebar cards (uses `SectionCard` and the typography conventions in `src/components/leaderboard/*`).

## Out of Scope

- Changing eligibility rules (backend-driven; backend is not open source).
- Adding new API endpoints.
- Modifying watchlist tab behavior, storage, or pinning logic.

## Notes / Implementation Hints

- `WatchlistPage` computes watched miners as `minerStats`; the card should reflect _watched miners only_ (not all miners on the network).
- `ActivitySidebarCards` is also used in other places (e.g. leaderboards); keep the card implementation generic and driven purely by the `miners` prop.
