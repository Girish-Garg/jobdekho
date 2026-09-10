import { listPostingsForUser, setPostingStatus, listSources } from '@jobdekho/store/dashboard.js'
import { getUserFilters, upsertUserFilters, getNotificationPrefs, upsertNotificationPrefs } from '@jobdekho/store/dashboard-prefs.js'
import { getProfile, getResumeText, upsertProfile, deleteProfile } from '@jobdekho/store/profiles.js'

export function createDashboardStore(db) {
  return {
    listPostingsForUser: (userId, opts) => listPostingsForUser(db, userId, opts),
    setPostingStatus: (userId, id, status) => setPostingStatus(db, userId, id, status),
    listSources: () => listSources(db),
    getProfile: (userId) => getProfile(db, userId),
    // Read on its own so the raw resume never rides along on a profile read.
    getResumeText: (userId) => getResumeText(db, userId),
    upsertProfile: (userId, p) => upsertProfile(db, userId, p),
    deleteProfile: (userId) => deleteProfile(db, userId),
    getUserFilters: (userId) => getUserFilters(db, userId),
    upsertUserFilters: (userId, f) => upsertUserFilters(db, userId, f),
    getNotificationPrefs: (userId) => getNotificationPrefs(db, userId),
    upsertNotificationPrefs: (userId, p) => upsertNotificationPrefs(db, userId, p),
  }
}
