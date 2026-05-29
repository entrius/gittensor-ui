import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  title?: string;
}

const sharedStyle = { flexShrink: 0, display: 'block' } as const;

export const GhPrIcon: React.FC<IconProps> = ({
  size = 14,
  color = 'currentColor',
  title,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    aria-hidden={!title}
    role={title ? 'img' : undefined}
    style={sharedStyle}
  >
    {title && <title>{title}</title>}
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
  </svg>
);

export const GhIssueIcon: React.FC<IconProps> = ({
  size = 14,
  color = 'currentColor',
  title,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    aria-hidden={!title}
    role={title ? 'img' : undefined}
    style={sharedStyle}
  >
    {title && <title>{title}</title>}
    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path
      fillRule="evenodd"
      d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"
    />
  </svg>
);
