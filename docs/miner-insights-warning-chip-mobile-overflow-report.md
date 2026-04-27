# Miner details — insight WARNING chip overflows card on mobile

This document includes **Report 1** (bug report) and **Report 2** (change / PR-style summary).

---

## Report 1

## Title

Miner detail panel: WARNING type chip overflows insight card border on mobile

## Description

On the miner details page, the **Insights & Next Actions** cards (`MinerInsightsCard`) render a type chip (`warning`, `tip`, `achievement`) next to the insight title. In a narrow (mobile) viewport, the **WARNING** chip could extend past the right edge of the bordered insight section—especially when the title text wraps to multiple lines—while **TIP**-style cards with shorter titles could still appear contained.

## Steps to Reproduce

1. Open a miner’s detail page where the collateral insight appears (e.g. insight titled **“Collateral is suppressing score”**).
2. Switch to a mobile viewport or resize the browser to a narrow width.
3. Scroll to the orange-bordered insight card.
4. Observe the **WARNING** chip in the top-right: it can overflow past the card’s right border.

## Expected Behavior

The type chip and all insight content should stay within the card’s padding and border at any viewport width; the chip should wrap or reflow with the title instead of overflowing.

## Actual Behavior

The **WARNING** label visually extended beyond the insight section width on mobile.

## Environment

- Browser: *(e.g. Chrome mobile / Safari iOS / responsive devtools)*
- OS: *(e.g. iOS / Android / Windows)*

## Additional Context

- Component: `src/components/miners/MinerInsightsCard.tsx`
- Cause: A three-column flex row (icon | title+description | chip) let the middle column and chip compete for width without `minWidth: 0` / wrapping, so the chip could sit outside the card on small screens.
- Fix: Title and chip share a **wrapping flex row** above the description; outer row uses `minWidth: 0`, `maxWidth: '100%'`, and `overflow: 'hidden'`; description uses `wordBreak: 'break-word'`.

---

## Report 2

## Title

Fix miner insight type chip overflow on narrow viewports

## Summary

Refactored each insight row in `MinerInsightsCard` so the type **Chip** sits in a **wrapping header row** with the title (instead of a third flex column beside the full text block). The content column uses `flex: 1`, `minWidth: 0`, and `maxWidth: '100%'` so flex layout can shrink correctly on mobile. The insight container uses `overflow: 'hidden'` and `boxSizing: 'border-box'` to avoid paint overflow; the chip label can ellipsis if needed.

## Related Issues

<!-- Fixes #..., Closes #... -->

*(Add tracker links when available.)*

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

<!-- Before: WARNING chip past card edge on mobile. After: chip wraps or stays inside border. -->

| Before | After |
|--------|--------|
| *(optional)* | *(optional)* |

## Checklist

- [x] New components are modularized/separated where sensible *(layout-only change in existing card)*
- [x] Uses predefined theme (e.g. no hardcoded colors) *(existing `STATUS_COLORS` / `alpha` usage preserved)*
- [ ] Responsive/mobile checked *(recommended: verify on real device or devtools)*
- [ ] Tested against the test API
- [ ] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes (`npx tsc -b` verified)
- [ ] Screenshots included for any UI/visual changes
