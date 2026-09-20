// What the resume builder should render: a template choice plus, per
// section, which entry ids go in and in what order. Mirrors
// ai-provider-pref.js: one small preference record, kept with the things
// the person made rather than the corpus.
const DEFAULT_TEMPLATE = 'classic'
const SECTION_KEYS = ['experience', 'projects', 'education', 'certifications', 'achievements', 'skillGroups']

const ids = (value) => (Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id) : undefined)

// A key a caller never mentions stays undefined here, never [] - see
// resume/selection.js on the server, where undefined means "everything in
// the profile's own order" and [] would mean "nothing". Saving a selection
// that only touched one section must not silently empty every other one.
function normalizeSections(input) {
  const src = input ?? {}
  const out = {}
  for (const key of SECTION_KEYS) {
    const list = ids(src[key])
    if (list) out[key] = list
  }
  return out
}

export function normalizeResumeSelection(input) {
  const src = input ?? {}
  const template = typeof src.template === 'string' && src.template ? src.template : DEFAULT_TEMPLATE
  return { template, sections: normalizeSections(src.sections) }
}

export async function getResumeSelection(store, userId) {
  const record = store.resumeSelections.get(userId)
  return record ? normalizeResumeSelection(record) : null
}

export async function upsertResumeSelection(store, userId, input) {
  const selection = normalizeResumeSelection(input)
  store.resumeSelections.set(userId, selection)
  return selection
}
