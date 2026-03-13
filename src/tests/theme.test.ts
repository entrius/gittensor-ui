import { describe, it, expect } from 'vitest';
import { getTheme, THEME_STORAGE_KEY } from '../theme';

describe('getTheme', () => {
  it('returns a dark theme when mode is dark', () => {
    const theme = getTheme('dark');
    expect(theme.palette.mode).toBe('dark');
  });

  it('returns a light theme when mode is light', () => {
    const theme = getTheme('light');
    expect(theme.palette.mode).toBe('light');
  });

  it('uses dark background colors for dark mode', () => {
    const theme = getTheme('dark');
    expect(theme.palette.background.default).toBe('#000000');
    expect(theme.palette.background.paper).toBe('#000000');
  });

  it('uses light background colors for light mode', () => {
    const theme = getTheme('light');
    expect(theme.palette.background.default).toBe('#f5f6fa');
    expect(theme.palette.background.paper).toBe('#ffffff');
  });

  it('uses white text for dark mode', () => {
    const theme = getTheme('dark');
    expect(theme.palette.text.primary).toBe('#ffffff');
  });

  it('uses dark text for light mode', () => {
    const theme = getTheme('light');
    expect(theme.palette.text.primary).toBe('#1a1a2e');
  });

  it('shares the same primary color across modes', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.primary.main).toBe(light.palette.primary.main);
    expect(dark.palette.primary.main).toBe('#1d37fc');
  });

  it('shares the same tier colors across modes', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.tier.gold).toBe(light.palette.tier.gold);
    expect(dark.palette.tier.silver).toBe(light.palette.tier.silver);
    expect(dark.palette.tier.bronze).toBe(light.palette.tier.bronze);
  });

  it('shares the same status colors across modes', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.status.merged).toBe(light.palette.status.merged);
    expect(dark.palette.status.open).toBe(light.palette.status.open);
    expect(dark.palette.status.closed).toBe(light.palette.status.closed);
  });

  it('uses different border colors per mode', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.border.light).not.toBe(light.palette.border.light);
    expect(dark.palette.border.subtle).not.toBe(light.palette.border.subtle);
    expect(dark.palette.border.medium).not.toBe(light.palette.border.medium);
  });

  it('uses different surface colors per mode', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.surface.subtle).not.toBe(light.palette.surface.subtle);
    expect(dark.palette.surface.elevated).not.toBe(
      light.palette.surface.elevated,
    );
    expect(dark.palette.surface.tooltip).not.toBe(
      light.palette.surface.tooltip,
    );
  });

  it('keeps transparent surface as transparent in both modes', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.surface.transparent).toBe('transparent');
    expect(light.palette.surface.transparent).toBe('transparent');
  });

  it('uses different divider colors per mode', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.divider).toBe('#ffffff');
    expect(light.palette.divider).toBe('#d1d5db');
  });

  it('uses different secondary color per mode', () => {
    const dark = getTheme('dark');
    const light = getTheme('light');
    expect(dark.palette.secondary.main).toBe('#fff30d');
    expect(light.palette.secondary.main).toBe('#c5b800');
  });
});

describe('THEME_STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof THEME_STORAGE_KEY).toBe('string');
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it('has the expected value', () => {
    expect(THEME_STORAGE_KEY).toBe('gittensor-theme');
  });
});
