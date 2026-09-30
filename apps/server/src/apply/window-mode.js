import { send } from './cdp-call.js'
import { OFFSCREEN, WINDOW } from './browser-flags.js'

// Where the Apply browser's window lives while JobDekho streams it. A real
// window, hidden, is the default: it reads as an ordinary browser to the
// sites (a headless one announces itself), and "Pop out" can bring the very
// same window on-screen with the form exactly as it was. Windows hides it
// off-screen, which kept every feature working when measured; macOS will not
// place a window off-screen, so it is minimized there; Linux without X11 has
// no way to place a window at all, so it runs headless.
export function windowModeFor(platform = process.platform, env = process.env) {
  if (platform === 'win32') return 'offscreen'
  if (platform === 'darwin') return 'minimized'
  if (env.WAYLAND_DISPLAY || !env.DISPLAY) return 'headless'
  return 'offscreen'
}

export const canPopOut = (mode) => mode !== 'headless'

// Shows the window next to JobDekho, or hides it again the way it started.
export async function placeWindow(cdp, mode, shown) {
  if (!canPopOut(mode)) return false
  const { windowId } = await send(cdp, 'Browser.getWindowForTarget')
  // A window has to be in its normal state before it can be moved.
  await send(cdp, 'Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
  if (!shown && mode === 'minimized') {
    await send(cdp, 'Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } })
    return true
  }
  const at = shown ? { left: 80, top: 60 } : OFFSCREEN
  await send(cdp, 'Browser.setWindowBounds', { windowId, bounds: { ...at, ...WINDOW } })
  return true
}
