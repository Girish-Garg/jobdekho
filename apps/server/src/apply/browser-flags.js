// The whole command line Apply assist's browser gets. Playwright's own
// defaults are switched off (ignoreDefaultArgs) because they are made for
// test suites, not for someone's job applications: measured, they turn off
// Chrome's sandbox unless asked not to, allow every popup, enable software
// WebGL and turn off third-party storage partitioning.
//
// Safe Browsing and phishing protection are left on on purpose: an apply link
// can be a scam, so the background updates they depend on are not disabled.

// Far enough to the left and up that no real monitor layout reaches it; the
// window is hidden this way rather than minimized because a minimized window
// stops taking screenshots and loses wheel events after a file chooser.
export const OFFSCREEN = { left: -10000, top: -10000 }
export const WINDOW = { width: 1280, height: 860 }

export function launchFlags({ profileDir, mode }) {
  return [
    '--remote-debugging-pipe',
    `--user-data-dir=${profileDir}`,
    // Kept on, and honest: pages can see the browser is automated, and it is
    // what lets the browser report its own command line for the check below.
    '--enable-automation',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--disable-breakpad',
    '--metrics-recording-only',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication',
    // A streamed window is one nobody looks at directly; without these the
    // browser throttles it and the live view stalls.
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    `--window-size=${WINDOW.width},${WINDOW.height}`,
    ...(mode === 'headless' ? ['--headless'] : []),
    ...(mode === 'offscreen' ? [`--window-position=${OFFSCREEN.left},${OFFSCREEN.top}`] : []),
    'about:blank',
  ]
}

// Any of these on the real command line means the browser is not the one
// this feature promised: a hole in its sandbox, a port another program could
// drive it through, or the phishing protection the owner asked to keep.
const FORBIDDEN = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu-sandbox',
  '--no-zygote',
  '--single-process',
  '--disable-web-security',
  '--allow-running-insecure-content',
  '--remote-debugging-port',
  '--remote-debugging-address',
  '--remote-allow-origins',
  '--disable-popup-blocking',
  '--enable-unsafe-swiftshader',
  '--load-extension',
  '--disable-site-isolation-trials',
  '--disable-background-networking',
  '--disable-client-side-phishing-detection',
  '--safebrowsing-disable-auto-update',
]

const FORBIDDEN_FEATURES = /isolateorigins|site-?per-?process|isolatesandboxediframes|thirdpartystoragepartitioning|safebrowsing/i

// The first forbidden argument in a command line, or null when it is clean.
export function forbiddenIn(args = []) {
  for (const arg of args) {
    const flag = String(arg).split('=')[0].toLowerCase()
    if (FORBIDDEN.includes(flag)) return arg
    if (flag === '--disable-features' && FORBIDDEN_FEATURES.test(String(arg))) return arg
  }
  return null
}
