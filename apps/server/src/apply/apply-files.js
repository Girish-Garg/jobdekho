import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listDocuments } from '@jobdekho/store/documents.js'
import { readDocument } from '../documents/read.js'
import { documentPdf } from '../documents/pdf.js'

// The files an application can take: the resume and, when there is one made
// for this job, the cover letter. Each is written into the session's own
// folder (inside the throwaway browser profile, so it goes with it) under the
// name a recruiter will see: "Demo Candidate Resume.pdf" reads better on the
// other side than a hash or "resume (3).pdf". Letters and their combining
// marks are kept, so a name in Devanagari keeps its vowel signs.
export function fileName(person, what) {
  const safe = String(person || '').replace(/[^\p{L}\p{M}\p{N} .'-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  return `${safe ? `${safe} ` : ''}${what}.pdf`
}

// The resume made for this posting (a tailored one) before the newest of the
// person's resumes; a cover letter only if one was written for this posting,
// since a letter to another company is worse than none. Documents arrive
// newest first.
export function pickDocuments(documents, postingId) {
  const resumes = documents.filter((d) => d.kind === 'resume')
  const letters = documents.filter((d) => d.kind === 'cover-letter')
  return {
    resume: resumes.find((d) => d.postingId === postingId) ?? resumes[0] ?? null,
    cover: letters.find((d) => d.postingId === postingId) ?? null,
  }
}

// A document's PDF through the same guard and cache as the Resume page's own
// download, or null when it cannot be made (no LaTeX here, or it does not
// compile): the uploaded resume stands in for the first case.
async function pdfOf(doc, { store, userId, compile }) {
  if (!doc) return null
  const full = await readDocument(store, userId, doc.id)
  if (!full) return null
  const { pdf } = await documentPdf({ tex: full.tex, store, userId, compile })
  return pdf ?? null
}

// { resume, cover }, each { path, name, from } or null.
export async function prepareFiles({ posting, userId, person, dir, store, compile, originalPath }) {
  mkdirSync(dir, { recursive: true })
  const chosen = pickDocuments(await listDocuments(store, userId), posting.id)
  const out = { resume: null, cover: null }
  const resume = await pdfOf(chosen.resume, { store, userId, compile }).catch(() => null)
  const resumeName = fileName(person, 'Resume')
  if (resume) {
    writeFileSync(join(dir, resumeName), resume)
    out.resume = { path: join(dir, resumeName), name: resumeName, from: chosen.resume.postingId === posting.id ? 'tailored' : 'document' }
  } else if (originalPath) {
    copyFileSync(originalPath, join(dir, resumeName))
    out.resume = { path: join(dir, resumeName), name: resumeName, from: 'upload' }
  }
  const cover = await pdfOf(chosen.cover, { store, userId, compile }).catch(() => null)
  if (cover) {
    const coverName = fileName(person, 'Cover Letter')
    writeFileSync(join(dir, coverName), cover)
    out.cover = { path: join(dir, coverName), name: coverName, from: 'document' }
  }
  return out
}
