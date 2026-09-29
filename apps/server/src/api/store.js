import { listPostingsForUser, setPostingStatus, listSources } from '@jobdekho/store/dashboard.js'
import { listCompanies } from '@jobdekho/store/companies.js'
import { getUserFilters, upsertUserFilters } from '@jobdekho/store/dashboard-prefs.js'
import { getProfile, getResumeText, upsertProfile, deleteProfile } from '@jobdekho/store/profiles.js'
import { getPosting } from '@jobdekho/store/posting-lookup.js'
import { getAiResult, setAiResult, listAiResults } from '@jobdekho/store/ai-results.js'
import { getProviderPref, upsertProviderPref } from '@jobdekho/store/ai-provider-pref.js'

export function createDashboardStore(db) {
  return {
    listPostingsForUser: (userId, opts) => listPostingsForUser(db, userId, opts),
    // One posting with its full description, for the AI actions.
    getPosting: (userId, id) => getPosting(db, userId, id),
    setPostingStatus: (userId, id, status) => setPostingStatus(db, userId, id, status),
    listSources: () => listSources(db),
    listCompanies: () => listCompanies(db),
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
  }
}
