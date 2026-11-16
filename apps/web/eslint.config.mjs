import angular from 'angular-eslint';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { configuracionBase } from '../../eslint.base.mjs';

export default tseslint.config(
  ...configuracionBase(import.meta.dirname),
  {
    files: ['**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ap', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ap', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
);
