import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'input',
    'span',
    'div',
    'details',
    'summary',
  ],
  attributes: {
    ...defaultSchema.attributes,
    input: ['type', 'checked', 'disabled'],
    div: [],
    span: [],
  },
};

/**
 * Shared, sanitized markdown pipeline for user/repository-sourced content.
 * Raw HTML is parsed, then constrained by a strict schema.
 */
export const safeMarkdownRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, markdownSanitizeSchema],
];
