import { listDocuments, getDocument } from '@jobdekho/store/documents.js'
import { textChangedAt } from '@jobdekho/store/document-versions.js'
import { locatePdflatex } from '../resume/locate-latex.js'
import { trimOpenPosting } from './postings-summary.js'

// What the chat reads on the pages other than the feed, each from the store
// alone: the client says which page and which document, never what they
// hold. `record` is the stored profile (null before there is one); the
// prompt builders choose what of it the model sees (see profile-view.js).

// Enough of an uploaded resume for "add the projects from my resume", well
// short of a prompt that is mostly an old PDF.
const MAX_RESUME_TEXT = 6000

// A resume or a letter is a few thousand characters. A source past this is
// shown cut, and a cut source is never rewritten (see document-proposal.js),
// since a proposal replaces the whole document.
const MAX_DOCUMENT = 40000

export async function profilePageContext(dashboard, userId) {
  const [record, resumeText] = await Promise.all([dashboard.getProfile(userId), dashboard.getResumeText(userId)])
  return { record, resumeText: resumeText ? String(resumeText).slice(0, MAX_RESUME_TEXT) : null }
}

function openDocument(doc) {
  const truncated = doc.tex.length > MAX_DOCUMENT
  return {
    id: doc.id, name: doc.name, kind: doc.kind, truncated, baseAt: textChangedAt(doc),
    tex: truncated ? doc.tex.slice(0, MAX_DOCUMENT) : doc.tex,
  }
}

// The open document's job, when it was made for one, so "fit this more to
// the job" can be answered. It is scraped text and is fenced as such (see
// prompt-resume-page.js); the LaTeX guard and the fact flags are what stand
// between whatever it says and the document the person applies.
export async function resumePageContext(dashboard, documents, userId, documentId) {
  const record = await dashboard.getProfile(userId)
  const list = await listDocuments(documents, userId)
  const doc = typeof documentId === 'string' && documentId ? await getDocument(documents, userId, documentId) : null
  const posting = doc?.postingId ? trimOpenPosting(await dashboard.getPosting(userId, doc.postingId)) : null
  return {
    record,
    documents: list.map(({ id, name, kind, updatedAt }) => ({ id, name, kind, updatedAt })),
    document: doc ? openDocument(doc) : null,
    posting,
  }
}

// Which AI CLIs are here and whether each runs, the person's choice between
// them, and whether LaTeX is installed: what a question about setting
// JobDekho up needs, and nothing about the person. `locate` is the PATH
// lookup for pdflatex, injectable so a test looks up nothing.
export async function settingsPageContext(dashboard, detect, userId, { locate = locatePdflatex } = {}) {
  const [detected, pref] = await Promise.all([detect(), dashboard.getProviderPref?.(userId)])
  return {
    clis: detected.map((p) => ({ name: p.label, installed: p.present, works: p.runs, version: p.version, problem: p.error })),
    preference: pref?.provider ?? 'auto',
    latexInstalled: Boolean(locate()),
  }
}
