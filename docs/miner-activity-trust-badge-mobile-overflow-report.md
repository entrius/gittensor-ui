# Miner activity trust badge mobile layout issue report

This file includes two report formats for the mobile layout issue where the trust badge beside **Developer Activity** was clipped/hidden on narrow screens.

---

## Report 1

## Title

Miner detail (mobile): High Trust label clipped in Developer Activity header

## Description

On mobile width in the miner details page, the trust label chip (e.g. **High Trust - Expedite Code Review**) appears to the right of the **Developer Activity** title in the header row. Because the horizontal space is limited, the chip gets truncated/hidden and does not display fully.

## Steps to Reproduce

1. Open a miner details page.
2. Switch to mobile viewport or narrow the browser window.
3. Scroll to the **Developer Activity** card header.
4. Observe the trust chip near the title (e.g. High Trust label).

## Expected Behavior

On mobile, the trust chip should be displayed fully and clearly. It should appear under the **Developer Activity** title when space is limited.

## Actual Behavior

The trust chip stays on the same row as the title and becomes clipped/hidden at small widths.

## Environment

- Browser: (e.g. Chrome, Edge, Safari)
- OS: (e.g. Android / iOS / Windows responsive mode)

## Additional Context

- Affected files:
  - `src/components/miners/MinerActivity.tsx`
  - `src/components/miners/TrustBadge.tsx`
- Root cause: header used one horizontal row at all breakpoints, so title and chip competed for width.
- Fix:
  - Header now stacks vertically on mobile (`xs`) and keeps horizontal layout on larger screens.
  - Trust chip wrapper now supports narrow width and avoids overflow.
  - Chip label has overflow safeguards (`maxWidth`, ellipsis).

---

## Report 2

##Title

Fix mobile clipping of trust badge in Miner Activity header

## Summary

Updated the Miner Activity header layout to be responsive: title and trust badge now stack on mobile and stay side-by-side on larger breakpoints. Also added chip-level overflow guards to prevent long trust messages from spilling out of the card. This ensures the trust label remains visible and readable in narrow viewports.

## Related Issues

<!-- Link to related issues: Fixes #123, Closes #456 -->

Fixes: *(add issue ID when created)*

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

<!-- Include before/after screenshots for every UI/visual change. Remove this section if not applicable. -->

- Before: trust chip clipped on the right side in mobile header.
- After: trust chip is shown under title and remains fully visible.

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [x] Responsive/mobile checked
- [ ] Tested against the test API
- [ ] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes
- [ ] Screenshots included for any UI/visual changes
