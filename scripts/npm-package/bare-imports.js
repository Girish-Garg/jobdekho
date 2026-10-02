import { builtinModules } from 'node:module'

// The import and export statements and dynamic import() calls of a module,
// read off whole lines so that a sentence in a comment such as "it came from
// 'the ad'" is not taken for one.
const STATEMENTS = [
  /^\s*(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/gm,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /^\s*\}\s*from\s*['"]([^'"]+)['"]/gm,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
]

const packageOf = (specifier) => specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/')

// The npm libraries a module imports: neither a relative path nor one of
// Node's own modules. Each must be a dependency of the published package,
// or the module fails to load the moment something reaches it.
export function bareImports(source) {
  const names = new Set()
  for (const pattern of STATEMENTS) {
    for (const [, specifier] of source.matchAll(pattern)) {
      if (/^[./]/.test(specifier) || specifier.startsWith('node:') || builtinModules.includes(specifier)) continue
      names.add(packageOf(specifier))
    }
  }
  return [...names]
}
