import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  listBlockedCompanies, blockedKeys, blockedAmong, blockCompany, unblockCompany,
} from '@jobdekho/store/blocked-companies.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-blocked-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const AT = Date.parse('2026-10-02T10:00:00.000Z')
const fileOf = () => JSON.parse(readFileSync(join(dir, FILES.blockedCompanies), 'utf8'))

describe('blockCompany', () => {
  it('keeps the name as blocked, its run-together key, when, and the careers page choice, in a file of its own', () => {
    const store = openStore(dir)
    const entry = blockCompany(store, 'me', { name: '  Acme Foundation Pvt Ltd ', stopFetching: true }, AT)
    expect(entry).toEqual({ key: 'acmefoundation', name: 'Acme Foundation Pvt Ltd', blockedAt: '2026-10-02T10:00:00.000Z', stopFetching: true })
    expect(fileOf()).toEqual({ me: [entry] })
    expect(listBlockedCompanies(openStore(dir), 'me')).toEqual([entry])
  })

  it('lists the newest first, and keeps each person apart', () => {
    const store = openStore(dir)
    blockCompany(store, 'me', { name: 'Acme' }, AT)
    blockCompany(store, 'me', { name: 'Beta Labs' }, AT + 1000)
    blockCompany(store, 'someone', { name: 'Gamma' }, AT)
    expect(listBlockedCompanies(store, 'me').map((e) => e.name)).toEqual(['Beta Labs', 'Acme'])
    expect(listBlockedCompanies(store, 'someone').map((e) => e.name)).toEqual(['Gamma'])
    expect(listBlockedCompanies(store, 'nobody')).toEqual([])
  })

  // "PHONEPE LIMITED" from one board and "PhonePe" from another are one
  // company: blocking it twice keeps the first entry.
  it('adds nothing for a company already blocked under another spelling', () => {
    const store = openStore(dir)
    const first = blockCompany(store, 'me', { name: 'PHONEPE LIMITED' }, AT)
    expect(blockCompany(store, 'me', { name: 'PhonePe' }, AT + 5000)).toEqual(first)
    expect(listBlockedCompanies(store, 'me')).toEqual([first])
  })

  // Asking again to be rid of a company can stop its careers page being
  // read; it never starts it being read again.
  it('turns the careers page off on a second block, never back on', () => {
    const store = openStore(dir)
    blockCompany(store, 'me', { name: 'Acme', stopFetching: false }, AT)
    const again = blockCompany(store, 'me', { name: 'ACME', stopFetching: true }, AT + 5000)
    expect(again).toMatchObject({ name: 'Acme', blockedAt: '2026-10-02T10:00:00.000Z', stopFetching: true })
    expect(blockCompany(store, 'me', { name: 'Acme', stopFetching: false }, AT + 9000).stopFetching).toBe(true)
    expect(listBlockedCompanies(store, 'me')).toHaveLength(1)
  })

  // An unknown company still blocks by its key, ready for its first posting.
  it('blocks a name no posting carries yet, and refuses one with nothing to know it by', () => {
    const store = openStore(dir)
    expect(blockCompany(store, 'me', { name: 'Nowhere Yet Inc' }, AT)).toMatchObject({ key: 'nowhereyet' })
    expect(blockCompany(store, 'me', { name: ' .,; ' }, AT)).toBeNull()
    expect(blockCompany(store, 'me', {}, AT)).toBeNull()
    expect(listBlockedCompanies(store, 'me')).toHaveLength(1)
  })

  it('keeps a pasted page from passing for a name', () => {
    const store = openStore(dir)
    expect(blockCompany(store, 'me', { name: 'x'.repeat(500) }, AT).name).toHaveLength(200)
  })
})

describe('unblockCompany', () => {
  it('lets go of the company by the key the list gave, and says whether there was one', () => {
    const store = openStore(dir)
    blockCompany(store, 'me', { name: 'Acme' }, AT)
    blockCompany(store, 'me', { name: 'Beta' }, AT)
    expect(unblockCompany(store, 'me', 'acme')).toBe(true)
    expect(listBlockedCompanies(store, 'me').map((e) => e.key)).toEqual(['beta'])
    expect(unblockCompany(store, 'me', 'acme')).toBe(false)
  })

  it('leaves no empty record behind', () => {
    const store = openStore(dir)
    blockCompany(store, 'me', { name: 'Acme' }, AT)
    unblockCompany(store, 'me', 'acme')
    expect(fileOf()).toEqual({})
  })
})

describe('reading the file', () => {
  it('writes nothing until something is blocked', () => {
    const store = openStore(dir)
    expect(listBlockedCompanies(store, 'me')).toEqual([])
    expect(existsSync(join(dir, FILES.blockedCompanies))).toBe(false)
  })

  // The file is the person's to edit; a broken entry costs only itself.
  it('skips an entry without a key and fills in what a hand edit left out', () => {
    writeFileSync(join(dir, FILES.blockedCompanies), JSON.stringify({ me: [{ name: 'No key' }, { key: 'acme' }, 'junk'], you: 'junk' }))
    const store = openStore(dir)
    expect(listBlockedCompanies(store, 'me')).toEqual([{ key: 'acme', name: 'acme', blockedAt: null, stopFetching: false }])
    expect(listBlockedCompanies(store, 'you')).toEqual([])
  })

  it('gives the keys as a set, and which picks of the feed they hide', () => {
    const store = openStore(dir)
    blockCompany(store, 'me', { name: 'Western Digital' }, AT)
    const keys = blockedKeys(store, 'me')
    expect([...keys]).toEqual(['westerndigital'])
    expect(blockedAmong(keys, ['WesternDigital', 'Western Digital Corp', 'Acme'])).toEqual(['WesternDigital', 'Western Digital Corp'])
    expect(blockedAmong(keys, undefined)).toEqual([])
    expect(blockedAmong(new Set(), ['Acme'])).toEqual([])
  })
})
