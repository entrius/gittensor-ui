# Gittensor UI Contributor Guide

## Getting Started

Before contributing, please:

1. Read the [README](./README.md) to understand the project
2. Familiarize yourself with the tech stack (React, TypeScript, Material-UI, Vite)
3. Check existing issues, PRs, and discussions to avoid duplicate work

## Local Development

1. Ensure you have Node 20+ installed
2. Clone the repo and run `npm install`
3. Copy `.env.example` to `.env` — it defaults to the test API, which is available for contributors to develop against
4. Run `npm run dev` to start the development server

> **Note:** The backend is not open source. Contributors develop against the public test API.

## Creating Issues

When opening an issue, use the appropriate template:

- **[Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)** - Report bugs or unexpected behavior. Include steps to reproduce, expected vs actual behavior, and environment details.
- **[Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)** - Suggest new features or improvements. Explain the motivation and proposed solution.
- **Blank Issue** - For issues that don't fit the above templates.

For security vulnerabilities, **do not create a public issue**. Report them privately via [GitHub Security Advisories](https://github.com/entrius/gittensor-ui/security/advisories/new).

## Lifecycle of a Pull Request

### 1. Create Your Branch

- Branch off of `test` and target `test` with your PR
- Ensure there are no conflicts before submitting

### 2. Make Your Changes

- Write clean, well-documented code
- Follow existing code patterns and architecture
- Update documentation if applicable
- Do NOT add comments that are over-explanatory or redundant
- When making your changes, ask yourself: will this raise the value of the repository?
- Ensure `npm run build` passes before submitting

### 3. Submit Pull Request

1. Push your branch to the repository
2. Open a PR targeting the `test` branch
3. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md):
   - **Summary**: Clear description of changes
   - **Related Issues**: Link issues using `Fixes #123` or `Closes #456`
   - **Type of Change**: Select bug fix, new feature, refactor, documentation, or other
   - **Testing**: Confirm manual testing performed
   - **Checklist**: Verify code style, self-review, and documentation

### 4. Code Review

- Assign `anderdc` and `landyndev` to your PR for review

## PR Labels

Apply appropriate labels to help categorize and track your contribution:

- `bug` - Bug fixes
- `feature` - New feature additions
- `enhancement` - Improvements to existing features
- `refactor` - Code refactoring without functionality changes
- `documentation` - Documentation updates

## Code Standards

### Quality Expectations

- Follow repository conventions (commenting style, variable naming, etc.)
- Use sensible component decomposition to keep files manageable
- Write clean, readable, maintainable code
- Avoid modifying unrelated files
- Avoid adding unnecessary dependencies
- Ensure `npm run build` passes (TypeScript compilation + Vite build)

### Formatting

This project uses Prettier and ESLint for consistent code style. A GitHub Action will auto-format PRs, but you can run formatting locally:

```bash
npm run format        # Format all files
npm run lint:fix      # ESLint with auto-fix
```

## Branches

### `test`

**Purpose**: Testing and staging for main

**Restrictions**:

- Requires pull request
- Requires build to pass
- Requires one approval from either `@landyndev` or `@anderdc`

### `main`

**Purpose**: Production-ready code

**Restrictions**:

- Only maintainers can update

## License

By contributing to Gittensor UI, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Gittensor UI and helping advance open source software development!
