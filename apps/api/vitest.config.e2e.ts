import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Las pruebas e2e comparten una base de datos: se ejecutan en serie.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
