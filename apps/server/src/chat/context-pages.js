import { listDocuments } from '@jobdekho/store/documents.js'
import { locatePdflatex } from '../resume/locate-latex.js'
import { savedJobs } from './saved-jobs.js'

// What the chat reads on the pages other than the feed, each from the store
// alone: the client says which page, never what it holds. `record` is the
// stored profile (null before there is one); the prompt builders choose what
// of it the model sees (see profile-view.js). The documents and jobs a chat
// holds come with it on every page (see chat-items-context.js).

// Enough of an uploaded resume for "add the projects from my resume", well
// short of a prompt that is mostly an old PDF.
const MAX_RESUME_TEXT = 6000

export async function profilePageContext(dashboard, userId) {
  const [record, resumeText] = await Promise.all([dashboard.getProfile(userId), dashboard.getResumeText(userId)])
  return { record, resumeText: resumeText ? String(resumeText).slice(0, MAX_RESUME_TEXT) : null }
}

// The person's documents by name, so "make a new one like my startup
// resume" knows what there is, and the jobs they saved or applied to, named
// only (see saved-jobs.js). The documents' own text comes with the chat.
export async function resumePageContext(dashboard, documents, userId) {
  const record = await dashboard.getProfile(userId)
  const list = await listDocuments(documents, userId)
  return {
    record,
    documents: list.map(({ id, name, kind, updatedAt, postingId }) => ({ id, name, kind, updatedAt, postingId })),
    jobs: await savedJobs(dashboard, userId, list),
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
