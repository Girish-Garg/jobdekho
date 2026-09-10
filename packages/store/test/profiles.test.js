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

describe('toProfile', () => {
  it('is null for no record and drops bookkeeping the caller has no use for', () => {
    expect(toProfile(null)).toBeNull()
    const p = toProfile({ skills: ['Python', 'python'], years: '2', degree: 'phd', updatedAt: 'x', resumeText: 'T', resumeName: 'cv.pdf' })
    expect(p).toEqual({ skills: ['python'], years: 2, degree: 'phd', titles: [], locations: [], resumeName: 'cv.pdf' })
  })
})

describe('profiles', () => {
  it('stores a profile and reads it back without the resume text', async () => {
    const returned = await upsertProfile(store, 'me', { skills: ['react'], titles: ['frontend developer'], years: 3, degree: 'bachelors', resumeText: 'RAW', resumeName: 'cv.pdf' })
    expect(returned).toEqual({ skills: ['react'], titles: ['frontend developer'], years: 3, degree: 'bachelors', locations: [], resumeName: 'cv.pdf' })
    expect(await getProfile(store, 'me')).toEqual(returned)
    expect(await getResumeText(store, 'me')).toBe('RAW')
    expect(await getProfile(store, 'nobody')).toBeNull()
    expect(await getResumeText(store, 'nobody')).toBeNull()
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
