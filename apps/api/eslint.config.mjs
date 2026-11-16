import globals from 'globals';
import { configuracionBase } from '../../eslint.base.mjs';

export default [
  ...configuracionBase(import.meta.dirname),
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS usa clases con decoradores e inyección por constructor; los imports
      // de tipos usados en metadatos de decoradores deben ser imports de valor.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['src/database/migrations/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
];
