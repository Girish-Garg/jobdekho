import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { getProfile, getResumeText, upsertProfile, deleteProfile, toProfile } from '@jobdekho/store/profiles.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const EMPTY_BASICS = { name: '', headline: '', email: '', phone: '', location: '', links: { github: '', linkedin: '', portfolio: '' }, moreLinks: [] }
const EMPTY_SECTIONS = {
  basics: EMPTY_BASICS, experience: [], projects: [], education: [], skillGroups: [], certifications: [], achievements: [],
}

describe('toProfile', () => {
  it('is null for no record and drops bookkeeping the caller has no use for', () => {
    expect(toProfile(null)).toBeNull()
    const p = toProfile({ skills: ['Python', 'python'], years: '2', degree: 'phd', updatedAt: 'x', resumeText: 'T', resumeName: 'cv.pdf' })
    expect(p).toEqual({ skills: ['python'], years: 2, degree: 'phd', titles: [], locations: [], resumeName: 'cv.pdf', ...EMPTY_SECTIONS })
  })

  // A record saved before this feature existed has none of the new keys at
  // all, not empty versions of them - proof the structured record migrates
  // in place on read rather than needing a separate migration script.
  it('gives a legacy flat-only record the same defaulted sections as a new one', () => {
    const legacy = { skills: ['go'], years: 4, degree: 'bachelors', titles: [], locations: [], resumeText: null, resumeName: null, updatedAt: 'x' }
    expect(toProfile(legacy)).toEqual({ skills: ['go'], years: 4, degree: 'bachelors', titles: [], locations: [], resumeName: null, ...EMPTY_SECTIONS })
  })
})

describe('profiles', () => {
  it('stores a profile and reads it back without the resume text', async () => {
    const returned = await upsertProfile(store, 'me', { skills: ['react'], titles: ['frontend developer'], years: 3, degree: 'bachelors', resumeText: 'RAW', resumeName: 'cv.pdf' })
    expect(returned).toEqual({ skills: ['react'], titles: ['frontend developer'], years: 3, degree: 'bachelors', locations: [], resumeName: 'cv.pdf', ...EMPTY_SECTIONS })
    expect(await getProfile(store, 'me')).toEqual(returned)
    expect(await getResumeText(store, 'me')).toBe('RAW')
    expect(await getProfile(store, 'nobody')).toBeNull()
    expect(await getResumeText(store, 'nobody')).toBeNull()
  })

  it('stores the structured career record alongside the flat fields', async () => {
    const input = {
      basics: { name: 'Jane Doe', links: { github: 'github.com/jane' } },
      experience: [{ title: 'Engineer', organisation: 'Acme', bullets: ['Shipped the thing'] }],
      skillGroups: [{ name: 'Languages', items: ['Python', 'Go'] }],
    }
    const returned = await upsertProfile(store, 'me', input)
    expect(returned.basics).toMatchObject({ name: 'Jane Doe', links: { github: 'github.com/jane' } })
    expect(returned.experience).toMatchObject([{ title: 'Engineer', organisation: 'Acme', bullets: ['Shipped the thing'], order: 0 }])
    expect(returned.skillGroups).toMatchObject([{ name: 'Languages', items: ['Python', 'Go'] }])
    expect(returned.experience[0].id).toBeTruthy()
  })

  // The extraction route only ever sends flat fields (see apps/server): this
  // is the guarantee that a re-extraction can never touch a hand-typed entry.
  it('an upsert carrying only flat fields leaves every structured section alone', async () => {
    await upsertProfile(store, 'me', {
      skills: ['react'],
      experience: [{ title: 'Engineer', organisation: 'Acme' }],
      basics: { name: 'Jane Doe' },
    })
    const returned = await upsertProfile(store, 'me', { skills: ['react', 'vue'], years: 2 })
    expect(returned.experience).toMatchObject([{ title: 'Engineer', organisation: 'Acme' }])
    expect(returned.basics).toMatchObject({ name: 'Jane Doe' })
    expect(returned.skills).toEqual(['react', 'vue'])
  })

  // An entry the person edited keeps the same id across a save: the client
  // sends it back, and normalizeEntry only mints a fresh one when it is
  // missing, so a reorder or a bullet edit never reads as a new entry.
  it('keeps an entry id stable across an edit that carries it back', async () => {
    const first = await upsertProfile(store, 'me', { experience: [{ title: 'Engineer' }] })
    const id = first.experience[0].id
    const second = await upsertProfile(store, 'me', { experience: [{ id, title: 'Senior Engineer' }] })
    expect(second.experience[0]).toMatchObject({ id, title: 'Senior Engineer' })
  })

  it('an upsert that carries no resume fields leaves the stored resume alone', async () => {
    await upsertProfile(store, 'me', { skills: ['react'], resumeText: 'RAW', resumeName: 'cv.pdf' })
    const returned = await upsertProfile(store, 'me', { skills: ['react', 'vue'], years: 1 })
    expect(returned.resumeName).toBe('cv.pdf')
    expect(returned.skills).toEqual(['react', 'vue'])
    expect(await getResumeText(store, 'me')).toBe('RAW')
  })

  it('an explicit null clears the resume', async () => {
    await upsertProfile(store, 'me', { skills: ['react'], resumeText: 'RAW', resumeName: 'cv.pdf' })
    const returned = await upsertProfile(store, 'me', { skills: ['react'], resumeText: null, resumeName: null })
    expect(returned.resumeName).toBeNull()
    expect(await getResumeText(store, 'me')).toBeNull()
  })

  it('deleteProfile removes the record and nothing else', async () => {
    await upsertProfile(store, 'me', { skills: ['react'], resumeText: 'RAW' })
    await upsertProfile(store, 'other', { skills: ['go'] })
    await deleteProfile(store, 'me')
    expect(await getProfile(store, 'me')).toBeNull()
    expect(await getResumeText(store, 'me')).toBeNull()
    expect(await getProfile(store, 'other')).toMatchObject({ skills: ['go'] })
    await deleteProfile(store, 'me')
  })

  it('keeps the resume in profile.json, keyed by user', async () => {
    await upsertProfile(store, 'me', { skills: ['react'], resumeText: 'RAW', resumeName: 'cv.pdf' })
    const file = JSON.parse(readFileSync(join(dir, FILES.profiles), 'utf8'))
    expect(file.me).toMatchObject({ skills: ['react'], resumeText: 'RAW', resumeName: 'cv.pdf' })
    expect(file.me.updatedAt).toMatch(/Z$/)
  })
})
