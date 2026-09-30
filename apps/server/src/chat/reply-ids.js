import { knownRows } from './refs.js'

// A posting's id is how the prompt names a job and how "refs" point at one,
// never something a person should read. A hosted model keeps it out of its
// prose; a small local one writes "id 7218f734fa01cd5a, Full Stack Developer
// at ..." (seen from a 9B model through Ollama). The cards under the answer
// already open each job, so the id is taken out of the words, with an "id"
// before it and the dash or colon that joined it to the rest. Only ids this
// turn's context holds are touched, so any other run of hex a reply quotes
// stays as written.
const DASHES = String.fromCharCode(0x2013, 0x2014)
const ID_TOKEN = new RegExp(`\\(?\\b(?:id\\s*[:#]?\\s*)?([0-9a-f]{16})\\b\\)?\\s*(?:[${DASHES}:-]\\s*)?`, 'gi')

export function withoutPostingIds(text, context) {
  const known = new Set([...knownRows(context).keys()].map((id) => String(id).toLowerCase()))
  if (!known.size) return text
  return text.replace(ID_TOKEN, (match, id) => (known.has(id.toLowerCase()) ? '' : match))
}
