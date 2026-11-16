// Configuración base de ESLint compartida por todo el monorepo.
// Cada paquete la importa desde su propio eslint.config.mjs y agrega sus reglas.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * @param {string} tsconfigRootDir carpeta del paquete (import.meta.dirname)
 */
export function configuracionBase(tsconfigRootDir) {
  return tseslint.config(
    { ignores: ['dist/**', 'coverage/**', '.angular/**', 'node_modules/**'] },
    {
      files: ['**/*.ts'],
      extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        eqeqeq: ['error', 'always'],
      },
    },
    {
      files: ['**/*.mjs', '**/*.js'],
      extends: [js.configs.recommended],
    },
    prettier,
  );
}
