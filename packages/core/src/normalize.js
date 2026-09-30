import { makeId, makeGroupKey } from './posting.js'
import { stipendMonthly, experienceYears, durationMonths } from './measures.js'
import { detectCurrency } from './currency.js'
import { classifyLevel } from './level.js'
import { classifyDegree } from './degree.js'
import { classifyWorkMode } from './work-mode.js'
import { tidyLines, oneLine, clipText } from './text-layout.js'
import { logoUrl } from './logo.js'

const SNIPPET_MAX = 280

// The snippet is what a card and the overlay show, so it stays short. The
// ranking needs far more than an opening paragraph: skills are named in the
// requirements, which sit well past 280 characters, and matching against the
// snippet alone meant only 3% of postings matched a skill at all. This is the
// text the scorer reads. The feed never sends it; the pane fetches it for the
// one posting a person opens (GET /api/postings/:id).
const TEXT_MAX = 4000

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
  // Classify against the full body: degree requirements usually sit far past
  // the snippet cutoff. Only the truncated form is stored.
  const description = tidyLines(raw.description)
  const level = raw.level || classifyLevel(title, description)
  const { degreeMin, degreeRequired } = classifyDegree(title, description)
  const company = (raw.company || '').trim()
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
    stipend: raw.stipend ?? null,
    duration: raw.duration ?? null,
    experience: raw.experience ?? null,
    // Parsed alongside the text they came from, so the database can filter and
    // sort on them instead of the browser scanning whatever page it has loaded.
    stipendMin: stipendMonthly(raw.stipend),
    // stipendMin is already converted to monthly INR; the currency records what
    // the source actually quoted, so the original figure stays explainable.
    currency: raw.stipend == null ? null : detectCurrency(raw.stipend),
    durationMonths: durationMonths(raw.duration),
    experienceYears: experienceYears(raw.experience),
    level,
    degreeMin,
    degreeRequired,
    workMode: raw.workMode || classifyWorkMode(location, tags),
    // The adapter's own word wins: unstop marks internships via `type` without
    // ever setting `level`, and deriving type from level alone filed them as jobs.
    type: raw.type || (level === 'internship' ? 'internship' : 'job'),
  }
}
