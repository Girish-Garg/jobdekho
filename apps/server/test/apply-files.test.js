import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileName, pickDocuments, prepareFiles } from '@jobdekho/server/apply/apply-files.js'
import { saveOriginal, findOriginal, deleteOriginal, originalPath } from '@jobdekho/server/resume/original.js'

const TEX = '\\documentclass{article}\n\\begin{document}\nDemo\n\\end{document}\n'
const doc = (id, kind, postingId, updatedAt) => ({ id, name: id, kind, templateId: 'classic', postingId, tex: `${TEX}% ${id}\n`, versions: [], createdAt: updatedAt, updatedAt })

const dirs = []
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-test-files-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// A store handle over a temp folder, with documents held in memory.
function storeWith(documents) {
  return { dir: temp(), documents: { get: () => ({ documents }), set: vi.fn() } }
}

describe('fileName', () => {
  it('names the file the way a recruiter will read it', () => {
    expect(fileName('Demo Candidate', 'Resume')).toBe('Demo Candidate Resume.pdf')
    expect(fileName('Asha "Rao"/../x', 'Cover Letter')).toBe('Asha Rao .. x Cover Letter.pdf')
    expect(fileName('', 'Resume')).toBe('Resume.pdf')
    expect(fileName('अनिल कुमार', 'Resume')).toBe('अनिल कुमार Resume.pdf')
  })
})

describe('pickDocuments', () => {
  it('takes the resume made for this posting, else the newest; a letter only if it was for this posting', () => {
    const docs = [doc('new', 'resume', null, '3'), doc('tailored', 'resume', 'p1', '2'), doc('letter-other', 'cover-letter', 'p2', '1')]
    expect(pickDocuments(docs, 'p1').resume.id).toBe('tailored')
    expect(pickDocuments(docs, 'p9').resume.id).toBe('new')
    expect(pickDocuments(docs, 'p1').cover).toBeNull()
  })
})

describe('prepareFiles', () => {
  const posting = { id: 'p1' }

  it('compiles the chosen resume and letter into the session folder under the person\'s name', async () => {
    const store = storeWith([doc('letter', 'cover-letter', 'p1', '2'), doc('cv', 'resume', null, '1')])
    const compile = vi.fn(async () => ({ pdf: Buffer.from('%PDF-made') }))
    const dir = join(temp(), 'files')
    const files = await prepareFiles({ posting, userId: 'u1', person: 'Demo Candidate', dir, store, compile, originalPath: null })
    expect(files.resume).toMatchObject({ name: 'Demo Candidate Resume.pdf', from: 'document' })
    expect(files.cover).toMatchObject({ name: 'Demo Candidate Cover Letter.pdf', from: 'document' })
    expect(readFileSync(files.resume.path, 'utf8')).toBe('%PDF-made')
  })

  it('attaches the uploaded resume when no PDF can be made (no LaTeX here)', async () => {
    const store = storeWith([doc('cv', 'resume', null, '1')])
    const noLatex = vi.fn(async () => {
      throw Object.assign(new Error('LaTeX is not installed on this computer'), { name: 'LatexError', kind: 'not_installed', status: 503 })
    })
    const upload = join(temp(), 'uploaded.pdf')
    writeFileSync(upload, '%PDF-uploaded')
    const files = await prepareFiles({ posting, userId: 'u1', person: 'Demo', dir: join(temp(), 'f'), store, compile: noLatex, originalPath: upload })
    expect(files.resume).toMatchObject({ name: 'Demo Resume.pdf', from: 'upload' })
    expect(readFileSync(files.resume.path, 'utf8')).toBe('%PDF-uploaded')
    expect(files.cover).toBeNull()
  })

  it('has nothing to attach with no documents and no upload', async () => {
    const files = await prepareFiles({ posting, userId: 'u1', person: 'Demo', dir: join(temp(), 'f'), store: storeWith([]), compile: vi.fn(), originalPath: null })
    expect(files).toEqual({ resume: null, cover: null })
  })
})

describe('the original upload', () => {
  it('is kept beside the compiled resumes, found, and deleted', () => {
    const store = { dir: temp() }
    expect(findOriginal(store, 'local')).toBeNull()
    saveOriginal(store, 'local', Buffer.from('%PDF-1'))
    expect(findOriginal(store, 'local')).toBe(originalPath(store, 'local'))
    expect(originalPath(store, 'local')).toBe(join(store.dir, 'resumes', 'local', 'original-resume.pdf'))
    deleteOriginal(store, 'local')
    expect(existsSync(originalPath(store, 'local'))).toBe(false)
  })
})
