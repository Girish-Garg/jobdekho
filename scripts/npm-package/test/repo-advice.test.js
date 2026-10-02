import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RUNTIME_WORKSPACES } from '../manifest.js'

// `npx jobdekho` runs without the repo: it has no npm scripts, ignores any
// .env (see apps/server/src/start.js), and its config files sit in npx's
// cache, replaced with each version. A sentence the app shows or the command
// prints that sends someone to one of those holds only in a clone of the
// repo and misleads everyone else, so this reads the code the package ships,
// comments left out, and names every line that does.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
// The web app ships as its build, whose sentences are written in its source.
const SHIPPED = ['bin', 'apps/web/src', ...RUNTIME_WORKSPACES.map((workspace) => `${workspace}/src`)]

const REPO_ONLY = [
  /\bnpm (?:run|start|test|install|ci)\b/,
  // A .env file, as against process.env, import.meta.env or a path to one.
  /(?<![\w$./])\.env\b/,
  // A config file named for a person to open, as against a path the code reads.
  /(?<![\w./])config\/[\w-]+\.json\b/,
]

// The source with its comments blanked, line numbers kept. A // after a
// colon is a URL's, and a /* after anything but a space or a brace is a
// glob's. A comment marker inside a string blanks the rest of that line, so
// the guard can miss a sentence that holds one, but never flags a comment.
function withoutComments(source) {
  return source
    .replace(/(^|[\s{])\/\*[\s\S]*?\*\//g, (comment, lead) => lead + comment.slice(lead.length).replace(/[^\n]/g, ''))
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function repoOnlyLines(source) {
  return withoutComments(source).split('\n')
    .map((line, i) => (REPO_ONLY.some((pattern) => pattern.test(line)) ? i + 1 : null))
    .filter(Boolean)
}

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sources(path)
    else if (/\.(?:js|jsx|mjs)$/.test(entry.name) && !entry.name.includes('.test.')) yield path
  }
}

describe('what the published package tells people', () => {
  it('sends no one to an npm script, a .env or a config file', () => {
    const offenders = []
    for (const dir of SHIPPED) {
      for (const file of sources(join(ROOT, dir))) {
        const source = readFileSync(file, 'utf8')
        const lines = source.split('\n')
        for (const n of repoOnlyLines(source)) offenders.push(`${relative(ROOT, file).split(sep).join('/')}:${n}: ${lines[n - 1].trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('reads sentences, not the comments about them, the env objects or the paths the code reads', () => {
    const source = [
      '// Same scrape as `npm run scrape`, which reads .env and config/companies.json.',
      '/* npm start, then',
      '   edit .env */',
      "const keys = process.env.ADZUNA_APP_KEY ?? import.meta.env?.VITE_KEY",
      "const FILTERS = resolve(dir, '../../config/filters.json') // see config/filters.json",
      "const site = 'https://example.com/a' // run npm run scrape",
      "const glob = '**/*.js'",
      "const FIX = 'Press Refresh now, or run \"npm run scrape\" in a terminal.'",
      "const FROM = { environment: 'the environment (.env)' }",
      "const REASON = 'the board answered 404 twice; check its name in config/companies.json'",
      '{/* not this */}<p>Copy .env.example to .env first.</p>',
    ].join('\n')
    expect(repoOnlyLines(source)).toEqual([8, 9, 10, 11])
  })
})
