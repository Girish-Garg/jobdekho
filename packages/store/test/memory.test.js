import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  listMemory, setMemoryEnabled, forgetMemory, deleteMemory, memoryKey, cleanMemoryText, MAX_MEMORIES,
} from '@jobdekho/store/memory.js'
import { addMemory, editMemory, archiveMemory, restoreMemory, checkMemoryInput } from '@jobdekho/store/memory-items.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-memory-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const add = (text, extra = {}) => addMemory(store, 'me', { text, scope: 'everywhere', ...extra })
const texts = async () => (await listMemory(store, 'me')).items.map((item) => item.text)

describe('reading memory', () => {
  it('reads as switched on with nothing saved, without writing a file', async () => {
    expect(await listMemory(store, 'me')).toEqual({ enabled: true, items: [], archived: 0 })
    expect(existsSync(join(dir, FILES.memory))).toBe(false)
  })

  it('keeps each person to their own', async () => {
    await add('Keep my answers short')
    expect(await listMemory(store, 'someone-else')).toEqual({ enabled: true, items: [], archived: 0 })
  })

  it('reads a file edited by hand, dropping what is not an item and reading an unknown scope as everywhere', async () => {
    writeFileSync(join(dir, FILES.memory), JSON.stringify({ me: { items: [{ id: 'a1', text: ' Be  brief ', scope: 'mood' }, { text: 'no id' }, null] } }))
    const { items } = await listMemory(openStore(dir), 'me')
    expect(items).toEqual([{ id: 'a1', text: 'Be brief', scope: 'everywhere', quote: null, createdAt: null, updatedAt: null, replaces: null, archived: false }])
  })
})

describe('saving an item', () => {
  it('keeps one clean line with where it came from', async () => {
    const at = new Date('2026-10-01T09:00:00.000Z')
    const saved = await addMemory(store, 'me', { text: 'Keep my resume\n to one page', scope: 'resume', quote: 'keep my resume to one page' }, at)
    expect(saved).toEqual({
      item: {
        id: expect.stringMatching(/^[0-9a-f]{8}$/), text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page',
        createdAt: at.toISOString(), updatedAt: at.toISOString(), replaces: null, archived: false,
      },
      replaced: null,
      existing: false,
    })
    expect(JSON.parse(readFileSync(join(dir, FILES.memory), 'utf8')).me.items).toHaveLength(1)
  })

  it('says what is wrong with a line it will not keep', async () => {
    expect(await add('   ')).toEqual({ error: 'empty' })
    expect(await add('x'.repeat(201))).toEqual({ error: 'long' })
    expect(await addMemory(store, 'me', { text: 'Be brief', scope: 'mood' })).toEqual({ error: 'scope' })
    expect((await add('x'.repeat(200))).item.text).toHaveLength(200)
    expect(checkMemoryInput({ text: ' a ', scope: 'jobs' })).toEqual({ text: 'a', scope: 'jobs' })
  })

  it('answers the same words with the item already kept, so nothing is saved twice', async () => {
    const first = await add('Keep my answers short.')
    const again = await add('  keep my ANSWERS short ')
    expect(again).toEqual({ item: first.item, replaced: null, existing: true })
    expect(await texts()).toEqual(['Keep my answers short.'])
  })

  it('keeps a quote from a chat message and none for a line written by hand', async () => {
    expect((await add('Be brief')).item.quote).toBeNull()
    expect((await add('Use Indian English', { quote: 'x'.repeat(400) })).item.quote).toHaveLength(300)
  })
})

describe('replacing an item', () => {
  it('archives the one it replaces, which an Undo brings back', async () => {
    const old = await add('Only remote roles', { scope: 'jobs' })
    const next = await add('Remote or hybrid roles', { scope: 'jobs', replaces: old.item.id })
    expect(next.item.replaces).toBe(old.item.id)
    expect(next.replaced).toMatchObject({ id: old.item.id, text: 'Only remote roles', archived: true })
    expect(await listMemory(store, 'me')).toMatchObject({ items: [{ text: 'Remote or hybrid roles' }], archived: 1 })
    expect(await deleteMemory(store, 'me', next.item.id)).toBe(true)
    expect((await restoreMemory(store, 'me', old.item.id)).item).toMatchObject({ text: 'Only remote roles', archived: false })
    expect(await texts()).toEqual(['Only remote roles'])
  })

  it('lets go of a replaces that names nothing in force', async () => {
    const old = await add('Only remote roles')
    await archiveMemory(store, 'me', old.item.id)
    expect((await add('Hybrid is fine', { replaces: old.item.id })).item.replaces).toBeNull()
    expect((await add('Be brief', { replaces: 'nope' })).replaced).toBeNull()
  })

  it('will not bring back one that says what an item in force already does', async () => {
    const old = await add('Only remote roles')
    await add('Hybrid is fine', { replaces: old.item.id })
    await add('only remote roles')
    expect(await restoreMemory(store, 'me', old.item.id)).toEqual({ error: 'duplicate' })
    expect(await restoreMemory(store, 'me', 'nope')).toEqual({ error: 'missing' })
  })

  it('keeps the fifty newest archived items and lets older ones go', async () => {
    let previous = await add('Version 0')
    for (let i = 1; i <= 55; i += 1) previous = await add(`Version ${i}`, { replaces: previous.item.id }, new Date(Date.UTC(2026, 0, 1, 0, i)))
    const { items, archived } = await listMemory(store, 'me')
    expect(items.map((item) => item.text)).toEqual(['Version 55'])
    expect(archived).toBe(50)
  })
})

describe('the cap', () => {
  it('keeps at most 150 in force, though a replacement still fits', async () => {
    for (let i = 0; i < MAX_MEMORIES; i += 1) await add(`Preference ${i}`)
    expect(await add('One more')).toEqual({ error: 'full' })
    const first = (await listMemory(store, 'me')).items[0]
    expect((await add('Instead of the first', { replaces: first.id })).item.text).toBe('Instead of the first')
    expect((await listMemory(store, 'me')).items).toHaveLength(MAX_MEMORIES)
  })
})

describe('changing an item', () => {
  it('changes the text, the scope or both, and stamps the change', async () => {
    const { item } = await add('Be brief')
    const at = new Date('2026-10-02T00:00:00.000Z')
    expect((await editMemory(store, 'me', item.id, { scope: 'letters' }, at)).item).toMatchObject({ text: 'Be brief', scope: 'letters', updatedAt: at.toISOString() })
    expect((await editMemory(store, 'me', item.id, { text: ' Keep letters short ' })).item).toMatchObject({ text: 'Keep letters short', scope: 'letters' })
  })

  it('refuses a missing or archived item, a copy of another, and a bad line', async () => {
    const one = await add('Be brief')
    const two = await add('Use Indian English')
    expect(await editMemory(store, 'me', two.item.id, { text: 'be brief.' })).toEqual({ error: 'duplicate' })
    expect(await editMemory(store, 'me', two.item.id, { text: '' })).toEqual({ error: 'empty' })
    expect(await editMemory(store, 'me', 'nope', { text: 'x' })).toEqual({ error: 'missing' })
    await archiveMemory(store, 'me', one.item.id)
    expect(await editMemory(store, 'me', one.item.id, { text: 'x' })).toEqual({ error: 'missing' })
  })
})

describe('deleting, forgetting and the switch', () => {
  it('deletes one item and says when there was none', async () => {
    const { item } = await add('Be brief')
    expect(await deleteMemory(store, 'me', item.id)).toBe(true)
    expect(await deleteMemory(store, 'me', item.id)).toBe(false)
  })

  it('forgets everything, archived items too, and leaves the switch as it was', async () => {
    const old = await add('Only remote roles')
    await add('Hybrid is fine', { replaces: old.item.id })
    await setMemoryEnabled(store, 'me', false)
    await forgetMemory(store, 'me')
    expect(await listMemory(store, 'me')).toEqual({ enabled: false, items: [], archived: 0 })
  })

  it('keeps the switch, and reads anything but true as off', async () => {
    expect(await setMemoryEnabled(store, 'me', false)).toBe(false)
    expect((await listMemory(openStore(dir), 'me')).enabled).toBe(false)
    expect(await setMemoryEnabled(store, 'me', true)).toBe(true)
    expect(await setMemoryEnabled(store, 'me', 'yes')).toBe(false)
  })
})

describe('the text helpers', () => {
  it('makes one line, and reads case, spacing and a closing full stop as the same words', () => {
    expect(cleanMemoryText(' a\n\tb ')).toBe('a b')
    expect(cleanMemoryText(7)).toBe('')
    expect(memoryKey('Keep it SHORT. ')).toBe(memoryKey('keep it short'))
  })
})
