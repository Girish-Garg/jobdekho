// The workspaces whose code the published package runs. apps/web ships as
// its built files alone, so its libraries are build tools, not the package's.
export const RUNTIME_WORKSPACES = ['apps/server', 'apps/scraper', 'packages/core', 'packages/sources', 'packages/store']

const DESCRIPTION = 'A job finder for the Indian tech market that runs on your own computer: '
  + 'it gathers postings from company careers pages and job boards, ranks them against your profile, '
  + 'and uses the AI CLI you already have.'

// The published package.json, from the repo root's (name, version, author,
// license, Node) and the runtime workspaces' (every library they import from
// npm, at the range they ask for). Two workspaces asking for one library at
// different ranges is an error rather than a guess at which one wins.
export function publishManifest(root, workspaces) {
  const dependencies = {}
  for (const workspace of workspaces) {
    for (const [name, range] of Object.entries(workspace.dependencies ?? {})) {
      if (name.startsWith('@jobdekho/')) continue
      if (dependencies[name] && dependencies[name] !== range) {
        throw new Error(`${name} is asked for at both ${dependencies[name]} and ${range}`)
      }
      dependencies[name] = range
    }
  }
  return {
    name: root.name,
    version: root.version,
    description: DESCRIPTION,
    keywords: ['jobs', 'job-search', 'india', 'internships', 'local-first', 'ai', 'resume', 'cli'],
    author: root.author,
    license: root.license,
    type: 'module',
    bin: { jobdekho: 'bin/jobdekho.js' },
    engines: root.engines,
    repository: { type: 'git', url: 'git+https://github.com/Girish-Garg/jobdekho.git' },
    homepage: 'https://github.com/Girish-Garg/jobdekho#readme',
    dependencies: Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b))),
  }
}
