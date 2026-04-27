# Repository contributors row width mismatch report

This document includes two report formats for the repository sidebar issue where contributor row underline/background appeared shorter than the table width while resizing.

---

## Report 1

## Title

Repository panel: contributor row underline/background becomes shorter than visible table content on narrow widths

## Description

In the `Top Miner Contributors` section on the repository details sidebar, row separators (underline) and hover background did not visually span the same width as the row content during window resize. On narrow layouts, numeric columns (`PRS`, `SCORE`) could visually extend farther than the underline/background, making the row appear truncated.

## Steps to Reproduce

1. Open any tracked repository in the repository details page.
2. Scroll to the right sidebar `Top Miner Contributors` table.
3. Resize the browser window narrower (or reduce panel width).
4. Observe that row underline/hover area appears shorter than visible row/table content.

## Expected Behavior

Row underline and hover background should always span the full visible table width, regardless of viewport/panel width.

## Actual Behavior

At narrow widths, row content (especially score text area) appeared to extend beyond the underline/hover area, so separators/background looked shorter than table width.

## Environment

- Browser: (e.g. Chrome / Edge / Firefox)
- OS: Windows 10/11

## Additional Context

- Affected component: `src/components/repositories/RepositoryContributorsTable.tsx`
- Related recording/screenshot provided by user (`2026-04-19_23h50_33.mp4` and screenshot reference).
- Root cause: grid content could paint outside perceived border box at small widths.
- Fix approach:
  - Use full-width outer row shell for border/hover.
  - Move grid content into inner clipped container (`overflow: hidden`).
  - Use shrink-safe numeric tracks (`minmax(0, ...)`) and ellipsis on numeric cells.

---

## Report 2

##Title

Fix contributor table row underline/background width mismatch on resize

## Summary

Updated `RepositoryContributorsTable` row structure so visual row boundaries always match table width while resizing. Borders and hover backgrounds are now applied on a full-width outer row shell, while inner grid content is clipped safely. Numeric columns use shrink-safe tracks with overflow handling, preventing content from visually extending past row boundaries.

## Related Issues

<!-- Link to related issues: Fixes #123, Closes #456 -->

Fixes: *(add tracker ID when available)*

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

<!-- Include before/after screenshots for every UI/visual change. Remove this section if not applicable. -->

- Before: row underline/hover appeared shorter than score table width on narrow sidebar.
- After: row underline/hover spans full table width during resize.

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [x] Responsive/mobile checked
- [ ] Tested against the test API
- [ ] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes
- [ ] Screenshots included for any UI/visual changes
