// Every file the store owns, by the name the code knows it under. Two kinds
// of data, never in one file. postings.ndjson is the corpus: big,
// regenerable, rewritten whole by every scrape, safe to delete. The rest is
// what the user made by hand, tiny and irreplaceable, and each is rewritten
// only when it changes. Keeping them apart is what guarantees that wiping the
// corpus cannot take a resume with it, and that saving one job does not
// rewrite 6.6MB.
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
  // The person's chats, one record each, and every chat's turns in a file
  // of their own, so renaming or marking a chat seen never rewrites the
  // conversations. See chats.js and chat-messages.js.
  chats: 'chats.json',
  chatMessages: 'chat-messages.json',
  // The single conversation and the filed ones from before chats owned
  // their state. Only the move into chats reads them, once, and nothing
  // writes them again (see threads-migration.js).
  chatHistory: 'chat-history.json',
  chatArchive: 'chat-archive.json',
  // The person's resumes and cover letters as LaTeX sources they own, each
  // with its recent versions. See documents.js.
  documents: 'documents.json',
  // What the chat remembers of the person's lasting preferences, each line
  // saved by their own click or their own "remember". See memory.js.
  memory: 'memory.json',
  // Whether the running server refreshes postings on its own once a day.
  // See apps/server/src/scrape/prefs.js.
  scrapeSettings: 'scrape-settings.json',
  // The companies the person never wants to see again, and whether their own
  // careers pages are still read. See blocked-companies.js.
  blockedCompanies: 'blocked-companies.json',
  // The person's own Adzuna app id and key, pasted into Settings. A file of
  // its own because it is a secret: the others can be opened, shared or
  // attached to a bug report without handing it over. See adzuna-keys.js.
  adzuna: 'adzuna-key.json',
  // When LinkedIn was last read and whether it has told this computer to
  // back off. One record, not one per user: LinkedIn limits the address.
  // See apps/scraper/src/linkedin-guard.js.
  linkedinGuard: 'linkedin-guard.json',
  // What each source remembers between runs (a board's ETag, a Workday
  // tenant's India facets), and how each has been faring (failure streaks,
  // pauses). Both belong to the computer, like LinkedIn's guard. See the
  // scraper's source-memo.js and source-guard.js.
  sourceMemo: 'source-memo.json',
  sourceHealth: 'source-health.json',
}

// Where the move into chats keeps a file exactly as it found it, beside the
// original: chat-history.json is kept as chat-history.pre-threads.json.
export const backupName = (name) => name.replace(/\.json$/, '.pre-threads.json')
