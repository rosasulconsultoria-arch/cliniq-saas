import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: './__tests__/e2e/setup.ts',
    // Vitest 4: singleFork é top-level (poolOptions foi removido)
    pool: 'forks',
    singleFork: true,
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
