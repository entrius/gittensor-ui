import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from 'rehype-sanitize';

interface SafeMarkdownProps {
  children: string;
  components?: Components;
}

const safeMarkdownSchema: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: 'md-',
  tagNames: [...(defaultSchema.tagNames || []), 'input'],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className', /^language-[\w-]+$/],
    ],
    input: [
      ['type', 'checkbox'],
      ['checked', true],
      ['disabled', true],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
};

const SafeMarkdown: React.FC<SafeMarkdownProps> = ({
  children,
  components,
}) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw, [rehypeSanitize, safeMarkdownSchema]]}
    components={components}
  >
    {children}
  </ReactMarkdown>
);

export default SafeMarkdown;
