import { postingsRoutes } from './postings.js'
import { filtersRoutes } from './filters.js'
import { notificationsRoutes } from './notifications.js'
import { profileRoutes } from './profile.js'

export async function apiRoutes(app) {
  await app.register(postingsRoutes)
  await app.register(filtersRoutes)
  await app.register(notificationsRoutes)
  await app.register(profileRoutes)
}
