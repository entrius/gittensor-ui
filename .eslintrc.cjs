module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh', '@typescript-eslint', 'unused-imports'],
  rules: {
    // React - turn off fast refresh warning (dev-only concern)
    'react-refresh/only-export-components': 'off',

    // Quotes - enforce single quotes (Prettier handles this, but ESLint enforces)
    quotes: ['error', 'single', { avoidEscape: true }],

    // Unused imports - auto-fixable (this is the key rule)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],

    // No console.log left in PRs (console.warn/error are fine)
    'no-console': ['error', { allow: ['warn', 'error'] }],

    // No unnecessary template literals
    'no-useless-concat': 'error',

    // Clean code rules
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],

    // TypeScript specific - turn off any warning (too noisy for existing codebase)
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',

    // Object/array formatting
    'object-shorthand': ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',

    // Arrow function style
    'arrow-parens': ['error', 'always'],
  },
};
