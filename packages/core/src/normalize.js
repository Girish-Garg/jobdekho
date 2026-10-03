import { makeId, makeGroupKey } from './posting.js'
import { experienceYears, durationMonths } from './measures.js'
import { classifyDegree } from './degree.js'
import { tidyLines, oneLine, clipText } from './text-layout.js'
import { logoUrl } from './logo.js'
import { postingFeatures } from './posting-features.js'
import { boardOf } from './board-fields.js'
import { tagsFor } from './tagging.js'

const SNIPPET_MAX = 280

// The snippet is what a card and the overlay show, so it stays short. The
// stored text is the whole description: a cut at 4000 characters clipped
// 53% of them, often before the requirements and the pay. The cap, five
// times that cut, is only for runaway pages (a whole careers site pasted
// into one ad). The feed never sends this text; the pane fetches it for the
// one posting a person opens.
export const TEXT_MAX = 20000

export function normalize(raw, source) {
  // A missing externalId used to stringify to "undefined", so every such row
  // from a source hashed to the SAME id and silently overwrote the others.
  // Returned as null rather than thrown: the pipeline maps a whole run through
  // here, and one malformed row must not kill the other sources' postings.
  // filter() drops null, so the pipeline's map-then-filter contract holds.
  if (raw?.externalId == null || raw.externalId === '') return null
  const externalId = String(raw.externalId)
  const title = (raw.title || '').trim()
  const location = (raw.location || '').trim()
  const tags = raw.tags || []
  // Tags, degree and features are read from the full body, before any cap.
  const description = tidyLines(raw.description)
  const { degreeMin, degreeRequired } = classifyDegree(title, description)
  const company = (raw.company || '').trim()
  const years = experienceYears(raw.experience)
  const board = boardOf(raw)
  return {
    id: makeId(source, externalId),
    groupKey: makeGroupKey(title, company),
    source,
    externalId,
    title,
    company,
    location,
    url: raw.url || '',
    // Only an address, and only from a known logo host (see logo.js).
    logoUrl: logoUrl(raw.logoUrl),
    descriptionSnippet: oneLine(description).slice(0, SNIPPET_MAX),
    descriptionText: clipText(description, TEXT_MAX),
    tags,
    postedAt: raw.postedAt || null,
    duration: raw.duration ?? null,
    experience: raw.experience ?? null,
    durationMonths: durationMonths(raw.duration),
    experienceYears: years,
    // What the fit needs (skills by section, years asked), read here from the
    // full body for the same reason as the tags.
    features: postingFeatures({ title, description, tags, company, experienceYears: years }),
    degreeMin,
    degreeRequired,
    // What the board itself declared, kept so a later version of the rules
    // can tag this posting again from the same evidence (see retag.js).
    board,
    // level, type, workMode and pay, each with the tag that says why, and
    // the red flags (see tagging.js).
    ...tagsFor({
      title, description, company, source, board, location, tags,
      experience: raw.experience ?? null, experienceYears: years, stipend: raw.stipend ?? null,
    }),
  }
}
