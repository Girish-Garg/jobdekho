import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDataDir } from './data-dir.js'
import { openCorpus } from './corpus.js'
import { userFile } from './user-file.js'
import { recordFile } from './record-file.js'
import { openRuns } from './runs.js'
import { FILES } from './files.js'
import { migrateToThreads } from './threads-migration.js'

export { FILES }

// The handle every store function takes first, in the position the Postgres
// handle used to occupy, so a call site changes only which factory it calls.
// What each file holds, and why each is a file of its own, is in files.js.
//
// The directory is created here rather than by a setup step, so a first run
// on a clean checkout just works. The chats are moved into their own files
// here too, the first time a folder from before chats owned their state is
// opened: whichever process opens the folder first does it, before anything
// reads a chat (see threads-migration.js).
export function openStore(dir) {
  const root = resolveDataDir(dir)
  mkdirSync(root, { recursive: true })
  const at = (name) => join(root, FILES[name])
  const store = {
    dir: root,
    corpus: openCorpus(at('corpus')),
    profiles: userFile(at('profiles')),
    statuses: userFile(at('statuses')),
    filters: userFile(at('filters')),
    runs: openRuns(at('runs')),
    // What the AI CLI answered about a posting, per user. Each answer cost a
    // call on the person's own subscription, which is why it is kept with
    // the things they made rather than with the corpus a scrape may reset.
    aiResults: userFile(at('aiResults')),
    // Which CLI to prefer when more than one is installed. See ai-provider-pref.js.
    aiProvider: userFile(at('aiProvider')),
    resumeSelections: userFile(at('resumeSelections')),
    chats: userFile(at('chats')),
    chatMessages: userFile(at('chatMessages')),
    documents: userFile(at('documents')),
    memory: userFile(at('memory')),
    memoryFeedback: userFile(at('memoryFeedback')),
    scrapeSettings: userFile(at('scrapeSettings')),
    blockedCompanies: userFile(at('blockedCompanies')),
    adzuna: userFile(at('adzuna')),
    linkedinGuard: recordFile(at('linkedinGuard')),
    sourceMemo: recordFile(at('sourceMemo')),
    sourceHealth: recordFile(at('sourceHealth')),
  }
  migrateToThreads(store)
  return store
}
