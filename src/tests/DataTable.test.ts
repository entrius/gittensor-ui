import { describe, it, expect } from 'vitest';
import { getSortLabelSx } from '../components/common/DataTable';

describe('getSortLabelSx', () => {
  it('always exposes a visible :focus-visible ring on the sort label', () => {
    for (const align of [
      'left',
      'right',
      'center',
      'inherit',
      'justify',
      undefined,
    ] as const) {
      const sx = getSortLabelSx(align);
      const focus = (sx as Record<string, unknown>)['&:focus-visible'] as
        | Record<string, unknown>
        | undefined;
      expect(focus).toBeDefined();
      expect(focus?.outline).toBe('2px solid');
      expect(focus?.outlineColor).toBe('primary.main');
    }
  });

  it('does NOT reverse layout for left / center / default-align columns', () => {
    for (const align of [
      'left',
      'center',
      'inherit',
      'justify',
      undefined,
    ] as const) {
      const sx = getSortLabelSx(align) as Record<string, unknown>;
      expect(sx.flexDirection).toBeUndefined();
      expect(sx['& .MuiTableSortLabel-icon']).toBeUndefined();
    }
  });

  it('reverses flex direction for right-aligned columns so text stays flush right', () => {
    const sx = getSortLabelSx('right') as Record<string, unknown>;
    expect(sx.flexDirection).toBe('row-reverse');
    const iconSx = sx['& .MuiTableSortLabel-icon'] as Record<string, unknown>;
    expect(iconSx).toBeDefined();
    expect(iconSx.ml).toBe(0);
    expect(iconSx.mr).toBe(0.5);
  });
});
