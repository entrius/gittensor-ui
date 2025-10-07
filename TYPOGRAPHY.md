# Typography System

Our design uses a three-font system for a sleek, sustainable, futuristic, and minimalist aesthetic.

## Fonts

- **Heading**: CY Grotesk Grand - Used for all headings (h1-h6)
- **Body**: Inter - Used for all body text, buttons, and UI elements
- **Accent**: JetBrains Mono - Used for data values, metrics, and numerical content

## Usage

### Standard Typography

All standard MUI Typography components automatically use the correct fonts:

```tsx
<Typography variant="h1">Heading</Typography>  // CY Grotesk Grand
<Typography variant="body1">Body text</Typography>  // Inter
```

### Data & Metrics

For numerical data, metrics, and technical content, use custom variants:

```tsx
// Data values (numbers, metrics)
<Typography variant="dataValue">1,234</Typography>

// Data labels (table headers, metric labels)
<Typography variant="dataLabel">Total Commits</Typography>
```

### Custom Implementation

If you need the accent font outside of Typography:

```tsx
// Using sx prop
<Box sx={{ fontFamily: '"JetBrains Mono", monospace' }}>Content</Box>

// Using CSS variable
<div style={{ fontFamily: 'var(--font-accent)' }}>Content</div>

// Using className
<div className="font-accent">Content</div>
```

## CSS Variables

Available in `src/index.css`:

- `--font-heading`: CY Grotesk Grand
- `--font-body`: Inter
- `--font-accent`: JetBrains Mono

## Theme Configuration

Typography is centrally configured in `src/theme.ts`. To update fonts site-wide, modify this file.

### Custom Variants

Two custom Typography variants are defined:

1. **dataValue**: Monospace font for numerical values and metrics
   - Font: JetBrains Mono
   - Weight: 500
   - Letter spacing: 0.02em

2. **dataLabel**: Monospace font for data labels and headers
   - Font: JetBrains Mono
   - Size: 0.75rem
   - Weight: 400
   - Letter spacing: 0.05em
   - Transform: uppercase

## Mobile Responsiveness

All fonts are optimized for both desktop and mobile:
- Proper fallback fonts ensure loading performance
- Letter spacing adjusted for readability
- Font weights optimized for various screen sizes
