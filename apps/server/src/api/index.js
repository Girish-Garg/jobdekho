import { postingsRoutes } from './postings.js'
import { blockedCompanyRoutes } from './blocked-companies.js'
import { filtersRoutes } from './filters.js'
import { aiProviderRoutes } from './ai-provider.js'
import { profileRoutes } from './profile.js'
import { postingAiRoutes } from './posting-ai.js'
import { resumeRoutes } from './resume.js'
import { chatRoutes } from './chats.js'
import { chatProposalRoutes } from './chat-proposals.js'
import { madeByAiRoutes } from './made-by-ai.js'
import { memoryRoutes } from './memory.js'
import { documentRoutes } from './documents.js'
import { documentEditRoutes } from './document-edits.js'
import { documentProfileRoutes } from './document-profile.js'
import { documentFileRoutes } from './document-files.js'
import { aiRoutes } from '../ai/routes.js'
import { setupRoutes } from './setup.js'
import { scrapeRoutes } from './scrape.js'
import { adzunaRoutes } from './adzuna.js'
import { logoRoutes } from './logos.js'
import { applyRoutes } from './apply.js'
import { createDetector } from '../ai/detect.js'
import { createSelector } from '../ai/select.js'
import { chatDeps } from '../chat/deps.js'

// JobDekho has exactly one local user (see auth/session.js), so the
// preference select.js honours is always this one person's, read fresh on
// every call rather than threaded through every route that can trigger an
// AI action. A dashboard store that predates this preference (only seen in
// tests) is treated the same as nobody having set one: 'auto'.
function preferenceReader(app) {
  return async () => {
    const userId = app.devUser?.sub
    if (!userId || typeof app.dashboard?.getProviderPref !== 'function') return null
    return app.dashboard.getProviderPref(userId)
  }
}

// The chooser every AI call goes through: the saved provider first when it
// can take the action, and the model saved for whichever AI answers (see
// ai/select.js).
function selector(app, detect) {
  const read = preferenceReader(app)
  const preferred = async () => {
    const pref = await read()
    return pref && pref.provider !== 'auto' ? pref.provider : null
  }
  const model = async (providerId) => (await read())?.models?.[providerId] ?? null
  return createSelector(detect, preferred, model)
}

export async function apiRoutes(app) {
  // One cached probe of the AI CLIs (see ai/detect.js) serves both the
  // settings screen and the choice of CLI for every call, so the two never
  // disagree about what is installed. Tests decorate `cli` with fakes before
  // ready() so no real binary is probed or spawned.
  const detect = createDetector(app.hasDecorator('cli') ? app.cli : {})
  app.decorate('ai', { detect, select: selector(app, detect) })
  // What the chats and the posting actions share (see chat/deps.js).
  app.decorate('chats', chatDeps(app))

  await app.register(postingsRoutes)
  await app.register(blockedCompanyRoutes)
  await app.register(filtersRoutes)
  await app.register(aiProviderRoutes)
  await app.register(profileRoutes)
  await app.register(postingAiRoutes)
  await app.register(resumeRoutes)
  await app.register(chatRoutes)
  await app.register(chatProposalRoutes)
  await app.register(madeByAiRoutes)
  await app.register(memoryRoutes)
  await app.register(documentRoutes)
  await app.register(documentEditRoutes)
  await app.register(documentProfileRoutes)
  await app.register(documentFileRoutes)
  await app.register(aiRoutes)
  await app.register(setupRoutes)
  await app.register(scrapeRoutes)
  await app.register(adzunaRoutes)
  await app.register(logoRoutes)
  if (app.applyAssist) await app.register(applyRoutes)
}
