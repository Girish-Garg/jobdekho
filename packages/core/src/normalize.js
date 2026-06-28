import { makeId } from './posting.js'

const SNIPPET_MAX = 280

export function normalize(raw, source) {
  const externalId = String(raw.externalId)
  return {
    id: makeId(source, externalId),
    source,
    externalId,
    title: (raw.title || '').trim(),
    company: (raw.company || '').trim(),
    location: (raw.location || '').trim(),
    url: raw.url || '',
    descriptionSnippet: (raw.description || '').replace(/\s+/g, ' ').trim().slice(0, SNIPPET_MAX),
    tags: raw.tags || [],
    postedAt: raw.postedAt || null,
    stipend: raw.stipend ?? null,
    duration: raw.duration ?? null,
    experience: raw.experience ?? null,
  }
}
