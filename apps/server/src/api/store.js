import { listPostingsForUser, setPostingStatus, listSources } from '@jobdekho/store/dashboard.js'
import { listCompanies, listCompanyCounts } from '@jobdekho/store/companies.js'
import { getUserFilters, upsertUserFilters } from '@jobdekho/store/dashboard-prefs.js'
import { getProfile, getResumeText, upsertProfile, deleteProfile } from '@jobdekho/store/profiles.js'
import { getPosting } from '@jobdekho/store/posting-lookup.js'
import { getAiResult, setAiResult, listAiResults } from '@jobdekho/store/ai-results.js'
import { getProviderPref, upsertProviderPref } from '@jobdekho/store/ai-provider-pref.js'
import { listBlockedCompanies, blockCompany, unblockCompany } from '@jobdekho/store/blocked-companies.js'
import { listMemory } from '@jobdekho/store/memory.js'
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
    // Fetches a posting's missing description once (see describe-posting.js).
    describePosting: (userId, id) => describeAndSave(db, describer ??= createDescriber(db), userId, id),
    setPostingStatus: (userId, id, status) => setPostingStatus(db, userId, id, status),
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
