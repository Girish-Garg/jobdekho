// The named keys the live view may send, and nothing else. Closed on
// purpose: a key name reaches the browser's input handling, and an open
// string would let the panel send browser shortcuts. Printable characters
// never come through here; they arrive as text, in any script.
//
// Each carries the Windows virtual key code, without which Chrome ignores
// Backspace and friends entirely (measured).
const KEYS = {
  Enter: [13, '\r'],
  Tab: [9],
  Backspace: [8],
  Delete: [46],
  Escape: [27],
  ArrowLeft: [37],
  ArrowUp: [38],
  ArrowRight: [39],
  ArrowDown: [40],
  Home: [36],
  End: [35],
  PageUp: [33],
  PageDown: [34],
}

// Editing shortcuts by the letter held with Ctrl (Cmd on a Mac). Paste is not
// among them: the person's paste arrives as text, and pasting again inside
// the browser would put it in twice.
const CHORDS = { a: 'selectAll', c: 'copy', x: 'cut', z: 'undo', y: 'redo' }

export const KEY_NAMES = [...Object.keys(KEYS), ...Object.keys(CHORDS)]

const bits = (mods = {}) => (mods.alt ? 1 : 0) | (mods.ctrl ? 2 : 0) | (mods.meta ? 4 : 0) | (mods.shift ? 8 : 0)

// The CDP key events for one key, down then up, or null for anything outside
// the table (a chord letter without Ctrl or Cmd included).
export function keyEvents(name, mods = {}) {
  const modifiers = bits(mods)
  if (Object.hasOwn(KEYS, name)) {
    const [code, text] = KEYS[name]
    const base = { key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers }
    // Enter carries its text, so a textarea gets its new line and a form does
    // what a person pressing Enter meant. Only ever the person's Enter:
    // JobDekho's own filling sends no keys at all.
    const plain = !mods.ctrl && !mods.meta && !mods.alt
    const down = text && plain ? { type: 'keyDown', text, unmodifiedText: text, ...base } : { type: 'rawKeyDown', ...base }
    return [down, { type: 'keyUp', ...base }]
  }
  if (Object.hasOwn(CHORDS, name) && (mods.ctrl || mods.meta)) {
    const upper = name.toUpperCase()
    const base = { key: name, code: `Key${upper}`, windowsVirtualKeyCode: upper.charCodeAt(0), nativeVirtualKeyCode: upper.charCodeAt(0), modifiers }
    return [{ type: 'rawKeyDown', ...base, commands: [CHORDS[name]] }, { type: 'keyUp', ...base }]
  }
  return null
}
