import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import {
  listDocuments, getDocument, createDocument, saveDocumentTex, revertDocument, deleteDocument,
} from '@jobdekho/store/documents.js'
import { MAX_VERSIONS, textChangedAt } from '@jobdekho/store/document-versions.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-docs-')); store = openStore(dir) })
afterEach(() => { vi.useRealTimers(); rmSync(dir, { recursive: true, force: true }) })

const draft = (over = {}) => ({ name: 'Classic resume', kind: 'resume', templateId: 'classic', tex: 'v1', by: 'template', ...over })

describe('documents', () => {
  it('writes no file until something is saved, then keeps it apart from the profile', async () => {
    expect(await listDocuments(store, 'me')).toEqual([])
    expect(existsSync(join(dir, FILES.documents))).toBe(false)
    await createDocument(store, 'me', draft())
    expect(existsSync(join(dir, FILES.documents))).toBe(true)
    expect(readFileSync(join(dir, FILES.documents), 'utf8')).toContain('Classic resume')
  })

  it('creates a document with one version by its author, scoped to the user', async () => {
    const doc = await createDocument(store, 'me', draft({ postingId: 'p1' }))
    expect(doc).toMatchObject({ name: 'Classic resume', kind: 'resume', templateId: 'classic', postingId: 'p1', tex: 'v1' })
    expect(doc.versions).toEqual([{ tex: 'v1', at: doc.createdAt, by: 'template' }])
    expect(await getDocument(store, 'me', doc.id)).toEqual(doc)
    expect(await getDocument(store, 'someone-else', doc.id)).toBeNull()
  })

  it('lists summaries without bodies, most recently changed first', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-09-30T10:00:00.000Z') })
    const a = await createDocument(store, 'me', draft({ name: 'A' }))
    vi.setSystemTime(Date.parse('2026-09-30T11:00:00.000Z'))
    const b = await createDocument(store, 'me', draft({ name: 'B' }))
    vi.setSystemTime(Date.parse('2026-09-30T12:00:00.000Z'))
    await saveDocumentTex(store, 'me', a.id, { tex: 'v2', by: 'you' })
    const list = await listDocuments(store, 'me')
    expect(list.map((d) => d.name)).toEqual(['A', 'B'])
    expect(list[0]).not.toHaveProperty('tex')
    expect(list[0]).not.toHaveProperty('versions')
    expect(list[1].id).toBe(b.id)
  })

  it('adds a version per changed text, and none for saving the same text again', async () => {
    const doc = await createDocument(store, 'me', draft())
    const edited = await saveDocumentTex(store, 'me', doc.id, { tex: 'v2', by: 'ai' })
    expect(edited.tex).toBe('v2')
    expect(edited.versions.map((v) => [v.tex, v.by])).toEqual([['v1', 'template'], ['v2', 'ai']])
    const same = await saveDocumentTex(store, 'me', doc.id, { tex: 'v2', by: 'you' })
    expect(same.versions).toHaveLength(2)
  })

  it('renames without a new version, and without moving the moment the text changed', async () => {
    const doc = await createDocument(store, 'me', draft())
    const renamed = await saveDocumentTex(store, 'me', doc.id, { tex: 'v1', name: '  For   Acme ', by: 'you' })
    expect(renamed.name).toBe('For Acme')
    expect(renamed.versions).toHaveLength(1)
    expect(textChangedAt(renamed)).toBe(textChangedAt(doc))
  })

  it(`keeps the newest ${MAX_VERSIONS} versions, each with its own time`, async () => {
    const doc = await createDocument(store, 'me', draft())
    for (let i = 2; i <= MAX_VERSIONS + 5; i += 1) await saveDocumentTex(store, 'me', doc.id, { tex: `v${i}`, by: 'you' })
    const saved = await getDocument(store, 'me', doc.id)
    expect(saved.versions).toHaveLength(MAX_VERSIONS)
    expect(saved.versions.at(-1).tex).toBe(`v${MAX_VERSIONS + 5}`)
    expect(new Set(saved.versions.map((v) => v.at)).size).toBe(MAX_VERSIONS)
  })

  it('restores an old version as a new one, leaving the later ones in place', async () => {
    const doc = await createDocument(store, 'me', draft())
    await saveDocumentTex(store, 'me', doc.id, { tex: 'v2', by: 'ai' })
    const restored = await revertDocument(store, 'me', doc.id, doc.versions[0].at)
    expect(restored.tex).toBe('v1')
    expect(restored.versions.map((v) => v.tex)).toEqual(['v1', 'v2', 'v1'])
    expect(restored.versions.at(-1)).toMatchObject({ by: 'you', restoredFrom: doc.versions[0].at })
  })

  it('answers null for an unknown document or version, and deletes only what exists', async () => {
    const doc = await createDocument(store, 'me', draft())
    expect(await saveDocumentTex(store, 'me', 'nope', { tex: 'x', by: 'you' })).toBeNull()
    expect(await revertDocument(store, 'me', doc.id, '1999-01-01T00:00:00.000Z')).toBeNull()
    expect(await deleteDocument(store, 'me', 'nope')).toBe(false)
    expect(await deleteDocument(store, 'me', doc.id)).toBe(true)
    expect(await getDocument(store, 'me', doc.id)).toBeNull()
  })

  it('falls back to a name when given only whitespace', async () => {
    expect((await createDocument(store, 'me', draft({ name: '   ' }))).name).toBe('Untitled')
  })
})
