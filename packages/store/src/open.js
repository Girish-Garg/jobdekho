import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDataDir } from './data-dir.js'
import { openCorpus } from './corpus.js'
import { userFile } from './user-file.js'
import { openRuns } from './runs.js'

// The handle every store function takes first, in the position the Postgres
// handle used to occupy, so a call site changes only which factory it calls.
//
// Two kinds of data, never in one file. postings.ndjson is the corpus: big,
// regenerable, rewritten whole by every scrape, safe to delete. The rest is
// what the user made by hand, tiny and irreplaceable, and each is rewritten
// only when it changes. Keeping them apart is what guarantees that wiping the
// corpus cannot take a resume with it, and that saving one job does not
// rewrite 6.6MB.
//
// The directory is created here rather than by a setup step, so a first run
// on a clean checkout just works.
export const FILES = {
  corpus: 'postings.ndjson',
  profiles: 'profile.json',
  statuses: 'statuses.json',
  filters: 'filters.json',
  notifications: 'notifications.json',
  users: 'users.json',
  runs: 'runs.ndjson',
}

export function openStore(dir) {
  const root = resolveDataDir(dir)
  mkdirSync(root, { recursive: true })
  const at = (name) => join(root, FILES[name])
  return {
    dir: root,
    corpus: openCorpus(at('corpus')),
    profiles: userFile(at('profiles')),
    statuses: userFile(at('statuses')),
    filters: userFile(at('filters')),
    notifications: userFile(at('notifications')),
    // Only written when somebody signs in with Google. A local install sets
    // DEV_AUTH_USER_ID instead and this file never appears.
    users: userFile(at('users')),
    runs: openRuns(at('runs')),
  }
}
