import { listPostingsForUser, setPostingStatus } from '@jobdekho/db/dashboard.js'
import { getUserFilters, upsertUserFilters, getNotificationPrefs, upsertNotificationPrefs } from '@jobdekho/db/dashboard-prefs.js'

export function createDashboardStore(db) {
  return {
    listPostingsForUser: (userId, opts) => listPostingsForUser(db, userId, opts),
    setPostingStatus: (userId, id, status) => setPostingStatus(db, userId, id, status),
    getUserFilters: (userId) => getUserFilters(db, userId),
    upsertUserFilters: (userId, f) => upsertUserFilters(db, userId, f),
    getNotificationPrefs: (userId) => getNotificationPrefs(db, userId),
    upsertNotificationPrefs: (userId, p) => upsertNotificationPrefs(db, userId, p),
  }
}
