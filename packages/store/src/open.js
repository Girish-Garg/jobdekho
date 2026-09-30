import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDataDir } from './data-dir.js'
import { openCorpus } from './corpus.js'
import { userFile } from './user-file.js'
import { recordFile } from './record-file.js'
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
  runs: 'runs.ndjson',
  aiResults: 'ai-results.json',
  aiProvider: 'ai-provider.json',
  // Which template and entries the resume builder should render. Compiled
  // PDFs are cached beside this, under a resumes/<userId>/ directory the
  // same handle's `dir` points at (see apps/server/src/resume/cache.js).
  resumeSelections: 'resume-selection.json',
  // The chat panel's conversation, kept with the other things the person
  // made rather than with the corpus a scrape may reset. See chat-history.js.
  chatHistory: 'chat-history.json',
  // The conversations filed away with "Start a new one", in a file of their
  // own so each answer rewrites only the current one. See chat-archive.js.
  chatArchive: 'chat-archive.json',
  // The person's resumes and cover letters as LaTeX sources they own, each
  // with its recent versions. See documents.js.
  documents: 'documents.json',
  // Whether the running server refreshes postings on its own once a day.
  // See apps/server/src/scrape/prefs.js.
  scrapeSettings: 'scrape-settings.json',
  // The person's own Adzuna app id and key, pasted into Settings. A file of
  // its own because it is a secret: the others can be opened, shared or
  // attached to a bug report without handing it over. See adzuna-keys.js.
  adzuna: 'adzuna-key.json',
  // When LinkedIn was last read and whether it has told this computer to
  // back off. One record, not one per user: LinkedIn limits the address.
  // See apps/scraper/src/linkedin-guard.js.
  linkedinGuard: 'linkedin-guard.json',
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
    runs: openRuns(at('runs')),
    // What the AI CLI answered about a posting, per user. Each answer cost a
    // call on the person's own subscription, which is why it is kept with
    // the things they made rather than with the corpus a scrape may reset.
    aiResults: userFile(at('aiResults')),
    // Which CLI to prefer when more than one is installed. See ai-provider-pref.js.
    aiProvider: userFile(at('aiProvider')),
    resumeSelections: userFile(at('resumeSelections')),
    chatHistory: userFile(at('chatHistory')),
    chatArchive: userFile(at('chatArchive')),
    documents: userFile(at('documents')),
    scrapeSettings: userFile(at('scrapeSettings')),
    adzuna: userFile(at('adzuna')),
    linkedinGuard: recordFile(at('linkedinGuard')),
  }
}
