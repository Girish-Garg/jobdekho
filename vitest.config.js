import { defineConfig } from 'vitest/config'

// Suites are defined per environment in vitest.workspace.js; this file only
// points at it so `vitest run` picks up both projects.
export default defineConfig({
  test: {
    workspace: './vitest.workspace.js',
  },
})
