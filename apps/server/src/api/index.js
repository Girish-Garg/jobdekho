import { postingsRoutes } from './postings.js'
import { filtersRoutes } from './filters.js'
import { notificationsRoutes } from './notifications.js'
import { profileRoutes } from './profile.js'
import { postingAiRoutes } from './posting-ai.js'
import { aiRoutes } from '../ai/routes.js'
import { createDetector } from '../ai/detect.js'
import { createSelector } from '../ai/select.js'

export async function apiRoutes(app) {
  // One cached probe of the AI CLIs (see ai/detect.js) serves both the
  // settings screen and the choice of CLI for every call, so the two never
  // disagree about what is installed. Tests decorate `cli` with fakes before
  // ready() so no real binary is probed or spawned.
  const detect = createDetector(app.hasDecorator('cli') ? app.cli : {})
  app.decorate('ai', { detect, select: createSelector(detect) })

  await app.register(postingsRoutes)
  await app.register(filtersRoutes)
  await app.register(notificationsRoutes)
  await app.register(profileRoutes)
  await app.register(postingAiRoutes)
  await app.register(aiRoutes)
}
