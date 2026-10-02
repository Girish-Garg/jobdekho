import { readFile } from 'node:fs/promises'
import { extractProfile } from '../resume/extract.js'
import { readExtraction } from '../resume/extract-shape.js'
import { fillBasics } from '../resume/fill-basics.js'
import { pdfLinks } from '../resume/pdf-links.js'

const FLAT = ['skills', 'titles', 'locations', 'years', 'degree']

// The addresses behind a resume's links live only in the PDF, never in the
// stored text, so they are read from the file as uploaded (resume/original.js).
// A resume uploaded before the file was kept has none to offer, and a read
// that fails costs only the links: the text still fills the profile, the
// way it did before links were read at all.
async function linksIn(path) {
  if (!path) return []
  try {
    return await pdfLinks(await readFile(path))
  } catch {
    return []
  }
}

// What one "Fill in from resume" run writes and what it proposes. The
// profile is read after the reply rather than before it: the person may
// have saved a hand edit in the twenty seconds the AI took, and that is the
// copy the basics are filled into and the ranking fields are kept from.
export async function readResume(app, userId, text, seams) {
  const links = await linksIn(app.dashboard.originalResumePath?.(userId))
  const found = readExtraction(await extractProfile(text, { ...seams, links }))
  const current = (await app.dashboard.getProfile(userId)) ?? {}
  const { basics, filled } = fillBasics(current.basics, found.basics)
  const kept = Object.fromEntries(FLAT.filter((key) => key in current).map((key) => [key, current[key]]))
  return {
    // basics only when a field was filled: a run that fills nothing leaves
    // the section out of the write, which is how upsertProfile is told to
    // keep it as it is (see packages/store/src/profile-sections.js).
    fields: { ...kept, ...found.flat, ...(filled.length ? { basics } : {}) },
    proposed: found.proposed,
    filledBasics: filled,
  }
}
