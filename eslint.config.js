import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
export default [
  { ignores: ['**/node_modules/**', '**/dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    // Mongosh scripts: run with `mongosh`, not Node, as classic scripts.
    files: ['db schema/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        db: 'readonly',
        print: 'readonly',
        printjson: 'readonly',
        use: 'readonly',
        ObjectId: 'readonly',
        ISODate: 'readonly',
        UUID: 'readonly',
        NumberDecimal: 'readonly',
        NumberLong: 'readonly',
        NumberInt: 'readonly',
      },
    },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_' },
      ],
    },
  },
];
