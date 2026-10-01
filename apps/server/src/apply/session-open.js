import { randomBytes, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { applyUrlFor, clickThrough } from './apply-url.js'
import { atsOf } from './ats-hints.js'
import { profileValues } from './profile-values.js'
import { makeProfileDir, removeProfileDir } from './profile-dir.js'
import { activate } from './session-attach.js'
import { onNavigated } from './session-scan.js'
import { fillPage, settle } from './session-fill.js'
import { pushView } from './session-view.js'
import { sleep } from './cdp-call.js'

export class ApplyError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function newSession({ posting, userId, url, mode, browserName, values }) {
  return {
    // The token is what lets the panel's socket in: the server's address is
    // no secret on this computer, the token is only ever given to JobDekho's
    // own page, over a response no other site can read.
    id: randomUUID(), token: randomBytes(32).toString('hex'),
    posting, userId, url, ats: atsOf(url), mode, browserName, values,
    state: 'starting', reason: null, pageUrl: url, title: '', rows: [], submit: null,
    sockets: new Set(), frame: null, seq: 0, dropped: 0, size: { w: 1280, h: 860 },
    results: new Map(), pages: new Map(), timers: {}, shown: false,
    picker: null, chooser: null, dialog: null, fileInfo: null, closing: false, chat: [], asking: null,
  }
}

// Opens the browser for one posting and returns as soon as it is up; the page
// loads and fills in the background (startApplying) while the panel shows it.
export async function openSession(deps, { posting, userId, profile }) {
  const browser = deps.findBrowser()
  if (!browser) throw new ApplyError('no-browser', 'Apply assist needs Google Chrome or Microsoft Edge on this computer.')
  const url = applyUrlFor(posting)
  if (!url) throw new ApplyError('not-offered', 'This posting has no web address for Apply assist to open.')
  const s = newSession({ posting, userId, url, mode: deps.windowMode(), browserName: browser.name, values: profileValues(profile) })
  // The files made for this application have a folder of their own, gone with
  // the session; the browser keeps its sign-ins in the kept profile when
  // there is one (see profile-dir.js).
  s.workDir = makeProfileDir()
  s.profileDir = deps.keptProfile?.() ?? s.workDir
  const hooks = { port: deps.port, onNavigated }
  try {
    s.files = deps.prepareFiles({ posting, userId, person: s.values.fullName, dir: join(s.workDir, 'files') }).catch(() => ({}))
    s.questions = Promise.resolve(deps.questions(posting)).catch(() => null)
    s.browser = await deps.launch({ executable: browser.path, mode: s.mode, profileDir: s.profileDir })
    await activate(s, s.browser.page, s.browser.cdp, hooks)
    followPopups(s, hooks)
  } catch (err) {
    await s.browser?.context.close().catch(() => {})
    removeProfileDir(s.workDir)
    throw err
  }
  return s
}

// A "Sign in with ..." or "Apply with LinkedIn" window opens as a new page.
// The live view follows it, since the person has to see it to use it, and
// comes back to the application when it closes.
function followPopups(s, hooks) {
  s.browser.context.on('page', async (page) => {
    if (s.closing) return
    const back = s.active
    try {
      await activate(s, page, await s.browser.context.newCDPSession(page), hooks)
      pushView(s)
    } catch {
      return
    }
    page.once('close', () => {
      if (!s.closing && s.active?.page === page) activate(s, back.page, back.cdp, hooks).then(() => pushView(s)).catch(() => {})
    })
  })
}

// Loads the posting, lets the page settle, and fills it once: opening Apply
// assist is the person's press for the first page. A person who pressed in
// the live view before that has the wheel, and nothing is filled. An
// aggregator's page is not the application: the person follows its Apply
// link first, and presses Fill this page on the form it reaches.
export async function startApplying(s) {
  await s.active.page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  await sleep(1200)
  if (s.closing || s.state !== 'starting') return
  if (clickThrough(s.posting)) return settle(s, { wall: 'click-through' })
  try {
    await fillPage(s)
  } catch {
    if (!s.closing && s.state !== 'yours') settle(s, {})
  }
}
