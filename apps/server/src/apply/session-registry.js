import { openSession, startApplying } from './session-open.js'
import { closeSession } from './session-close.js'

// One Apply session at a time: a person applies to one job at a time, and each
// browser costs about half a gigabyte and seven or eight processes (measured).
// Opening a second while one is open is answered with the open one.
//
// A session ends when the person closes it, when nothing has been connected to
// it for IDLE_MS (the tab was closed), or at MAX_MS whatever else is going on,
// so a forgotten application never keeps a browser running.
export const IDLE_MS = 10 * 60 * 1000
export const MAX_MS = 90 * 60 * 1000

function armTimers(s) {
  s.timers.max = setTimeout(() => closeSession(s), MAX_MS)
  s.timers.max.unref?.()
  touch(s)
}

// Any sign of the person: a socket joining or a message on it.
export function touch(s) {
  clearTimeout(s.timers.idle)
  s.timers.idle = setTimeout(() => {
    if (s.sockets.size === 0) closeSession(s)
    else touch(s)
  }, IDLE_MS)
  s.timers.idle.unref?.()
}

export function createRegistry(deps) {
  let current = null
  let reaped = false
  // Opens take turns. One that arrives while a browser is still starting
  // (React mounts the panel twice in development; a person can press twice)
  // would otherwise find nothing open yet and start a second browser, and
  // the reaper below could end the one being started.
  let queue = Promise.resolve()
  const live = () => (current && !current.closing ? current : null)

  async function openOne({ posting, userId, profile }) {
    if (live()) return { conflict: current }
    // Browsers and profiles a crashed run left behind go before the first
    // new one starts, never while one of this run's is open.
    if (!reaped) {
      reaped = true
      await deps.reap().catch(() => 0)
    }
    const s = await openSession(deps, { posting, userId, profile })
    current = s
    armTimers(s)
    startApplying(s).catch(() => {})
    return { session: s }
  }

  return {
    current: live,
    get: (id) => (live()?.id === id ? current : null),
    open(request) {
      const answer = queue.then(() => openOne(request))
      queue = answer.catch(() => {})
      return answer
    },
    async close(id) {
      const s = live()
      if (!s || s.id !== id) return false
      await closeSession(s)
      return true
    },
    // Shutting down waits for an open still starting its browser, so that
    // browser is closed too rather than outliving JobDekho.
    async closeAll() {
      await queue
      if (live()) await closeSession(current)
    },
  }
}
