import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/test/**/*.test.js'],
    exclude: [...configDefaults.exclude, '**/.claude/**', 'apps/web/**'],
    environment: 'node',
  },
})
