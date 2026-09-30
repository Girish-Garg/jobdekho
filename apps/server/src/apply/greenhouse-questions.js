// Greenhouse publishes every job's application form as data (its public Job
// Board API with ?questions=true): each question's label, whether it is
// required, and the options of every list. JobDekho asks once per session,
// sending nothing but the posting's public board and job id, and uses the
// answer to name and mark the fields it reads on the page. The page itself
// stays the authority on what is there; this only fills in words.
export function questionsUrl(posting) {
  const board = /^greenhouse:(.+)$/.exec(String(posting?.source ?? ''))?.[1]
  if (!board || !posting.externalId) return null
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(posting.externalId)}?questions=true`
}

// Field name -> { label, required, options }. The US compliance and
// demographic blocks come under their own keys and are read too, so their
// fields are named (and so recognised as the person's own) on the page.
export function readQuestions(json) {
  const all = [
    ...(json?.questions ?? []),
    ...(json?.location_questions ?? []),
    ...(json?.compliance ?? []).flatMap((block) => block.questions ?? []),
    ...(json?.demographic_questions?.questions ?? []),
  ]
  const out = new Map()
  for (const question of all) {
    for (const field of question.fields ?? []) {
      out.set(String(field.name), {
        label: String(question.label ?? '').trim(),
        required: Boolean(question.required),
        options: (field.values ?? []).map((v) => String(v.label ?? '').trim()).filter(Boolean),
      })
    }
  }
  return out
}

export async function greenhouseQuestions(posting, fetchJson) {
  const url = questionsUrl(posting)
  if (!url) return null
  try {
    return readQuestions(await fetchJson(url))
  } catch {
    // The page is read either way; this only adds words to it.
    return null
  }
}

// Fields as read, with the API's label where the page gave none and its
// required mark where the page left it off.
export function withQuestions(fields, questions) {
  if (!questions?.size) return fields
  return fields.map((field) => {
    const known = questions.get(field.id) ?? questions.get(field.name)
    if (!known) return field
    return { ...field, label: field.label || known.label, required: field.required || known.required }
  })
}
