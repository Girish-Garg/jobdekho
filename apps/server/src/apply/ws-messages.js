import { KEY_NAMES } from './key-table.js'

// What the live view may say over its socket, checked before anything reaches
// the browser. Anything else, or anything malformed, is dropped: a message is
// never half-trusted. Coordinates are clamped to the picture the person is
// looking at, and text is capped, since a paste can be anything.
export const MAX_TEXT = 400

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const clamp = (value, max) => Math.max(0, Math.min(Math.round(value), Math.max(0, max)))
const BUTTONS = new Set(['left', 'none'])
const CHOICES = new Set(['resume', 'cover', 'cancel'])
// The address bar's buttons (see session-input.js). Without a reader here
// every press was dropped as unknown, and the buttons did nothing.
const GOES = new Set(['back', 'forward', 'reload'])

function point(msg, size) {
  const x = num(msg.x)
  const y = num(msg.y)
  if (x === null || y === null) return null
  return { x: clamp(x, size.w), y: clamp(y, size.h) }
}

const mods = (m = {}) => ({ ctrl: m.ctrl === true, meta: m.meta === true, shift: m.shift === true, alt: m.alt === true })

const READERS = {
  hello: (m) => (typeof m.token === 'string' && m.token.length <= 200 ? { t: 'hello', token: m.token } : null),
  down: (m, size) => pointer(m, size),
  up: (m, size) => pointer(m, size),
  move: (m, size) => pointer(m, size),
  wheel: (m, size) => {
    const at = point(m, size)
    const dx = num(m.dx) ?? 0
    const dy = num(m.dy) ?? 0
    return at ? { t: 'wheel', ...at, dx: Math.max(-2000, Math.min(2000, dx)), dy: Math.max(-2000, Math.min(2000, dy)) } : null
  },
  key: (m) => (KEY_NAMES.includes(m.name) ? { t: 'key', name: m.name, mods: mods(m.mods) } : null),
  text: (m) => (typeof m.text === 'string' && m.text.length > 0 ? { t: 'text', text: m.text.slice(0, MAX_TEXT) } : null),
  pick: (m) => (typeof m.value === 'string' && m.value.length <= 500 ? { t: 'pick', value: m.value } : { t: 'pick', value: null }),
  chooser: (m) => (CHOICES.has(m.choice) ? { t: 'chooser', choice: m.choice } : null),
  dialog: (m) => ({ t: 'dialog', accept: m.accept === true }),
  nav: (m) => (GOES.has(m.go) ? { t: 'nav', go: m.go } : null),
}

function pointer(m, size) {
  const at = point(m, size)
  if (!at) return null
  const clicks = Math.max(1, Math.min(3, Math.round(num(m.clicks) ?? 1)))
  return { t: m.t, ...at, button: BUTTONS.has(m.button) ? m.button : 'none', clicks }
}

export function parseMessage(raw, size = { w: 1280, h: 860 }) {
  let msg
  try {
    msg = JSON.parse(String(raw))
  } catch {
    return null
  }
  if (!msg || typeof msg !== 'object' || !Object.hasOwn(READERS, msg.t)) return null
  return READERS[msg.t](msg, size)
}
