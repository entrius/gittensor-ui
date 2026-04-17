import path from 'path';
import process from 'process';

function toRelativePaths(filenames) {
  const cwd = process.cwd();
  return filenames.map((f) => path.relative(cwd, f));
}

function buildEslintCommand(filenames) {
  const files = toRelativePaths(filenames).join(' ');
  return `eslint --fix --max-warnings 0 ${files}`;
}

function buildPrettierCommand(filenames) {
  return `prettier --write ${filenames.join(' ')}`;
}

export default {
  '*.{ts,tsx}': (filenames) => [
    buildEslintCommand(filenames),
    buildPrettierCommand(filenames),
  ],
  '*.{js,jsx,mjs}': (filenames) => [
    buildEslintCommand(filenames),
    buildPrettierCommand(filenames),
  ],
  '*.{json,css,html,md}': (filenames) => [buildPrettierCommand(filenames)],
};
