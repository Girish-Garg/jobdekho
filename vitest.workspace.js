import { defineWorkspace, configDefaults } from 'vitest/config'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// One `vitest run` over two environments: node for the server/scraper/core
// suites, jsdom + the React plugin for apps/web (its own config supplies both).
//
// A route a test builds without handing it a store of its own opens the
// default data folder. Pointed at a temporary one, that is never the
// person's real data folder, which opening would otherwise move into the
// new chat files (see packages/store/src/threads-migration.js).
export default defineWorkspace([
  {
    test: {
      name: 'node',
      include: ['**/test/**/*.test.js'],
      exclude: [...configDefaults.exclude, '**/.claude/**', 'apps/web/**'],
      environment: 'node',
      env: { JOBDEKHO_DATA_DIR: join(tmpdir(), 'jobdekho-test-data') },
    },
  },
  './apps/web/vitest.config.js',
])
