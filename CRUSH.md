# Gittensor UI - Development Guide

## Commands
- **Dev**: `yarn dev` (runs on port 8080)
- **Build**: `yarn build` (TypeScript compile + Vite build)
- **Lint**: `yarn lint` (ESLint with max 0 warnings)
- **Preview**: `yarn preview` (production preview)
- **Type check**: `tsc --noEmit` (verify TypeScript types)

## Tech Stack
- React 18 + TypeScript (strict mode enabled)
- Vite + SWC for fast builds
- Material-UI v5 (@mui/material, @emotion)
- React Router v6, TanStack Query v5, Axios
- ECharts for data visualization

## Design System

### Color Palette
- **Logo Gradient**: `linear-gradient(90deg, #031cdc, #000000)` (Blue to Black)
- **Black** (Main): `#000000`
- **Grey** (Accent): `#3d3d3d`
- **Blue** (Main): `#031cdc`
- **White**: `#ffffff`
- **Yellow** (Accent): `#fff3d10`

### Typography (see TYPOGRAPHY.md)
- **Headings**: CY Grotesk Grand (h1-h6)
- **Body**: Inter (body text, buttons, UI)
- **Accent/Data**: Jet Brains Mono (metrics, data values, code)
- Apply accent font via: `sx={{ fontFamily: '"JetBrains Mono", monospace' }}`
- Use `variant="dataValue"` or `variant="dataLabel"` for data/metrics

### Design Principles
- Sleek, futuristic, sustainable, minimal aesthetic
- Clean rounded borders (borderRadius: 3)
- Subtle borders with divider colors
- No elevation/shadows (elevation={0})

## Code Style

### Imports
- React first, then third-party libraries (MUI, router, etc.), then local imports
- Use named exports from barrel files (index.ts)
- Example: `import { AppLayout } from "./components/layout"`

### Components
- Functional components with `React.FC` type
- Props interfaces named `{ComponentName}Props`
- Default export for components, named exports for utilities
- Use MUI's `sx` prop for styling (no inline styles or CSS files except index.css)

### TypeScript
- Strict mode enabled, no implicit any
- Define interfaces for all props and API responses
- Use optional chaining and nullish coalescing (`?.`, `??`)
- Generic types for reusable hooks (e.g., `useApiQuery<TResponse, TSelect>`)

### API & Data Fetching
- Use TanStack Query hooks via `useApiQuery` wrapper
- API hooks in `src/api/` with `use` prefix
- Base URL from env: `VITE_BASE_URL`
- Models in `src/api/models/`

### Naming
- Components: PascalCase (e.g., `KpiCard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useOnNavigate`)
- Files: match component/hook name exactly
- Variants: lowercase strings (e.g., `variant="large"`)

### Error Handling
- Use AxiosError type for API errors
- Handle loading/error states in components consuming queries
- Fallback UI with Suspense boundaries

## Environment
- Node 18+ required
- Create `.env` with: `VITE_REACT_APP_BASE_URL=http://localhost:<PORT>`
