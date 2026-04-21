export type CountCopyStyle = 'compact' | 'natural';

interface NounLabelOptions {
  singular: string;
  plural?: string;
  style?: CountCopyStyle;
}

interface CountLabelOptions extends NounLabelOptions {
  count: number;
}

function getPluralLabel(singular: string, plural?: string): string {
  return plural ?? `${singular}s`;
}

export function formatNounLabel({
  singular,
  plural,
  style = 'compact',
}: NounLabelOptions): string {
  if (style === 'compact') return `${singular}(s)`;
  return getPluralLabel(singular, plural);
}

export function formatCountLabel({
  count,
  singular,
  plural,
  style = 'compact',
}: CountLabelOptions): string {
  if (style === 'compact') return `${count} ${singular}(s)`;
  const resolvedPlural = getPluralLabel(singular, plural);
  return `${count} ${count === 1 ? singular : resolvedPlural}`;
}
