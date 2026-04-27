# Onboard Languages table "No" column issue report

This file includes two report formats for the Onboard `Languages` table update request.

---

## Report 1

## Title

Onboard Languages table is missing `No` column as first column

## Description

In the Onboard panel under the **Languages** tab, the table header originally started with `Extension`. The requested table format requires a serial/index column first, so the expected order is:

`No`, `Extension`, `Language`, `Token Scoring`, `Weight`.

Without `No`, users cannot quickly reference row positions while sorting/filtering/paginating.

## Steps to Reproduce

1. Open the app and go to **Onboard**.
2. Select the **Languages** tab.
3. Check the table header order.
4. Observe that `No` is not present as the first column.

## Expected Behavior

The first column should be `No`, followed by:
`Extension`, `Language`, `Token Scoring`, `Weight`.

## Actual Behavior

The table started with `Extension`; there was no leading `No` index column.

## Environment

- Browser: (e.g. Chrome / Edge / Firefox)
- OS: Windows 10/11

## Additional Context

- Affected component: `src/components/repositories/LanguageWeightsTable.tsx`
- Implemented fix:
  - Added `No` header as the first column.
  - Added serial row value as `page * rowsPerPage + index + 1` for pagination-aware numbering.

---

## Report 2

##Title

Add `No` serial column to Onboard Languages table

## Summary

Updated `LanguageWeightsTable` to include a new first column labeled `No`. Each row now displays a stable serial index calculated from current page and rows per page, so numbering remains correct after pagination and sorting. Column order now matches the requested format:

`No` → `Extension` → `Language` → `Token Scoring` → `Weight`.

## Related Issues

<!-- Link to related issues: Fixes #123, Closes #456 -->

Fixes: *(add issue ID if tracked)*

## Type of Change

- [x] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other (describe below)

## Screenshots

<!-- Include before/after screenshots for every UI/visual change. Remove this section if not applicable. -->

- Before: columns started with `Extension`.
- After: first column is `No` with row index values.

## Checklist

- [x] New components are modularized/separated where sensible
- [x] Uses predefined theme (e.g. no hardcoded colors)
- [x] Responsive/mobile checked
- [ ] Tested against the test API
- [ ] `npm run format` and `npm run lint:fix` have been run
- [x] `npm run build` passes
- [ ] Screenshots included for any UI/visual changes
