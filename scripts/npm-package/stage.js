import { execSync } from 'node:child_process'
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteImports, namesWorkspace } from './rewrite-imports.js'
import { publishManifest, RUNTIME_WORKSPACES } from './manifest.js'
import { bareImports } from './bare-imports.js'

// Builds the npm package `jobdekho` into dist/npm, ready for
// `npm publish ./dist/npm`; the ./ matters, since without it npm reads
// dist/npm as a GitHub repository's owner/name.
// It holds what the command runs, each folder where it sits in the repo, so
// every path the code works out from its own folder (the web build,
// config/, the LaTeX templates) lands the same once installed.
// Usage: npm run pack:npm [-- --skip-build] [-- --tgz]
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const OUT = join(ROOT, 'dist', 'npm')
// The code the command runs in Node. Beside it go the web build (browser
// code, already bundled), the config the scraper reads, and the docs.
const NODE_CODE = ['bin', 'apps/server/src', 'apps/scraper/src', 'packages/core/src', 'packages/sources/src', 'packages/store/src']
const COPY = [...NODE_CODE, 'apps/web/dist', 'config', 'README.md', 'LICENSE']

const flags = new Set(process.argv.slice(2))
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'))

if (!flags.has('--skip-build')) execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })
rmSync(OUT, { recursive: true, force: true })
for (const path of COPY) cpSync(join(ROOT, path), join(OUT, path), { recursive: true })

const manifest = publishManifest(readJson('package.json'), RUNTIME_WORKSPACES.map((ws) => readJson(`${ws}/package.json`)))
writeFileSync(join(OUT, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const problems = []
for (const dir of NODE_CODE) {
  for (const file of jsFiles(join(OUT, dir))) {
    const path = relative(OUT, file).split(sep).join('/')
    const text = rewriteImports(readFileSync(file, 'utf8'), path)
    if (namesWorkspace(text)) problems.push(`${path}: still imports a @jobdekho/ package by name`)
    for (const name of bareImports(text)) {
      if (!manifest.dependencies[name]) problems.push(`${path}: imports ${name}, which the package does not depend on`)
    }
    writeFileSync(file, text)
  }
}
if (problems.length) {
  console.error(`The package would not run once installed:\n${problems.join('\n')}`)
  process.exit(1)
}
if (flags.has('--tgz')) execSync('npm pack --pack-destination ..', { cwd: OUT, stdio: 'inherit' })
console.log(`Staged ${manifest.name}@${manifest.version} in ${relative(ROOT, OUT)}`)

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* jsFiles(path)
    else if (entry.name.endsWith('.js')) yield path
  }
}
