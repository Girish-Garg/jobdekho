import { openStore } from '@jobdekho/store/open.js'

// One handle for every read and write of documents.json, shared by the
// document routes and the chat (which reads a document into the prompt and
// writes one when a proposal is applied). Mirrors resume/store.js and
// chat/store.js: a handle of its own keeps this feature out of the shared
// dashboard wrapper, and routing every document write through this one
// handle means two handles never race to write the same file.
let cached = null

export function documentStore() {
  if (!cached) cached = openStore()
  return cached
}
