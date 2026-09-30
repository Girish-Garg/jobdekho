import { postingsRoutes } from './postings.js'
import { filtersRoutes } from './filters.js'
import { aiProviderRoutes } from './ai-provider.js'
import { profileRoutes } from './profile.js'
import { postingAiRoutes } from './posting-ai.js'
import { resumeRoutes } from './resume.js'
import { chatRoutes } from './chat.js'
import { chatProposalRoutes } from './chat-proposals.js'
import { documentRoutes } from './documents.js'
import { documentEditRoutes } from './document-edits.js'
import { documentProfileRoutes } from './document-profile.js'
import { documentFileRoutes } from './document-files.js'
import { aiRoutes } from '../ai/routes.js'
import { createDetector } from '../ai/detect.js'
import { createSelector } from '../ai/select.js'

// JobDekho has exactly one local user (see auth/session.js), so the
// preference select.js honours is always this one person's, read fresh on
// every call rather than threaded through every route that can trigger an
// AI action. A dashboard store that predates this preference (only seen in
// tests) is treated the same as nobody having set one: 'auto'.
function preferenceReader(app) {
  return async () => {
    const userId = app.devUser?.sub
    if (!userId || typeof app.dashboard?.getProviderPref !== 'function') return null
    const pref = await app.dashboard.getProviderPref(userId)
    return pref && pref.provider !== 'auto' ? pref.provider : null
  }
}

export async function apiRoutes(app) {
  // One cached probe of the AI CLIs (see ai/detect.js) serves both the
  // settings screen and the choice of CLI for every call, so the two never
  // disagree about what is installed. Tests decorate `cli` with fakes before
  // ready() so no real binary is probed or spawned.
  const detect = createDetector(app.hasDecorator('cli') ? app.cli : {})
  app.decorate('ai', { detect, select: createSelector(detect, preferenceReader(app)) })

  await app.register(postingsRoutes)
  await app.register(filtersRoutes)
  await app.register(aiProviderRoutes)
  await app.register(profileRoutes)
  await app.register(postingAiRoutes)
  await app.register(resumeRoutes)
  await app.register(chatRoutes)
  await app.register(chatProposalRoutes)
  await app.register(documentRoutes)
  await app.register(documentEditRoutes)
  await app.register(documentProfileRoutes)
  await app.register(documentFileRoutes)
  await app.register(aiRoutes)
}
