import { defineWorkspace, configDefaults } from 'vitest/config'

// One `vitest run` over two environments: node for the server/scraper/core
// suites, jsdom + the React plugin for apps/web (its own config supplies both).
export default defineWorkspace([
  {
    test: {
      name: 'node',
      include: ['**/test/**/*.test.js'],
      exclude: [...configDefaults.exclude, '**/.claude/**', 'apps/web/**'],
      environment: 'node',
    },
  },
  './apps/web/vitest.config.js',
])
