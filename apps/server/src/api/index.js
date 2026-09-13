import { postingsRoutes } from './postings.js'
import { filtersRoutes } from './filters.js'
import { notificationsRoutes } from './notifications.js'
import { profileRoutes } from './profile.js'
import { postingAiRoutes } from './posting-ai.js'
import { aiRoutes } from '../ai/routes.js'

export async function apiRoutes(app) {
  await app.register(postingsRoutes)
  await app.register(filtersRoutes)
  await app.register(notificationsRoutes)
  await app.register(profileRoutes)
  await app.register(postingAiRoutes)
  await app.register(aiRoutes)
}
