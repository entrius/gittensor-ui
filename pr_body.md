## Summary

This PR resolves multiple layout and loading issues on the Watchlist page. Specifically:

- **Sticky Sidebar Behavior**: Replaced the standard sticky position with a dynamic Twitter/X-style sticky behavior (`useTwitterStickySidebar`). The sidebar now intelligently scrolls with the page and sticks to the bottom if it's taller than the viewport, providing a seamless "singular scroll" experience without internal scrollbars.
- **Infinite Scroll Loading Indicator**: Standardized the infinite scroll loading states across Repos, PRs, and Issues lists by adding a visible "Loading more..." text indicator next to the spinner.
- **Intersection Observer Fix**: Fixed a critical `ReferenceError` where the Intersection Observer hooks were initializing before their dependencies were declared, preventing the infinite scroll from firing.

## Related Issues

N/A

## Type of Change

- [x] Bug fix
- [x] New feature
- [x] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

_(See user-provided UI confirmation from development environment)_

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [x] Responsive/mobile checked
- [x] Tested against the test API
- [x] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes
- [ ] Screenshots included for any UI/visual changes
