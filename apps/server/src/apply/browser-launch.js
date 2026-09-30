import { chromium } from 'playwright-core'
import { launchFlags, forbiddenIn } from './browser-flags.js'
import { writePreferences } from './browser-prefs.js'
import { placeWindow } from './window-mode.js'
import { send } from './cdp-call.js'

// Starts the person's own Chrome or Edge for one application, over a pipe
// (no debugging port for another program to find), with Chrome's sandbox on
// and every Playwright default replaced by JobDekho's own flags. The command
// line the browser actually received is then read back and checked: a flag
// added by anyone along the way (a library default, a wrapper) is caught
// here, and the browser is closed rather than used.
export async function launchBrowser({ executable, mode, profileDir, engine = chromium }) {
  writePreferences(profileDir)
  const context = await engine.launchPersistentContext(profileDir, {
    executablePath: executable,
    headless: mode === 'headless',
    chromiumSandbox: true,
    ignoreDefaultArgs: true,
    args: launchFlags({ profileDir, mode }),
    viewport: null,
    acceptDownloads: false,
    timeout: 30000,
  })
  try {
    const page = context.pages()[0] ?? await context.newPage()
    const cdp = await context.newCDPSession(page)
    const { arguments: line } = await send(cdp, 'Browser.getBrowserCommandLine')
    const bad = forbiddenIn(line)
    if (bad) throw new Error(`The browser started with ${bad}, which Apply assist does not allow, so it was closed.`)
    if (mode === 'minimized') await placeWindow(cdp, mode, false)
    // The page behaves as focused while hidden: some forms only react to
    // input, and only show their own validation, when they think they are.
    await send(cdp, 'Emulation.setFocusEmulationEnabled', { enabled: true })
    return { context, page, cdp }
  } catch (err) {
    await context.close().catch(() => {})
    throw err
  }
}
