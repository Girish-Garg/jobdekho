import { describe, it, expect } from 'vitest'
import { keyEvents, KEY_NAMES } from '@jobdekho/server/apply/key-table.js'
import { parseMessage, MAX_TEXT } from '@jobdekho/server/apply/ws-messages.js'
import { pacer, fpsFor } from '@jobdekho/server/apply/frame-pace.js'
import { moveTo, canFill, personDrives } from '@jobdekho/server/apply/session-state.js'
import { treeUnder } from '@jobdekho/server/apply/process-census.js'
import { ORPHAN } from '@jobdekho/server/apply/browser-reap.js'
import { bestOption } from '@jobdekho/server/apply/set-choice.js'
import { sameValue } from '@jobdekho/server/apply/set-text.js'

describe('keyEvents', () => {
  it('sends the virtual key code Chrome needs for Backspace', () => {
    const [down, up] = keyEvents('Backspace')
    expect(down).toMatchObject({ type: 'rawKeyDown', key: 'Backspace', windowsVirtualKeyCode: 8 })
    expect(up.type).toBe('keyUp')
  })

  it('gives the person\'s Enter its text, and editing chords their commands', () => {
    expect(keyEvents('Enter')[0]).toMatchObject({ type: 'keyDown', text: '\r' })
    expect(keyEvents('Tab', { shift: true })[0]).toMatchObject({ modifiers: 8 })
    expect(keyEvents('a', { ctrl: true })[0]).toMatchObject({ commands: ['selectAll'], modifiers: 2, code: 'KeyA' })
  })

  it('refuses anything outside the table, and a chord letter on its own', () => {
    expect(keyEvents('F12')).toBeNull()
    expect(keyEvents('a')).toBeNull()
    expect(keyEvents('constructor')).toBeNull()
    expect(KEY_NAMES).not.toContain('v')
  })
})

describe('parseMessage', () => {
  const size = { w: 1000, h: 700 }
  it('clamps pointers to the picture and caps text', () => {
    expect(parseMessage(JSON.stringify({ t: 'down', x: -5, y: 9999, button: 'left', clicks: 9 }), size)).toEqual({ t: 'down', x: 0, y: 700, button: 'left', clicks: 3 })
    expect(parseMessage(JSON.stringify({ t: 'text', text: 'x'.repeat(1000) }), size).text).toHaveLength(MAX_TEXT)
    expect(parseMessage(JSON.stringify({ t: 'text', text: 'नमस्ते 😀' }), size).text).toBe('नमस्ते 😀')
    expect(parseMessage(JSON.stringify({ t: 'wheel', x: 1, y: 1, dy: 1e9 }), size).dy).toBe(2000)
  })

  it('drops anything unknown or malformed', () => {
    expect(parseMessage('not json', size)).toBeNull()
    expect(parseMessage(JSON.stringify({ t: 'eval', code: '1' }), size)).toBeNull()
    expect(parseMessage(JSON.stringify({ t: 'key', name: 'F5' }), size)).toBeNull()
    expect(parseMessage(JSON.stringify({ t: 'down', x: 'a', y: 1 }), size)).toBeNull()
    expect(parseMessage(JSON.stringify({ t: 'chooser', choice: 'C:\\secrets.pdf' }), size)).toBeNull()
    expect(parseMessage(JSON.stringify({ t: 'text', text: '' }), size)).toBeNull()
  })
})

describe('pacing', () => {
  it('reserves a slot per frame, so frames in flight never share one', () => {
    let now = 1000
    const wait = pacer(() => now)
    expect([wait(15), wait(15), wait(15)]).toEqual([0, 67, 134])
    now = 5000
    expect(wait(30)).toBe(0)
    expect(fpsFor('filling')).toBe(15)
    expect(fpsFor('yours')).toBe(30)
  })
})

describe('session state', () => {
  it('moves only along its edges, and only a press brings back filling', () => {
    const s = { state: 'starting', reason: null }
    moveTo(s, 'filling')
    expect(canFill(s)).toBe(true)
    moveTo(s, 'yours', 'took-over')
    expect(personDrives(s)).toBe(true)
    expect(() => moveTo({ state: 'closed' }, 'filling')).toThrow(/cannot go/)
    expect(() => moveTo({ state: 'filling' }, 'starting')).toThrow()
  })
})

describe('process census', () => {
  it('finds a browser and every helper under it, by its profile folder', () => {
    const rows = [
      { pid: 10, ppid: 1, cmd: 'msedge.exe --user-data-dir=C:\\t\\jobdekho-apply-a1 about:blank' },
      { pid: 11, ppid: 10, cmd: 'msedge.exe --type=renderer' },
      { pid: 12, ppid: 11, cmd: 'msedge.exe --type=utility' },
      { pid: 20, ppid: 1, cmd: 'msedge.exe --profile-directory=Default' },
      { pid: 21, ppid: 20, cmd: 'msedge.exe --type=renderer' },
    ]
    expect(treeUnder(rows, 'jobdekho-apply-a1')).toEqual({ roots: [10], pids: [10, 11, 12] })
    expect(treeUnder(rows, 'jobdekho-apply-zz')).toEqual({ roots: [], pids: [] })
  })

  it('reaps only browsers started on an Apply profile, never a program that mentions one', () => {
    const rows = [
      { pid: 30, ppid: 1, cmd: '"C:\\Edge\\msedge.exe" "--user-data-dir=C:\\Users\\A B\\AppData\\Local\\Temp\\jobdekho-apply-x9" about:blank' },
      { pid: 31, ppid: 1, cmd: 'code.exe C:\\notes\\jobdekho-apply-ideas.md' },
      { pid: 32, ppid: 1, cmd: 'msedge.exe --user-data-dir=C:\\Users\\a\\Edge\\User Data' },
    ]
    expect(treeUnder(rows, ORPHAN).roots).toEqual([30])
  })
})

describe('choosing and checking values', () => {
  const options = [{ text: 'British Indian Ocean Territory' }, { text: 'India' }, { text: 'Indonesia' }]
  it('picks the one option that is the answer, and never guesses between two', () => {
    expect(bestOption(options, 'India').text).toBe('India')
    expect(bestOption([{ text: 'Pune, Maharashtra, India' }, { text: 'Punjab, India' }], 'Pune').text).toBe('Pune, Maharashtra, India')
    expect(bestOption([{ text: 'New Pune Road' }, { text: 'Old Pune Road' }], 'Pune')).toBeNull()
  })

  it('accepts a masked number as the same number', () => {
    expect(sameValue('090000 00000', '9000000000')).toBe(true)
    expect(sameValue('Demo', 'Demo')).toBe(true)
    expect(sameValue('Dem', 'Demo')).toBe(false)
  })
})
