import { listPostingsForUser, setPostingStatus, listSources } from '@jobdekho/store/dashboard.js'
import { listCompanies, listCompanyCounts } from '@jobdekho/store/companies.js'
import { getUserFilters, upsertUserFilters } from '@jobdekho/store/dashboard-prefs.js'
import { getProfile, getResumeText, upsertProfile, deleteProfile } from '@jobdekho/store/profiles.js'
import { getPosting, postingCards } from '@jobdekho/store/posting-lookup.js'
import { getAiResult, setAiResult, replaceAiResult, listAiResults } from '@jobdekho/store/ai-results.js'
import { getProviderPref, upsertProviderPref } from '@jobdekho/store/ai-provider-pref.js'
import { listBlockedCompanies, blockCompany, unblockCompany } from '@jobdekho/store/blocked-companies.js'
import { listMemory } from '@jobdekho/store/memory.js'
import { postingNames } from '@jobdekho/store/posting-lookup.js'
import { listTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry, trackApplied, trackMail } from '@jobdekho/store/tracker.js'
import { applyMailScan, undoMailScan } from '@jobdekho/store/tracker-scan.js'
import { lastScanOf } from '@jobdekho/store/tracker-file.js'
import { createDescriber } from '@jobdekho/scraper/describe-turn.js'
import { join } from 'node:path'
import { saveOriginal, deleteOriginal, findOriginal } from '../resume/original.js'
import { describeAndSave } from './describe-posting.js'

// `describe` is for tests; the real one is made the first time a posting
// is described, so building a store reaches for no network at all.
export function createDashboardStore(db, { describe = null } = {}) {
  let describer = describe
  return {
    listPostingsForUser: (userId, opts) => listPostingsForUser(db, userId, opts),
    // One posting with its full description, for the AI actions.
    getPosting: (userId, id) => getPosting(db, userId, id),
    // Just the names of many, and whether each was closed, for the chat list
    // (see chat/chat-view.js), which would otherwise window the corpus once
    // per chat.
    postingCards: (_userId, ids) => postingCards(db, ids),
    // Fetches a posting's missing description once (see describe-posting.js).
    describePosting: (userId, id) => describeAndSave(db, describer ??= createDescriber(db), userId, id),
    // Marking a posting Applied also starts tracking it (see the store's tracker.js).
    setPostingStatus: async (userId, id, status) => {
      await setPostingStatus(db, userId, id, status)
      const names = status === 'applied' ? postingNames(db, [id]) : null
      if (names?.has(id)) trackApplied(db, userId, { id, ...names.get(id) })
    },
    // The Tracker, on this one handle, so the Applied mark above, the page
    // and a sent mail never write it from two.
    listTracker: (userId) => listTracker(db, userId),
    addTrackerEntry: (userId, input) => addTrackerEntry(db, userId, input),
    updateTrackerEntry: (userId, id, patch) => updateTrackerEntry(db, userId, id, patch),
    removeTrackerEntry: (userId, id) => removeTrackerEntry(db, userId, id),
    trackMail: (userId, mail) => trackMail(db, userId, mail),
    // A mail scan's applications, and its one Undo (see the store's tracker-scan.js).
    applyMailScan: (userId, groups) => applyMailScan(db, userId, groups),
    undoMailScan: (userId) => undoMailScan(db, userId),
    lastMailScan: (userId) => lastScanOf(db, userId),
    listSources: () => listSources(db),
    listCompanies: () => listCompanies(db),
    listCompanyCounts: (userId, opts) => listCompanyCounts(db, userId, opts),
    // The companies the person never wants to see (see the store's
    // blocked-companies.js), which the feed and the company menu leave out.
    listBlockedCompanies: (userId) => listBlockedCompanies(db, userId),
    blockCompany: (userId, input) => blockCompany(db, userId, input),
    unblockCompany: (userId, key) => unblockCompany(db, userId, key),
    getProfile: (userId) => getProfile(db, userId),
    // Read on its own so the raw resume never rides along on a profile read.
    getResumeText: (userId) => getResumeText(db, userId),
    upsertProfile: (userId, p) => upsertProfile(db, userId, p),
    deleteProfile: (userId) => deleteProfile(db, userId),
    getUserFilters: (userId) => getUserFilters(db, userId),
    upsertUserFilters: (userId, f) => upsertUserFilters(db, userId, f),
    getAiResult: (userId, postingId, kind) => getAiResult(db, userId, postingId, kind),
    setAiResult: (userId, record) => setAiResult(db, userId, record),
    replaceAiResult: (userId, record) => replaceAiResult(db, userId, record),
    listAiResults: (userId, postingId) => listAiResults(db, userId, postingId),
    getProviderPref: (userId) => getProviderPref(db, userId),
    upsertProviderPref: (userId, p) => upsertProviderPref(db, userId, p),
    // What the chat remembers of the person, read by the resume tailoring
    // and the cover letter (see actions/memory-note.js).
    getMemory: (userId) => listMemory(db, userId),
    // The uploaded resume file itself, which Apply assist attaches when no
    // LaTeX-made PDF exists (see resume/original.js).
    saveOriginalResume: (userId, bytes) => saveOriginal(db, userId, bytes),
    deleteOriginalResume: (userId) => deleteOriginal(db, userId),
    originalResumePath: (userId) => findOriginal(db, userId),
    // Where Apply assist's browser keeps its sign-ins (see apply/profile-dir.js).
    applyBrowserDir: () => join(db.dir, 'apply-browser'),
  }
}
