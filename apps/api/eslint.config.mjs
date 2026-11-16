import globals from 'globals';
import { configuracionBase } from '../../eslint.base.mjs';

export default [
  ...configuracionBase(import.meta.dirname),
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // NestJS usa inyección por constructor con metadatos de decoradores: los
      // tipos usados en constructores deben importarse como valores.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
