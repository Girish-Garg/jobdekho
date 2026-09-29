import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { runCli } from './spawn.js'

// Antigravity takes its toolset from an agent file in the directory it runs
// in, and says which agent it actually ran only in its log (see
// agy-agent.js). Both live in the call's own directory: the files are written
// before the CLI starts, and the ones named in `collect` are read back before
// the directory is removed. A CLI that needs neither runs exactly as before.
//
// `files` and `collect` come from the provider registry, never from a
// request, so every path here is a fixed name inside `cwd`.
export async function runStaged({ files = {}, collect = [], cwd, ...opts }, spawnCli = runCli) {
  for (const [path, text] of Object.entries(files)) {
    const file = join(cwd, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
  const result = await spawnCli({ ...opts, cwd })
  if (!collect.length) return result
  return { ...result, collected: await readAll(cwd, collect) }
}

// A file the CLI never wrote reads as empty, and the check that wanted it
// decides what empty means.
async function readAll(cwd, names) {
  const texts = await Promise.all(names.map((name) => readFile(join(cwd, name), 'utf8').catch(() => '')))
  return Object.fromEntries(names.map((name, i) => [name, texts[i]]))
}
