import { describe, it, expect } from 'vitest'
import { rewriteImports, namesWorkspace } from '../rewrite-imports.js'
import { publishManifest } from '../manifest.js'
import { bareImports } from '../bare-imports.js'

describe('rewriting workspace imports for the published package', () => {
  it('turns each @jobdekho/ import into the relative path to its file', () => {
    const source = [
      "import { openStore } from '@jobdekho/store/open.js'",
      "import { filter } from \"@jobdekho/core/filter.js\"",
      "const importScraper = () => import('@jobdekho/scraper/scrape.js')",
      "export { http } from '@jobdekho/sources/http.js'",
    ].join('\n')
    expect(rewriteImports(source, 'apps/server/src/scrape/run.js')).toBe([
      "import { openStore } from '../../../../packages/store/src/open.js'",
      "import { filter } from \"../../../../packages/core/src/filter.js\"",
      "const importScraper = () => import('../../../scraper/src/scrape.js')",
      "export { http } from '../../../../packages/sources/src/http.js'",
    ].join('\n'))
  })

  it('keeps a path inside its own package relative, and leaves other imports alone', () => {
    expect(rewriteImports("import { x } from '@jobdekho/core/families.js'", 'packages/core/src/filter.js'))
      .toBe("import { x } from './families.js'")
    expect(rewriteImports("import Fastify from 'fastify'\n// see @jobdekho/store/open.js", 'bin/jobdekho.js'))
      .toBe("import Fastify from 'fastify'\n// see @jobdekho/store/open.js")
  })

  it('refuses a workspace package the published package does not ship', () => {
    expect(() => rewriteImports("import x from '@jobdekho/web/main.jsx'", 'bin/jobdekho.js')).toThrow(/@jobdekho\/web/)
    expect(namesWorkspace("const name = '@jobdekho/core/x.js'")).toBe(true)
    expect(namesWorkspace("import x from '../core/x.js'")).toBe(false)
  })
})

describe('the published package.json', () => {
  const root = { name: 'jobdekho', version: '0.1.0', author: 'A', license: 'MIT', engines: { node: '>=22' } }

  it('runs the command on Node 22 with every library the workspaces import, sorted', () => {
    const manifest = publishManifest(root, [
      { dependencies: { fastify: '^5.1.0', '@jobdekho/core': '*' } },
      { dependencies: { cheerio: '^1.0.0', fastify: '^5.1.0' } },
    ])
    expect(manifest).toMatchObject({ name: 'jobdekho', version: '0.1.0', license: 'MIT', bin: { jobdekho: 'bin/jobdekho.js' }, engines: { node: '>=22' } })
    expect(manifest.dependencies).toEqual({ cheerio: '^1.0.0', fastify: '^5.1.0' })
  })

  it('will not pick between two ranges asked for one library', () => {
    expect(() => publishManifest(root, [{ dependencies: { fastify: '^5.1.0' } }, { dependencies: { fastify: '^4.0.0' } }]))
      .toThrow('fastify is asked for at both ^5.1.0 and ^4.0.0')
  })
})

describe('the npm libraries a module imports', () => {
  it('reads statements and dynamic imports, not sentences that only look like them', () => {
    const source = [
      "import Fastify from 'fastify'",
      "import { load } from 'cheerio/slim'",
      "import cookie from '@fastify/cookie'",
      'import {',
      '  extractText,',
      "} from 'unpdf'",
      "import { join } from 'node:path'",
      "import { readFileSync } from 'fs'",
      "import { x } from './x.js'",
      "const lazy = () => import('playwright-core')",
      "// a pay range that came from 'the ad said mid'",
    ].join('\n')
    expect(bareImports(source).sort()).toEqual(['@fastify/cookie', 'cheerio', 'fastify', 'playwright-core', 'unpdf'])
  })
})
