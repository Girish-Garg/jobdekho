import { makeId, makeGroupKey } from './posting.js'
import { stipendMonthly, experienceYears, durationMonths } from './measures.js'
import { classifyLevel } from './level.js'
import { classifyDegree } from './degree.js'
import { classifyWorkMode } from './work-mode.js'

const SNIPPET_MAX = 280

export function normalize(raw, source) {
  const externalId = String(raw.externalId)
  const title = (raw.title || '').trim()
  const location = (raw.location || '').trim()
  const tags = raw.tags || []
  // Classify against the full body: degree requirements usually sit far past
  // the snippet cutoff. Only the truncated form is stored.
  const description = (raw.description || '').replace(/\s+/g, ' ').trim()
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
    descriptionSnippet: description.slice(0, SNIPPET_MAX),
    tags,
    postedAt: raw.postedAt || null,
    stipend: raw.stipend ?? null,
    duration: raw.duration ?? null,
    experience: raw.experience ?? null,
    // Parsed alongside the text they came from, so the database can filter and
    // sort on them instead of the browser scanning whatever page it has loaded.
    stipendMin: stipendMonthly(raw.stipend),
    durationMonths: durationMonths(raw.duration),
    experienceYears: experienceYears(raw.experience),
    level,
    degreeMin,
    degreeRequired,
    workMode: raw.workMode || classifyWorkMode(location, tags),
    type: level === 'internship' ? 'internship' : 'job',
  }
}
