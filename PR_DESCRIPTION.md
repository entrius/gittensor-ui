## Summary

Redesigns the miner details page to educate miners about scoring rules, payment requirements, and common misunderstandings. Adds a prominent Key Rules & FAQ section (MinerGuidanceCard) and enhances the score calculation explainer with full formula and multiplier details sourced from the official docs. Also includes mobile responsiveness fixes (horizontal table scrolling, hotkey truncation, filter layout, "Updated" chip placement), Vite proxy for local API development, and vitest setup with comprehensive tests.

## Related Issues

Closes #95

## Type of Change

- [ ] Bug fix
- [x] New feature
- [x] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Testing

- [x] Manual testing performed against test API
- [x] Tested on desktop viewport
- [x] Tested on mobile viewport (Chrome DevTools)
- [x] `npm run test` passes (33 tests)

## Demo

| Viewport | Video |
|----------|-------|
| Desktop | https://screenrec.com/share/ysLPABrUHY |
| Mobile | https://screenrec.com/share/GCQetvLZ5V |

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [x] Responsive/mobile checked
- [x] Tested against the test API
- [x] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes
- [x] Screenshots included for any UI/visual changes

## Changes

### Miner Education (New)
- **MinerGuidanceCard**: Key Rules section (6 rules) + Common Questions FAQ (8 items) addressing "why no payment?", tier unlock requirements, collateral, spam penalties, score decay, etc.
- **MinerScoreCalculationCard**: Enhanced with full per-PR formula, organized sections (Base Score, Multipliers, Collateral), and link to official docs
- Content sourced from https://docs.gittensor.io/oss-contributions.html

### Mobile Responsiveness
- **MinerPRsTable**: Enable horizontal scroll, show all 6 columns
- **MinerScoreCard**: Truncate hotkey with ellipsis, inline Updated chip on mobile
- **ExplorerFilterButton**: Responsive padding and font size

### Testing
- Set up vitest with `npm run test` and `npm run test:watch`
- Added 33 tests for explorerUtils functions

### Development
- **vite.config.ts**: Add proxy for `/api` to `test-api.gittensor.io`