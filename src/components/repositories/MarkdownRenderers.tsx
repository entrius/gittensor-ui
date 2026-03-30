import React from 'react';

export const createLinkRenderer = (repositoryFullName: string, defaultBranch: string) => {
  const LinkRenderer = (props: any) => {
    const { href, children, ...rest } = props;
    let finalHref = href;

    if (
      href &&
      !href.startsWith('http') &&
      !href.startsWith('//') &&
      !href.startsWith('#') &&
      !href.startsWith('mailto:')
    ) {
      const cleanPath = href.startsWith('./')
        ? href.slice(2)
        : href.startsWith('/')
          ? href.slice(1)
          : href;
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath.replace(/\/$/, ''));
      const isDirectory = cleanPath.endsWith('/') || !hasExtension;
      const type = isDirectory ? 'tree' : 'blob';
      const normalizedPath = cleanPath.replace(/\/$/, '');
      finalHref = `https://github.com/${repositoryFullName}/${type}/${defaultBranch}/${normalizedPath}`;
    }

    return (
      <a href={finalHref} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  };
  return LinkRenderer;
};

export const createImageRenderer = (repositoryFullName: string, defaultBranch: string) => {
  const ImageRenderer = (props: any) => {
    const { src, alt, ...rest } = props;
    let finalSrc = src;

    if (src && !src.startsWith('http') && !src.startsWith('//')) {
      const cleanPath = src.startsWith('./')
        ? src.slice(2)
        : src.startsWith('/')
          ? src.slice(1)
          : src;
      finalSrc = `https://cdn.jsdelivr.net/gh/${repositoryFullName}@${defaultBranch}/${cleanPath}`;
    }

    return (
      <img
        src={finalSrc}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '6px',
          margin: '16px 0',
        }}
        {...rest}
      />
    );
  };
  return ImageRenderer;
};
