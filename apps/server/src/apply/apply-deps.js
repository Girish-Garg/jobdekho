import { findBrowser } from './browser-find.js'
import { windowModeFor } from './window-mode.js'
import { launchBrowser } from './browser-launch.js'
import { reapOrphans } from './browser-reap.js'
import { keptProfileDir } from './profile-dir.js'
import { prepareFiles } from './apply-files.js'
import { greenhouseQuestions } from './greenhouse-questions.js'
import { documentStore } from '../documents/store.js'
import { compileTex } from '../resume/compile.js'
import { loadConfig } from '../config.js'

// The real world an Apply session runs in: this computer's browser, its
// window rules, the person's documents and the public Greenhouse API. Routes
// take these as one object so a test hands in fakes instead and never starts
// a browser, reads the person's files or reaches the network.
const fetchJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
  return res.ok ? res.json() : null
}

export function applyDeps(app) {
  return {
    findBrowser: () => findBrowser(),
    windowMode: () => windowModeFor(),
    launch: (options) => launchBrowser(options),
    reap: () => reapOrphans(),
    // The profile the browser keeps its sign-ins in, between applications.
    keptProfile: () => {
      const dir = app.dashboard?.applyBrowserDir?.()
      return dir ? keptProfileDir(dir) : null
    },
    // JobDekho's own port, which the Apply browser is kept away from.
    port: loadConfig().port,
    prepareFiles: ({ posting, userId, person, dir }) => prepareFiles({
      posting, userId, person, dir,
      store: documentStore(),
      compile: compileTex,
      originalPath: app.dashboard?.originalResumePath?.(userId) ?? null,
    }),
    questions: (posting) => greenhouseQuestions(posting, fetchJson),
  }
}
