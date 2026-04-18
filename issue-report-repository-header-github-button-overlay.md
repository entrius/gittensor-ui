##Title

Repository details header: "View on GitHub" overlaps title and chips when resizing

## Summary

Adjusts the repository details page header layout in `RepositoryDetailsPage.tsx` so the title row can wrap and shrink (`minWidth: 0`, `flexWrap`, word-breaking for long repo names, wrapped chip group) instead of overflowing into the **View on GitHub** column. Adds spacing and alignment on the button column so the control stays visible and non-overlapping across viewport resizes.

## Related Issues

N/A

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

Before: resizing the window caused the left header (title + chips) to draw over the **View on GitHub** button.  
After: title and chips wrap within the left column; button stays unobstructed.  
Attach `2026-04-18_08h13_06.mp4` or equivalent before/after stills if filing on GitHub.

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [ ] Responsive/mobile checked
- [ ] Tested against the test API
- [ ] `npm run format` and `npm run lint:fix` have been run
- [ ] `npm run build` passes
- [ ] Screenshots included for any UI/visual changes
