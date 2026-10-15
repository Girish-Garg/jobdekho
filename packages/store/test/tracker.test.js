import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { listTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry, trackApplied, trackMail } from '@jobdekho/store/tracker.js'
import { cleanEmail } from '@jobdekho/store/tracker-entry.js'

let dir
let store
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-tracker-'))
  store = openStore(dir)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const ROW = (id, company, title) => JSON.stringify({ id, source: 'test', company, title, url: `https://x.test/${id}`, firstSeenAt: '2026-10-01T00:00:00.000Z', lastSeenAt: '2026-10-14T00:00:00.000Z' })
const DAY1 = new Date('2026-10-13T09:00:00.000Z')
const DAY2 = new Date('2026-10-14T09:00:00.000Z')

describe('the first read', () => {
  it('tracks every posting already marked Applied, with no date, and only once', () => {
    writeFileSync(join(dir, FILES.corpus), `${ROW('p1', 'Globex', 'Frontend developer')}\n${ROW('p2', 'Initech', 'SDE intern')}\n`)
    store.statuses.set('u1', { p1: 'applied', p2: 'saved', gone: 'applied' })
    const [entry, ...rest] = listTracker(store, 'u1')
    expect(rest).toHaveLength(0)
    expect(entry).toMatchObject({ company: 'Globex', role: 'Frontend developer', postingId: 'p1', stage: 'applied', stageAt: null })
    expect(entry.events).toEqual([expect.objectContaining({ at: null, stage: 'applied' })])
    store.statuses.set('u1', { p1: 'applied', p2: 'applied' })
    expect(listTracker(store, 'u1')).toHaveLength(1)
  })
})

describe('adding and changing entries by hand', () => {
  it('adds one applied for elsewhere, and refuses one with no company or a made-up stage', () => {
    const { entry } = addTrackerEntry(store, 'u1', { company: ' Northwind ', role: 'SDE intern', stage: 'assessment', note: 'Test due 17 Oct' }, DAY1)
    expect(entry).toMatchObject({ company: 'Northwind', role: 'SDE intern', postingId: null, stage: 'assessment', stageAt: DAY1.toISOString() })
    expect(entry.events[0]).toMatchObject({ stage: 'assessment', text: 'Test due 17 Oct' })
    expect(addTrackerEntry(store, 'u1', { company: '  ' })).toEqual({ error: 'company' })
    expect(addTrackerEntry(store, 'u1', { company: 'X', stage: 'hired' })).toEqual({ error: 'stage' })
  })

  it('moves a stage with a dated line in the history, and keeps a bare note as a line too', () => {
    const { entry } = addTrackerEntry(store, 'u1', { company: 'Globex' }, DAY1)
    const moved = updateTrackerEntry(store, 'u1', entry.id, { stage: 'interview', note: 'Round 1 on Friday' }, DAY2).entry
    expect(moved).toMatchObject({ stage: 'interview', stageAt: DAY2.toISOString() })
    expect(moved.events.at(-1)).toMatchObject({ stage: 'interview', text: 'Round 1 on Friday', at: DAY2.toISOString() })
    const noted = updateTrackerEntry(store, 'u1', entry.id, { note: 'Sent the slot' }, DAY2).entry
    expect(noted.events.at(-1)).toMatchObject({ stage: null, text: 'Sent the slot' })
    expect(updateTrackerEntry(store, 'u1', 'nope', { stage: 'offer' })).toEqual({ error: 'missing' })
    expect(updateTrackerEntry(store, 'u1', entry.id, { stage: 'hired' })).toEqual({ error: 'stage' })
  })

  it('removes one, and lists the newest activity first', () => {
    const a = addTrackerEntry(store, 'u1', { company: 'A' }, DAY1).entry
    const b = addTrackerEntry(store, 'u1', { company: 'B' }, DAY2).entry
    expect(listTracker(store, 'u1').map((e) => e.company)).toEqual(['B', 'A'])
    updateTrackerEntry(store, 'u1', a.id, { note: 'later' }, new Date('2026-10-15T00:00:00.000Z'))
    expect(listTracker(store, 'u1').map((e) => e.company)).toEqual(['A', 'B'])
    expect(removeTrackerEntry(store, 'u1', b.id)).toBe(true)
    expect(removeTrackerEntry(store, 'u1', b.id)).toBe(false)
    expect(JSON.parse(readFileSync(join(dir, FILES.tracker), 'utf8')).u1.entries).toHaveLength(1)
  })
})

describe('a posting marked Applied', () => {
  it('is tracked once, dated now', () => {
    const first = trackApplied(store, 'u1', { id: 'p9', company: 'Acme', title: 'Backend intern' }, DAY1)
    expect(first).toMatchObject({ company: 'Acme', role: 'Backend intern', postingId: 'p9', stage: 'applied', stageAt: DAY1.toISOString() })
    trackApplied(store, 'u1', { id: 'p9', company: 'Acme', title: 'Backend intern' }, DAY2)
    expect(listTracker(store, 'u1')).toHaveLength(1)
  })
})

describe('a mail sent from the chat', () => {
  const MAIL = { to: 'Priya@AcmeLabs.example', name: 'Priya', company: 'Acme Labs', role: 'Backend intern', subject: 'Backend internship', postingId: null }

  it('makes an entry when none fits, at emailed, with the contact', () => {
    const entry = trackMail(store, 'u1', MAIL, DAY1)
    expect(entry).toMatchObject({ company: 'Acme Labs', role: 'Backend intern', stage: 'emailed', contact: { name: 'Priya', email: 'priya@acmelabs.example' } })
    expect(entry.events.at(-1).text).toBe('Mailed Priya (priya@acmelabs.example): Backend internship')
  })

  it('lands on the posting it was about, then on the same address, then on the same company and role', () => {
    const applied = trackApplied(store, 'u1', { id: 'p1', company: 'Acme Labs', title: 'Something else' }, DAY1)
    expect(trackMail(store, 'u1', { ...MAIL, postingId: 'p1' }, DAY2).id).toBe(applied.id)
    const byHand = addTrackerEntry(store, 'u1', { company: 'Globex', role: 'Intern', contact: { email: 'hr@globex.example' } }, DAY1).entry
    expect(trackMail(store, 'u1', { ...MAIL, to: 'hr@globex.example', company: 'Globex Corp' }, DAY2).id).toBe(byHand.id)
    expect(trackMail(store, 'u1', { ...MAIL, to: 'cto@globex.example', company: 'globex', role: 'intern' }, DAY2).id).toBe(byHand.id)
    expect(listTracker(store, 'u1')).toHaveLength(2)
  })

  it('never moves an entry back from a later stage', () => {
    const { entry } = addTrackerEntry(store, 'u1', { company: 'Acme Labs', role: 'Backend intern', stage: 'interview' }, DAY1)
    const after = trackMail(store, 'u1', MAIL, DAY2)
    expect(after).toMatchObject({ id: entry.id, stage: 'interview', stageAt: DAY1.toISOString() })
    expect(after.events.at(-1)).toMatchObject({ stage: null })
  })
})

describe('cleanEmail', () => {
  it('takes one plain address and nothing that could carry a second one', () => {
    expect(cleanEmail(' Priya@Acme.example ')).toBe('priya@acme.example')
    for (const bad of ['a@b', 'a b@c.de', 'x@y.com, z@w.com', '"Me" <me@x.com>', 'a@b.c\nBcc: z@w.com', 'no-at.example', '']) expect(cleanEmail(bad)).toBe('')
  })
})
