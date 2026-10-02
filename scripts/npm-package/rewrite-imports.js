import { posix } from 'node:path'

// Where each workspace package's code sits in the published package, which
// keeps the repo's layout. Every one exports "./*" from its src folder (see
// its package.json), so @jobdekho/core/x.js is packages/core/src/x.js.
export const PACKAGE_DIRS = {
  core: 'packages/core/src',
  store: 'packages/store/src',
  sources: 'packages/sources/src',
  scraper: 'apps/scraper/src',
}

const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])@jobdekho\/([a-z-]+)\/([^'"]+)\2/g

// In the repo, @jobdekho/core/... resolves through npm's workspace links. An
// installed package has none, so each such import becomes the relative path
// from `file` (its path inside the package, with forward slashes) to the
// module it names. Throws on a workspace package the package does not ship.
export function rewriteImports(source, file) {
  return source.replace(SPECIFIER, (match, lead, quote, pkg, rest) => {
    const dir = PACKAGE_DIRS[pkg]
    if (!dir) throw new Error(`${file}: imports @jobdekho/${pkg}, which the package does not ship`)
    const path = posix.relative(posix.dirname(file), posix.join(dir, rest))
    return `${lead}${quote}${path.startsWith('.') ? path : `./${path}`}${quote}`
  })
}

// Whether a module still names a workspace package in quotes, which would
// fail to resolve once installed.
export const namesWorkspace = (source) => /['"]@jobdekho\//.test(source)
