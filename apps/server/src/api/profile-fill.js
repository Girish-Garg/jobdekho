import { readFile } from 'node:fs/promises'
import { extractProfile } from '../resume/extract.js'
import { readExtraction } from '../resume/extract-shape.js'
import { pdfLinks } from '../resume/pdf-links.js'

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

// What one "Fill in from resume" run found: the ranking fields, the basics
// and the lists, as the resume has them (see resume/extract-shape.js). The
// stored profile is neither read nor written here. The page sets this
// beside the profile it is showing, the person picks what to take, and the
// save that follows is the same PUT a hand edit uses.
export async function readResume(app, userId, text, seams) {
  const links = await linksIn(app.dashboard.originalResumePath?.(userId))
  return readExtraction(await extractProfile(text, { ...seams, links }))
}
